"""
modules/chat_history.py
Módulo A: Historial y Monitoreo de Chats.

Responsabilidades:
- Registrar cada mensaje (entrante/saliente) en la tabla `messages`.
- Usar ycloud_message_id para evitar duplicados (idempotencia).
- Actualizar la tabla `pending_replies` en función de la dirección del mensaje.
"""
import logging
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
