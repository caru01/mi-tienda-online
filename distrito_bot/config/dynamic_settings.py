"""
config/dynamic_settings.py
Lee configuraciones dinámicas desde Supabase (tabla bot_settings).
Si falla, usa valores por defecto (de config.settings).
"""
import logging
import pytz
from datetime import datetime
from services.supabase_client import get_supabase
from config.settings import settings as base_settings

logger = logging.getLogger(__name__)

# Cache simple por 60 segundos para no saturar Supabase con consultas en cada mensaje
_cache = {}
_cache_time = 0
CACHE_TTL = 60

def _get_dynamic_settings() -> dict:
    global _cache, _cache_time
    now = datetime.now().timestamp()
    
    if _cache and (now - _cache_time) < CACHE_TTL:
        return _cache
        
    try:
        db = get_supabase()
        res = db.table("bot_settings").select("*").eq("id", 1).single().execute()
        if res.data:
            _cache = res.data
            _cache_time = now
            return _cache
    except Exception as e:
        logger.error(f"Error cargando bot_settings: {e}")
        
    return {}

def is_restaurant_open() -> bool:
    """Verifica si el restaurante está abierto según el horario y el switch manual."""
    data = _get_dynamic_settings()
    
    # 1. Switch manual ("Apagar restaurante" desde el dashboard)
    if not data.get("is_open", True):
        return False
        
    # 2. Horario automático
    tz = pytz.timezone(base_settings.timezone)
    now = datetime.now(tz)
    
    business_days_str = data.get("business_days", base_settings.business_days)
    days_list = [int(d.strip()) for d in business_days_str.split(",")]
    
    if now.weekday() not in days_list:
        return False
        
    open_h = int(data.get("business_open_hour", base_settings.business_open_hour))
    open_m = int(data.get("business_open_minute", base_settings.business_open_minute))
    close_h = int(data.get("business_close_hour", base_settings.business_close_hour))
    close_m = int(data.get("business_close_minute", base_settings.business_close_minute))
    
    open_time = now.replace(hour=open_h, minute=open_m, second=0, microsecond=0)
    close_time = now.replace(hour=close_h, minute=close_m, second=0, microsecond=0)
    
    return open_time <= now < close_time

def get_text(key: str, default: str) -> str:
    data = _get_dynamic_settings()
    return data.get(key, default)

def get_welcome_message() -> str:
    return get_text("welcome_message", base_settings.welcome_message)

def get_off_hours_message() -> str:
    return get_text("off_hours_message", base_settings.off_hours_message)

def get_backup_reply_message() -> str:
    return get_text("backup_reply_message", base_settings.backup_reply_message)

def get_payment_transfer_text() -> str:
    return get_text("payment_transfer_text", base_settings.payment_transfer_text)

def get_pickup_address() -> str:
    return get_text("pickup_address", base_settings.pickup_address)

def get_kitchen_phone() -> str:
    return get_text("kitchen_phone", base_settings.kitchen_phone_number)

def get_active_categories() -> list[str]:
    """Obtiene las categorias únicas de los productos activos."""
    try:
        db = get_supabase()
        res = db.table("products").select("category").eq("is_active", True).execute()
        categories = set()
        for row in res.data or []:
            cat = row.get("category")
            if cat:
                categories.add(cat)
        # Convertir a lista y ordenar, por defecto si esta vacio devolvemos ['Combos']
        cat_list = sorted(list(categories))
        return cat_list if cat_list else ["Combos"]
    except Exception as e:
        logger.error(f"Error cargando categorias: {e}")
        return ["Combos"]
