"""
scheduler/pending_replies.py
Tareas periódicas del bot Distrito Burger:
  1. Recuperación de carritos abandonados: si el cliente seleccionó combo y lleva 15 min inactivo.
  2. Timeout de conversación: cierra el chat normal a los 10 min, o a la 1 hora si fue marcado como abandonado.
"""
import logging
from datetime import datetime, timezone, timedelta

from services.supabase_client import get_supabase
from config.settings import settings
from services.ycloud_client import send_button_message

logger = logging.getLogger(__name__)

ACTIVE_STATES = (
    "waiting_combo_selection", "waiting_add_combo", "waiting_quantity",
    "waiting_observations", "waiting_delivery_type",
    "waiting_name", "waiting_address", "waiting_barrio", "waiting_payment",
)

async def _send_recovery_message(phone: str) -> None:
    await send_button_message(
        to=phone,
        body_text=(
            "👋 Hola.\n\n"
            "Notamos que estabas realizando un pedido en Distrito BG 🍔.\n\n"
            "¿Deseas continuar con tu pedido?"
        ),
        buttons=[
            {"id": "recovery_continue", "title": "✅ Continuar Pedido"},
            {"id": "recovery_cancel",   "title": "❌ Cancelar Pedido"},
        ]
    )

async def check_abandoned_orders() -> None:
    """
    Tarea 1: Busca carritos abandonados (15 min) que tengan combos seleccionados.
    """
    from config.dynamic_settings import is_restaurant_open
    if not is_restaurant_open():
        return

    db = get_supabase()
    timeout_minutes = 15
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)).isoformat()

    try:
        # Buscar sesiones que no tengan recovery_status sent, que estén en ACTIVE_STATES
        # y tengan selected_combo_id. Supabase rpc o un fetch completo sería ideal.
        # Ya que Supabase REST no filtra bien por IS NULL si la columna no está,
        # bajaremos los candidatos y filtramos en Python.
        result = (
            db.table("conversation_sessions")
            .select("*")
            .lte("updated_at", cutoff)
            .execute()
        )
        
        sessions = [
            r for r in (result.data or [])
            if r.get("state") in ACTIVE_STATES 
            and r.get("selected_combo_id") 
            and r.get("recovery_status") is None
        ]

        if not sessions:
            return

        logger.info(f"Scheduler: {len(sessions)} pedido(s) abandonado(s) a los 15 min → enviando recuperacion")
        
        now_str = datetime.now(timezone.utc).isoformat()
        
        for row in sessions:
            phone = row["customer_phone"]
            await _send_recovery_message(phone)
            
            # Registrar en auto_reply_log para no repetir (aunque usaremos recovery_status)
            db.table("auto_reply_log").insert({
                "customer_phone": phone, "reply_type": "abandoned_recovery"
            }).execute()

            # Actualizar session
            db.table("conversation_sessions").update({
                "recovery_status": "sent",
                "updated_at": now_str
            }).eq("customer_phone", phone).execute()
            
            # Registrar metricas
            db.table("abandoned_orders_log").insert({
                "customer_phone": phone,
                "status": "abandoned"
            }).execute()

    except Exception as e:
        logger.error(f"Error en scheduler check_abandoned_orders: {e}")


async def check_conversation_timeouts() -> None:
    """
    Tarea 2: Cierra conversaciones.
    - A la 1 hora si fueron marcadas como 'sent' (abandonadas).
    - A los 10 minutos si NO tenían combo seleccionado (inactivas normales).
    """
    from modules.order_flow import reset_session
    from services.ycloud_client import send_text_message

    db = get_supabase()
    now = datetime.now(timezone.utc)

    try:
        result = db.table("conversation_sessions").select("*").execute()
        sessions = [r for r in (result.data or []) if r.get("state") in ACTIVE_STATES]

        for row in sessions:
            phone = row["customer_phone"]
            updated_at = datetime.fromisoformat(row["updated_at"].replace('Z', '+00:00'))
            elapsed_mins = (now - updated_at).total_seconds() / 60.0

            if row.get("recovery_status") == "sent":
                # Timeout de 1 hora para abandonados sin responder
                if elapsed_mins >= 60:
                    logger.info(f"Sesion expirada (1h post abandono): {phone}")
                    await reset_session(phone)
                    # La sesion se resetea pero el log en abandoned_orders_log se queda en "abandoned"
            else:
                # Si no llegó a la fase de abandono (ej: no seleccionó combo), se cierra a los 10 min
                if elapsed_mins >= 10 and not row.get("selected_combo_id"):
                    await send_text_message(
                        phone,
                        "⏰ *Chat finalizado por inactividad.*\n\n"
                        "Si deseas hacer un pedido, escribe *hola* cuando quieras "
                        "y con gusto te atendemos! 🍔🔥"
                    )
                    await reset_session(phone)
                    logger.info(f"Sesion cerrada por inactividad (10 min): {phone}")

    except Exception as e:
        logger.error(f"Error en scheduler conversation_timeouts: {e}")


async def check_en_camino_timeouts() -> None:
    from modules.order_flow import reset_session
    from services.ycloud_client import send_text_message
    db = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    try:
        result = db.table("conversation_sessions").select("*").eq("state", "en_camino").lte("en_camino_at", cutoff).execute()
        sessions = result.data or []
        for row in sessions:
            phone = row["customer_phone"]
            await send_text_message(phone, "Tu pedido debería estar cerca o entregado. El chat ha finalizado.")
            await reset_session(phone)
    except Exception as e:
        pass


def start_scheduler(app_state: dict) -> None:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    scheduler = AsyncIOScheduler()

    scheduler.add_job(check_abandoned_orders, trigger="interval", seconds=60, id="check_abandoned", replace_existing=True)
    scheduler.add_job(check_conversation_timeouts, trigger="interval", seconds=60, id="check_timeouts", replace_existing=True)
    scheduler.add_job(check_en_camino_timeouts, trigger="interval", seconds=60, id="check_encamino", replace_existing=True)

    scheduler.start()
    app_state["scheduler"] = scheduler
    logger.info("Scheduler iniciado: recuperacion de abandonos y timeouts activos.")

