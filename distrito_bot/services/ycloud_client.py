"""
services/ycloud_client.py
Cliente HTTP para la API REST de YCloud.
Abstrae el envío de mensajes de WhatsApp (texto e interactivos).
"""
import httpx
import logging
from config.settings import settings
from config.dynamic_settings import get_ycloud_api_key, get_whatsapp_phone_id

logger = logging.getLogger(__name__)

YCLOUD_API_BASE = "https://api.ycloud.com/v2"


def _headers() -> dict:
    return {
        "Content-Type": "application/json",
        "X-API-Key": get_ycloud_api_key(),
    }


async def _post(payload: dict) -> dict:
    """Función interna para enviar cualquier payload a la API de YCloud."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(
                f"{YCLOUD_API_BASE}/whatsapp/messages",
                headers=_headers(),
                json=payload,
            )
            response.raise_for_status()
            logger.info(
                f"Mensaje enviado a {payload.get('to')} | "
                f"Tipo: {payload.get('type')} | Status: {response.status_code}"
            )
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Error HTTP al enviar a {payload.get('to')}: "
                f"{e.response.status_code} - {e.response.text}"
            )
            raise
        except httpx.RequestError as e:
            logger.error(f"Error de red al contactar YCloud: {e}")
            raise


async def send_text_message(to: str, text: str) -> dict:
    """
    Envía un mensaje de texto plano de WhatsApp.
    Soporta formato WhatsApp: *negrita*, _cursiva_, ~tachado~
    """
    return await _post({
        "to": to,
        "from": get_whatsapp_phone_id(),
        "type": "text",
        "text": {"body": text}
    })

async def send_image_message(to: str, image_url: str, caption: str = "") -> dict:
    """
    Envía una imagen a través de WhatsApp mediante URL pública.
    """
    payload = {
        "to": to,
        "from": get_whatsapp_phone_id(),
        "type": "image",
        "image": {"link": image_url}
    }
    if caption:
        payload["image"]["caption"] = caption
    return await _post(payload)


async def send_button_message(to: str, body_text: str, buttons: list[dict]) -> dict:
    """
    Envía un mensaje interactivo con botones de respuesta rápida.

    Args:
        to:         Número destino en formato E.164
        body_text:  Texto principal del mensaje
        buttons:    Lista de dicts con 'id' y 'title' (máx 3 botones, title máx 20 chars)

    Ejemplo de buttons:
        [{"id": "ver_combos", "title": "Ver Combos"}]
    """
    formatted_buttons = [
        {
            "type": "reply",
            "reply": {"id": btn["id"], "title": btn["title"]}
        }
        for btn in buttons[:3]  # WhatsApp permite máximo 3 botones
    ]

    return await _post({
        "to": to,
        "from": get_whatsapp_phone_id(),
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": body_text},
            "action": {"buttons": formatted_buttons}
        }
    })


async def send_list_message(to: str, body_text: str, button_label: str, sections: list[dict]) -> dict:
    """
    Envía un mensaje interactivo con lista de opciones.

    Args:
        to:           Número destino
        body_text:    Texto principal
        button_label: Texto del botón para abrir la lista (máx 20 chars)
        sections:     Lista de secciones con título y filas

    Ejemplo de sections:
        [{
            "title": "Nuestros Combos",
            "rows": [
                {"id": "combo_personal", "title": "Personal $12.000", "description": "1 Burger + Papa + Bebida"}
            ]
        }]
    """
    return await _post({
        "to": to,
        "from": get_whatsapp_phone_id(),
        "type": "interactive",
        "interactive": {
            "type": "list",
            "body": {"text": body_text},
            "action": {
                "button": button_label,
                "sections": sections
            }
        }
    })
