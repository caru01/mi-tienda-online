"""
services/supabase_client.py
Cliente singleton para la base de datos Supabase.
"""
from supabase import create_client, Client
from config.settings import settings

_client: Client | None = None


def get_supabase() -> Client:
    """
    Retorna el cliente de Supabase (patrón Singleton).
    Reutiliza la conexión en toda la aplicación.
    """
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client
