"""
modules/auto_reply.py
Módulo C: Respuestas Automáticas (Filtro Adaptativo).

Sub-módulos:
1. Disparador de Ausencia:  Responde fuera del horario comercial.
2. Saludo + Menú:           En horario abierto, responde saludos con bienvenida
                             y botón para ver los combos.
3. Asistente de Respaldo:   Usado por el scheduler para chats sin respuesta.

Control anti-spam: No envía más de un mensaje automático del mismo tipo
por cliente en las últimas 2 horas.
"""
import logging
import re
from datetime import datetime, timezone, timedelta

import pytz

from config.dynamic_settings import (
    is_restaurant_open,
    get_welcome_message,
    get_off_hours_message,
    get_backup_reply_message
)
from config.settings import settings
from services.supabase_client import get_supabase
from services.ycloud_client import send_text_message, send_button_message

logger = logging.getLogger(__name__)

ANTI_SPAM_HOURS = 2  # Horas mínimas entre mensajes automáticos del mismo tipo


# ─────────────────────────────────────────────────────────────────────────────
# Helpers internos
# ─────────────────────────────────────────────────────────────────────────────

def is_business_hours() -> bool:
    """
    Verifica si la hora actual está dentro del horario comercial configurado.
    """
    return is_restaurant_open()


def is_greeting(text: str) -> bool:
    """
    Detecta si el mensaje es un saludo.
    Compara el texto (normalizado) contra la lista de palabras clave.
    """
    normalized = text.lower().strip()
    for keyword in settings.greeting_keywords:
        # Coincidencia si el texto comienza con la palabra clave
        # (permite "hola!" o "hola, cómo están?" etc.)
        pattern = rf"^{re.escape(keyword)}\b"
        if re.match(pattern, normalized):
            return True
    return False


def _was_auto_replied_recently(customer_phone: str, reply_type: str) -> bool:
    """
    Verifica si ya se envió un mensaje automático del mismo tipo
    al cliente en las últimas ANTI_SPAM_HOURS horas.
    """
    db = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=ANTI_SPAM_HOURS)).isoformat()
    try:
        result = (
            db.table("auto_reply_log")
            .select("id")
            .eq("customer_phone", customer_phone)
            .eq("reply_type", reply_type)
            .gte("sent_at", cutoff)
            .limit(1)
            .execute()
        )
        return len(result.data) > 0
    except Exception as e:
        logger.error(f"Error al consultar anti_spam_log: {e}")
        return False


def _log_auto_reply(customer_phone: str, reply_type: str) -> None:
    """Registra el envío de un mensaje automático en el log anti-spam."""
    db = get_supabase()
    try:
        db.table("auto_reply_log").insert(
            {"customer_phone": customer_phone, "reply_type": reply_type}
        ).execute()
    except Exception as e:
        logger.error(f"Error al guardar auto_reply_log: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Funciones públicas
# ─────────────────────────────────────────────────────────────────────────────

async def handle_inbound_message(customer_phone: str, body: str) -> None:
    """
    Punto de entrada principal para mensajes ENTRANTES.
    Decide qué respuesta automática aplicar según el horario y el contenido.
    """
    if is_business_hours():
        # En horario abierto: detectar saludo y mostrar menú
        await handle_greeting(customer_phone, body)
    else:
        # Fuera de horario: enviar mensaje de horarios
        await handle_off_hours(customer_phone)


async def handle_greeting(customer_phone: str, body: str) -> None:
    """
    Si el mensaje es un saludo y el negocio está abierto,
    responde con bienvenida + botón para ver los combos.
    """
    if not is_greeting(body):
        return  # No es saludo, no hacer nada automático

    reply_type = "greeting"
    if _was_auto_replied_recently(customer_phone, reply_type):
        logger.debug(f"Anti-spam: ya se respondio saludo a {customer_phone} recientemente")
        return

    try:
        await send_button_message(
            to=customer_phone,
            body_text=get_welcome_message(),
            buttons=[
                {"id": "ver_combos", "title": "Ver Combos"}
            ]
        )
        _log_auto_reply(customer_phone, reply_type)
        logger.info(f"Bienvenida con menu enviada a {customer_phone}")

    except Exception as e:
        logger.error(f"Error al enviar bienvenida a {customer_phone}: {e}")
        # Fallback: enviar texto plano si los botones fallan
        try:
            await send_text_message(customer_phone, get_welcome_message())
            _log_auto_reply(customer_phone, reply_type)
        except Exception as e2:
            logger.error(f"Error en fallback de bienvenida: {e2}")


async def handle_combo_request(customer_phone: str) -> None:
    """
    Envía el menú completo de combos cuando el cliente presiona
    el botón 'Ver Combos' o escribe una variante equivalente.
    """
    reply_type = "combos_menu"
    if _was_auto_replied_recently(customer_phone, reply_type):
        logger.debug(f"Anti-spam: menu ya enviado a {customer_phone} recientemente")
        return

    try:
        await send_text_message(customer_phone, settings.combos_menu_text)
        _log_auto_reply(customer_phone, reply_type)
        logger.info(f"Menu de combos enviado a {customer_phone}")
    except Exception as e:
        logger.error(f"Error al enviar menu de combos a {customer_phone}: {e}")


async def handle_off_hours(customer_phone: str) -> None:
    """
    Envía el mensaje de fuera de horario si:
    1. El horario actual es fuera del comercial.
    2. No se ha enviado ya uno en las últimas 2 horas.
    """
    if is_business_hours():
        return

    reply_type = "off_hours"
    if _was_auto_replied_recently(customer_phone, reply_type):
        logger.debug(f"Anti-spam: ya se envio off_hours a {customer_phone} recientemente")
        return

    try:
        await send_text_message(customer_phone, get_off_hours_message())
        _log_auto_reply(customer_phone, reply_type)
        logger.info(f"Mensaje fuera de horario enviado a {customer_phone}")
    except Exception as e:
        logger.error(f"Error al enviar mensaje off_hours a {customer_phone}: {e}")


async def send_backup_reply(customer_phone: str) -> None:
    """
    Envía el mensaje de cortesía por saturación.
    Llamado por el scheduler cuando detecta un chat sin respuesta.
    """
    reply_type = "backup"
    if _was_auto_replied_recently(customer_phone, reply_type):
        logger.debug(f"Anti-spam: ya se envio backup a {customer_phone} recientemente")
        return

    try:
        await send_text_message(customer_phone, get_backup_reply_message())
        _log_auto_reply(customer_phone, reply_type)
        logger.info(f"Mensaje de respaldo enviado a {customer_phone}")
    except Exception as e:
        logger.error(f"Error al enviar backup reply a {customer_phone}: {e}")
