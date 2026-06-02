"""
api/webhook.py
Endpoint principal del sistema: POST /webhook

Eventos manejados de YCloud:
  - whatsapp.inbound_message.received  → texto o interactivo (botón/lista)
  - whatsapp.message.updated           → mensajes salientes / estados de entrega
"""
import logging
from fastapi import APIRouter, Request, status

from modules.chat_history import record_message, update_pending_reply
from modules.sales_parser import process_sale
from modules.order_flow import handle_customer_message
from modules.auto_reply import handle_off_hours, is_business_hours

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def receive_webhook(request: Request):
    """
    Receptor de eventos de YCloud.
    Siempre responde HTTP 200 (YCloud reintenta si no recibe 200).
    """
    # ── 1. Parsear payload ───────────────────────────────────
    try:
        payload = await request.json()
    except Exception:
        logger.warning("Payload invalido en /webhook")
        return {"status": "ignored", "reason": "invalid_json"}

    event_type = payload.get("type", "")
    logger.info(f"Evento: {event_type}")

    # ════════════════════════════════════════════════════════
    # EVENTO: Mensaje ENTRANTE del cliente
    # ════════════════════════════════════════════════════════
    if event_type == "whatsapp.inbound_message.received":
        msg = payload.get("whatsappInboundMessage", {})
        if not msg:
            return {"status": "ignored", "reason": "no_inbound_message_data"}

        customer_phone = msg.get("from", "")
        if not customer_phone:
            return {"status": "ignored", "reason": "no_customer_phone"}

        msg_id   = msg.get("id")
        msg_type = msg.get("type", "").lower()

        # ── A) Mensaje de TEXTO normal ───────────────────────
        if msg_type == "text":
            body = msg.get("text", {}).get("body", "").strip()
            logger.info(f"INBOUND texto | {customer_phone} | '{body[:50]}'")

            await record_message(customer_phone, "inbound", body, msg_id)
            await update_pending_reply(customer_phone, "inbound")

            if body:
                if is_business_hours():
                    # En horario: flujo de pedido
                    await handle_customer_message(customer_phone, body=body)
                else:
                    # Fuera de horario: mensaje de horarios
                    await handle_off_hours(customer_phone)

        # ── B) Mensaje INTERACTIVO (cliente tocó botón o lista) ──
        elif msg_type == "interactive":
            interactive     = msg.get("interactive", {})
            interactive_type = interactive.get("type", "")  # button_reply | list_reply

            if interactive_type == "button_reply":
                # YCloud usa snake_case: button_reply (no buttonReply)
                btn   = interactive.get("button_reply", {})
                btn_id    = btn.get("id", "")
                btn_title = btn.get("title", "")
                label = f"[BOTON] {btn_title}"

            elif interactive_type == "list_reply":
                # YCloud usa snake_case: list_reply (no listReply)
                item      = interactive.get("list_reply", {})
                btn_id    = item.get("id", "")
                btn_title = item.get("title", "")
                label = f"[LISTA] {btn_title}"

            else:
                logger.debug(f"Tipo interactivo no manejado: {interactive_type}")
                return {"status": "ignored", "reason": f"interactive_type_{interactive_type}"}

            logger.info(f"INBOUND {interactive_type} | {customer_phone} | id={btn_id}")

            await record_message(customer_phone, "inbound", label, msg_id)
            await update_pending_reply(customer_phone, "inbound")

            if is_business_hours():
                await handle_customer_message(
                    customer_phone,
                    interactive_type=interactive_type,
                    interactive_id=btn_id,
                    interactive_title=btn_title,
                )
            else:
                await handle_off_hours(customer_phone)

        else:
            logger.debug(f"Tipo de mensaje ignorado: {msg_type}")

        return {"status": "ok"}

    # ════════════════════════════════════════════════════════
    # EVENTO: Mensaje SALIENTE / actualización de estado
    # ════════════════════════════════════════════════════════
    elif event_type == "whatsapp.message.updated":
        msg = payload.get("whatsappMessage", {})
        if not msg:
            return {"status": "ignored", "reason": "no_message_data"}

        customer_phone = msg.get("to", "")
        msg_id   = msg.get("id")
        msg_type = msg.get("type", "").lower()

        body = msg.get("text", {}).get("body", "").strip() if msg_type == "text" else ""

        if not body:
            logger.debug(f"Estado entrega: {msg.get('status')} -> {customer_phone}")
            return {"status": "ok", "reason": "delivery_status_update"}

        logger.info(f"OUTBOUND | {customer_phone} | '{body[:50]}'")

        await record_message(customer_phone, "outbound", body, msg_id)
        await update_pending_reply(customer_phone, "outbound")
        await process_sale(customer_phone, body)

        if "en camino" in body.lower():
            from services.supabase_client import get_supabase
            from datetime import datetime, timezone
            db = get_supabase()
            try:
                db.table("conversation_sessions").update({
                    "state": "en_camino",
                    "en_camino_at": datetime.now(timezone.utc).isoformat()
                }).eq("customer_phone", customer_phone).execute()
                logger.info(f"🚚 Pedido en camino para {customer_phone}. Iniciando timeout de 5 min.")
            except Exception as e:
                logger.error(f"Error marcando en_camino para {customer_phone}: {e}")

        return {"status": "ok"}

    # ════════════════════════════════════════════════════════
    # Evento no manejado
    # ════════════════════════════════════════════════════════
    else:
        return {"status": "ignored", "reason": f"event_not_handled: {event_type}"}


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "Distrito Burger Bot"}
