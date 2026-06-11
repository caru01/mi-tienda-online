"""
modules/chat_history.py
Módulo A: Historial y Monitoreo de Chats.

Responsabilidades:
- Registrar cada mensaje (entrante/saliente) en la tabla `messages`.
- Usar ycloud_message_id para evitar duplicados (idempotencia).
- Actualizar la tabla `pending_replies` en función de la dirección del mensaje.
"""
import logging
from services.ycloud_client import send_text_message

# In‑memory cache to avoid volver a preguntar al mismo número en una ejecución
PROGRESSIVE_PROFILE_PROMPTED = set()
from datetime import datetime, timezone

from services.supabase_client import get_supabase

logger = logging.getLogger(__name__)


async def record_message(
    customer_phone: str,
    direction: str,        # 'inbound' o 'outbound'
    body: str,
    ycloud_message_id: str | None = None,
) -> None:
    """
    Inserta el mensaje en la tabla `messages`.
    Si ya existe el mismo ycloud_message_id, lo ignora (deduplicación).
    """
    db = get_supabase()

    try:
        data = {
            "customer_phone": customer_phone,
            "direction": direction,
            "body": body,
            "ycloud_message_id": ycloud_message_id,
        }

        # upsert con on_conflict para ignorar duplicados por ycloud_message_id
        if ycloud_message_id:
            db.table("messages").upsert(
                data,
                on_conflict="ycloud_message_id",
                ignore_duplicates=True,
            ).execute()
        else:
            db.table("messages").insert(data).execute()

        logger.info(
            f"📝 Mensaje registrado | {direction.upper()} | "
            f"Tel: {customer_phone} | ID: {ycloud_message_id}"
        )

        # ── REGISTRO/ACTUALIZACIÓN EN CUSTOMERS (CRM) ───────────────────
        try:
            now = datetime.now(timezone.utc).isoformat()
            res_cust = db.table("customers").select("customer_phone").eq("customer_phone", customer_phone).limit(1).execute()
            if not res_cust.data:
                db.table("customers").insert({
                    "customer_phone": customer_phone,
                    "customer_name": "",
                    "whatsapp_label": customer_phone,
                    "first_order_at": now,
                    "last_order_at": now,
                    "total_orders": 1,
                    "notes": "",
                    "direccion_frecuente": "",
                    "fecha_registro": now,
                    "categoria": "Nuevo",
                    "total_pedidos": 1
                }).execute()
                logger.info(f"🆕 CRM: Nuevo prospecto registrado: {customer_phone}")
            else:
                db.table("customers").update({
                    "last_order_at": now,
                    "total_pedidos": db.table("customers").select("total_pedidos").eq("customer_phone", customer_phone).single().execute().data.get("total_pedidos", 0) + 1
                }).eq("customer_phone", customer_phone).execute()
        except Exception as ex_crm:
            logger.error(f"⚠️ Error actualizando CRM (customers) para {customer_phone}: {ex_crm}")

    except Exception as e:
        logger.error(f"❌ Error al guardar mensaje en BD: {e}")
        # No relanzamos la excepción para no interrumpir el flujo del webhook


async def update_pending_reply(customer_phone: str, direction: str) -> None:
    """
    Gestiona la tabla `pending_replies`:
    - INBOUND: Crea o actualiza el registro del cliente como pendiente de respuesta.
    - OUTBOUND: Marca el registro del cliente como resuelto (operador respondió).
    """
    db = get_supabase()

    try:
        if direction == "inbound":
            # 1️⃣ Perfilado progresivo: preguntar nombre si falta y no se ha preguntado ya
            cust = db.table("customers").select("customer_name").eq("customer_phone", customer_phone).single().execute()
            if cust.data and not cust.data.get("customer_name") and customer_phone not in PROGRESSIVE_PROFILE_PROMPTED:
                await send_text_message(
                    customer_phone,
                    "¡Hola! Veo que ya has pedido antes, pero no tengo tu nombre registrado. ¿Cómo te llamas?"
                )
                PROGRESSIVE_PROFILE_PROMPTED.add(customer_phone)
            # El cliente escribió → marcar como no resuelto y actualizar timestamp
            db.table("pending_replies").upsert(
                {
                    "customer_phone": customer_phone,
                    "last_message_at": datetime.now(timezone.utc).isoformat(),
                    "auto_replied": False,
                    "resolved": False,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                on_conflict="customer_phone",
            ).execute()
            logger.debug(f"🔔 Pending reply activado para {customer_phone}")

        elif direction == "outbound":
            # El operador respondió → marcar como resuelto
            db.table("pending_replies").update(
                {
                    "resolved": True,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("customer_phone", customer_phone).execute()
            logger.debug(f"✅ Pending reply resuelto para {customer_phone}")

    except Exception as e:
        logger.error(f"❌ Error al actualizar pending_replies: {e}")
