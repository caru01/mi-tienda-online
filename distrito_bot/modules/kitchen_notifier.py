"""
modules/kitchen_notifier.py
Se encarga de enviar notificaciones de nuevos pedidos (tickets) a la cocina.
"""
import logging
from config.dynamic_settings import get_kitchen_phone
from services.ycloud_client import send_text_message
from datetime import datetime, timezone
import pytz

logger = logging.getLogger(__name__)

async def send_kitchen_ticket(session: dict, customer_phone: str) -> None:
    """
    Formatea y envía un ticket de pedido a la cocina vía WhatsApp (YCloud).
    """
    kitchen_phone = get_kitchen_phone()
    if not kitchen_phone:
        logger.warning("No hay número de cocina configurado. No se envía ticket.")
        return

    name = session.get("customer_name") or "Desconocido"
    delivery_type = session.get("delivery_type") or "desconocido"
    payment = session.get("payment_method") or "desconocido"
    items = session.get("order_items_text") or "Sin items"
    obs = session.get("observations") or "Ninguna"
    total = session.get("order_total") or 0
    now_bogota = datetime.now(pytz.timezone("America/Bogota"))
    now_str = now_bogota.strftime("%I:%M %p")

    # Formatear el ticket
    ticket_lines = [
        "🔔 *NUEVO PEDIDO* 🔔",
        f"⏰ Hora: {now_str}",
        f"👤 Cliente: {name}",
        f"📱 Teléfono: {customer_phone}",
        f"🚚 Tipo: {delivery_type.upper()}",
    ]

    if delivery_type == "domicilio":
        addr = session.get("delivery_address") or ""
        barrio = session.get("delivery_barrio") or ""
        ticket_lines.append(f"📍 Dirección: {addr}")
        ticket_lines.append(f"🏘 Barrio: {barrio}")

    ticket_lines.extend([
        "",
        "🍔 *ITEMS:*",
        items,
        "",
        f"📝 *OBSERVACIONES:* {obs}",
        "",
        f"💵 *PAGO:* {payment.upper()}",
        f"💰 *TOTAL:* ${total:,}"
    ])

    ticket_text = "\n".join(ticket_lines)

    try:
        await send_text_message(kitchen_phone, ticket_text)
        logger.info(f"✅ Ticket de cocina enviado exitosamente para {name}")
    except Exception as e:
        logger.error(f"❌ Error al enviar ticket de cocina: {e}")
