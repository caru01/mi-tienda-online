"""
config/settings.py
Configuración centralizada del bot Distrito Burger.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── YCloud ──────────────────────────────────────────────────
    ycloud_api_key: str
    ycloud_phone_number: str
    kitchen_phone_number: str = "+573235989590" # Default or placeholder (the user's number)

    # ── Supabase ─────────────────────────────────────────────────
    supabase_url: str
    supabase_key: str

    # ── Horario comercial ────────────────────────────────────────
    timezone: str = "America/Bogota"
    business_open_hour: int = 18       # 6:00 PM
    business_open_minute: int = 0
    business_close_hour: int = 22     # 10:00 PM
    business_close_minute: int = 0
    business_days: str = "2,3,4,5,6"  # Miércoles a Domingo

    # ── Comportamiento del bot ───────────────────────────────────
    backup_reply_minutes: int = 3
    webhook_secret: str = ""

    # ── Palabras que inician el flujo de pedido ──────────────────
    @property
    def flow_trigger_keywords(self) -> List[str]:
        """Cualquier mensaje que contenga estas palabras inicia el flujo."""
        return [
            "hola", "hi", "hey", "buenas", "buenos", "buen dia", "buen día",
            "buenos días", "buenos dias", "buenas tardes", "buenas noches",
            "saludos", "ola", "hello",
            "combo", "combos", "menu", "menú", "pedido", "burger",
            "hamburguesa", "servicio", "disponible", "atienden",
            "abiertos", "hay servicio", "tienen combos", "que tienen",
            "qué tienen", "quiero pedir", "quiero ordenar",
        ]

    # ── Datos de pago y pickup ──────────────────────────────────
    @property
    def payment_transfer_text(self) -> str:
        return (
            "*NUESTROS MEDIOS DE PAGO* ⬇️\n\n"
            "✅ *Llave Bre-B:* @BOJ841\n"
            "   A nombre: Camilo Andrés Rincones\n\n"
            "✅ *Nequi:* 3206375509\n"
            "   A nombre: Luzdanis Lara Severiche"
        )

    @property
    def pickup_address(self) -> str:
        return "Calle 7c #21-18 La Esperanza, Valledupar"

    # ── Mensajes del sistema ─────────────────────────────────────
    @property
    def welcome_message(self) -> str:
        return (
            "¡Hola! 👋 Bienvenido a *Distrito Burger* 🍔🔥\n\n"
            "Estamos abiertos y listos para atenderte.\n"
            "¿Qué se te antoja hoy?"
        )

    @property
    def off_hours_message(self) -> str:
        return (
            "¡Hola! 👋 Gracias por escribirnos a *Distrito Burger* 🍔\n\n"
            "En este momento estamos fuera de horario.\n\n"
            "📅 *Horario de atención:*\n"
            "Lunes a Domingo\n"
            "⏰ 6:00 AM – 10:00 PM\n\n"
            "¡Pronto abrimos! Te esperamos. 🔥\n\n"
            "_Mensaje automático._"
        )

    @property
    def backup_reply_message(self) -> str:
        return (
            "¡Hola! 👋 Estamos en cocina preparando pedidos y "
            "tardaremos unos minutitos en responderte. 🍳\n\n"
            "¡Ya te atendemos! ✅"
        )

    @property
    def business_days_list(self) -> List[int]:
        return [int(d.strip()) for d in self.business_days.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
