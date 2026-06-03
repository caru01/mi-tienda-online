"""
scheduler/pending_replies.py
Tareas periódicas del bot Distrito Burger:
  1. Asistente de respaldo: mensaje de cortesía si no hay respuesta manual en 3 min.
  2. Timeout de conversación: si el cliente lleva 10 min sin responder, cierra el chat.
"""
import logging
from datetime import datetime, timezone, timedelta

from services.supabase_client import get_supabase
from modules.auto_reply import send_backup_reply
from config.settings import settings

logger = logging.getLogger(__name__)

ACTIVE_STATES = (
    "waiting_combo_selection", "waiting_add_combo", "waiting_quantity",
    "waiting_observations", "waiting_delivery_type",
    "waiting_name", "waiting_address", "waiting_barrio", "waiting_payment",
)


async def check_and_reply_pending() -> None:
    """
    Tarea 1: Envía mensaje de cortesía a chats sin respuesta manual
    tras BACKUP_REPLY_MINUTES minutos.
    SOLO se envía si el restaurante está abierto (evita mensajes en horario cerrado).
    """
    from config.dynamic_settings import is_restaurant_open
    
    # No enviar backup reply si el restaurante está cerrado
    if not is_restaurant_open():
        logger.debug("Scheduler: restaurante cerrado, no se envía backup reply")
        return

    db = get_supabase()
    cutoff = (
        datetime.now(timezone.utc) - timedelta(minutes=settings.backup_reply_minutes)
    ).isoformat()

    try:
        result = (
            db.table("pending_replies")
            .select("customer_phone")
            .eq("resolved", False)
            .eq("auto_replied", False)
            .lte("last_message_at", cutoff)
            .execute()
        )
        pending = result.data or []
        if not pending:
            return

        logger.info(f"Scheduler: {len(pending)} chat(s) sin respuesta → enviando cortesia")
        for row in pending:
            phone = row["customer_phone"]
            await send_backup_reply(phone)
            db.table("pending_replies").update({
                "auto_replied": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("customer_phone", phone).execute()

    except Exception as e:
        logger.error(f"Error en scheduler pending_replies: {e}")



async def check_conversation_timeouts() -> None:
    """
    Tarea 2: Cierra conversaciones activas que lleven más de
    CONVERSATION_TIMEOUT_MINUTES minutos sin actividad del cliente.
    """
    from modules.order_flow import reset_session
    from services.ycloud_client import send_text_message

    db = get_supabase()
    timeout_minutes = 10
    cutoff = (
        datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)
    ).isoformat()

    try:
        result = (
            db.table("conversation_sessions")
            .select("customer_phone, state")
            .lte("updated_at", cutoff)
            .execute()
        )
        sessions = [
            row for row in (result.data or [])
            if row.get("state") in ACTIVE_STATES
        ]

        if not sessions:
            return

        logger.info(f"Timeout: {len(sessions)} conversacion(es) expiradas → cerrando")

        for row in sessions:
            phone = row["customer_phone"]
            await send_text_message(
                phone,
                "⏰ *Chat finalizado por inactividad.*\n\n"
                "Si deseas hacer un pedido, escribe *hola* cuando quieras "
                "y con gusto te atendemos! 🍔🔥"
            )
            await reset_session(phone)
            logger.info(f"Sesion cerrada por timeout: {phone}")

    except Exception as e:
        logger.error(f"Error en scheduler conversation_timeouts: {e}")


async def check_en_camino_timeouts() -> None:
    """
    Tarea 3: Finaliza el chat 5 minutos después de enviar "en camino".
    """
    from modules.order_flow import reset_session
    from services.ycloud_client import send_text_message

    db = get_supabase()
    timeout_minutes = 5
    cutoff = (
        datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)
    ).isoformat()

    try:
        result = (
            db.table("conversation_sessions")
            .select("customer_phone, en_camino_at")
            .eq("state", "en_camino")
            .lte("en_camino_at", cutoff)
            .execute()
        )
        
        sessions = result.data or []
        if not sessions:
            return

        logger.info(f"Timeout en camino: {len(sessions)} conversacion(es) finalizarán")

        for row in sessions:
            phone = row["customer_phone"]
            await send_text_message(
                phone,
                "Tu pedido debería estar cerca o entregado. El chat ha finalizado. "
                "Si necesitas ayuda, escribe *asesor* para hablar con una persona."
            )
            await reset_session(phone)
            logger.info(f"Sesion cerrada tras 5 min de 'en camino': {phone}")

    except Exception as e:
        logger.error(f"Error en scheduler en_camino_timeouts: {e}")


def start_scheduler(app_state: dict) -> None:
    """
    Inicia APScheduler con ambas tareas periódicas.
    """
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    scheduler = AsyncIOScheduler()

    # Tarea 1: Respaldo por saturación (cada 60 seg)
    scheduler.add_job(
        check_and_reply_pending,
        trigger="interval",
        seconds=60,
        id="check_pending_replies",
        name="Revisar chats sin respuesta",
        replace_existing=True,
    )

    # Tarea 2: Timeout de conversación (cada 60 seg)
    scheduler.add_job(
        check_conversation_timeouts,
        trigger="interval",
        seconds=60,
        id="check_conversation_timeouts",
        name="Cerrar conversaciones inactivas",
        replace_existing=True,
    )

    # Tarea 3: Timeout de 'en camino' (cada 60 seg)
    scheduler.add_job(
        check_en_camino_timeouts,
        trigger="interval",
        seconds=60,
        id="check_en_camino_timeouts",
        name="Cerrar chats en camino despues de 5 min",
        replace_existing=True,
    )

    scheduler.start()
    app_state["scheduler"] = scheduler
    logger.info("Scheduler iniciado — pendientes/timeouts/en_camino cada 60s")
