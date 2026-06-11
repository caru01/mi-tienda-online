"""
modules/order_flow.py
Flujo conversacional completo - Distrito Burger.

Estados:
  idle
  waiting_combo_selection   → cliente elige combo de la lista
  waiting_add_combo         → ¿agregar otro combo? [Sí] [No, continuar]
  waiting_quantity           → elige cantidad 1-5 (lista interactiva)
  waiting_observations       → observaciones (acepta "no"/"ninguna" → "Ninguna")
  waiting_delivery_type      → [Domicilio] [Recoger en local]
  waiting_name               → nombre del cliente (solo domicilio)
  waiting_address            → dirección de entrega (solo domicilio)
  waiting_barrio             → barrio (solo domicilio)
  waiting_payment            → [Efectivo] [Transferencia]
  order_complete             → pedido finalizado
"""
import re
import logging
from datetime import datetime, timezone

from services.supabase_client import get_supabase
from services.ycloud_client import (
    send_text_message,
    send_button_message,
    send_list_message,
)
from config.dynamic_settings import (
    is_restaurant_open,
    get_welcome_message,
    get_off_hours_message,
    get_pickup_address,
    get_payment_transfer_text,
    get_active_categories,
    get_msg_ask_name,
    get_msg_ask_delivery,
    get_msg_ask_address,
    get_msg_ask_neighborhood,
    get_msg_ask_payment,
    get_msg_order_registered
)
from config.settings import settings
from modules.auto_reply import is_greeting

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Catálogo de combos
# ─────────────────────────────────────────────────────────────
COMBOS = {
    "combo_personal": {"name": "PERSONAL",   "price": 12000, "desc": "1 Burger + 1 Papa + Bebida",           "emoji": "✨"},
    "combo_duo":      {"name": "DUO",         "price": 20000, "desc": "2 Burgers + 1 Papa + Gaseosa 1L",      "emoji": "✨"},
    "combo_parche":   {"name": "PARCHE",      "price": 30000, "desc": "3 Burgers + 2 Papas + Gaseosa 1L",     "emoji": "✨"},
    "combo_parche_xl":{"name": "PARCHE XL",   "price": 40000, "desc": "4 Burgers + 3 Papas + Gaseosa 1L",    "emoji": "🏆"},
}

COMBO_ALIASES = [
    (r"parche\s*xl", "combo_parche_xl"),
    (r"parche",      "combo_parche"),
    (r"d[uú]o",      "combo_duo"),
    (r"personal",    "combo_personal"),
    (r"^1$",         "combo_personal"),
    (r"^2$",         "combo_duo"),
    (r"^3$",         "combo_parche"),
    (r"^4$",         "combo_parche_xl"),
]

QTY_MAP = {"qty_1": 1, "qty_2": 2, "qty_3": 3, "qty_4": 4, "qty_5": 5}

NO_OBS_WORDS = {
    "no", "ninguna", "ninguno", "nada", "n/a",
    "no tengo", "sin observaciones", "sin obs", "none", "nn",
}

from modules.kitchen_notifier import send_kitchen_ticket

CONVERSATION_TIMEOUT_MINUTES = 10


# ─────────────────────────────────────────────────────────────
# Carga de Catálogo Dinámico
# ─────────────────────────────────────────────────────────────
async def get_db_combos(category: str = None) -> dict:
    """Carga los productos activos desde la base de datos, filtrando opcionalmente por categoría."""
    db = get_supabase()
    combos = {}
    try:
        query = db.table("products").select("*").eq("is_active", True)
        if category:
            query = query.eq("category", category)
            
        res = query.execute()
        for row in (res.data or []):
            combos[str(row["id"])] = {
                "name": row["name"],
                "price": row["price"],
                "desc": row["description"] or "",
                "emoji": row["emoji"] or "🍔",
                "category": row["category"] or "Combos"
            }
    except Exception as e:
        logger.error(f"Error cargando catálogo de Supabase: {e}")
        # Fallback a un catálogo en memoria si falla la BD
        combos = COMBOS
    return combos

async def get_combo_aliases() -> list:
    """Retorna la lista de alias dinámica basada en los nombres de la BD."""
    db_combos = await get_db_combos()
    aliases = [
        (r"parche\s*xl", "combo_parche_xl"),
        (r"parche",      "combo_parche"),
        (r"d[uú]o",      "combo_duo"),
        (r"personal",    "combo_personal"),
        (r"^1$",         "combo_personal"),
        (r"^2$",         "combo_duo"),
        (r"^3$",         "combo_parche"),
        (r"^4$",         "combo_parche_xl"),
    ]
    # Se podrían generar alias desde la BD, pero usaremos la lista estática para IDs conocidos por simplicidad.
    return aliases

# ─────────────────────────────────────────────────────────────
# Gestión de sesiones
# ─────────────────────────────────────────────────────────────

async def _get_session(customer_phone: str) -> dict:
    db = get_supabase()
    try:
        res = (
            db.table("conversation_sessions")
            .select("*")
            .eq("customer_phone", customer_phone)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else {"state": "idle"}
    except Exception as e:
        logger.error(f"Error leyendo sesion de {customer_phone}: {e}")
        return {"state": "idle"}


async def _update_session(customer_phone: str, updates: dict) -> bool:
    """Retorna True si el update fue exitoso."""
    db = get_supabase()
    updates["customer_phone"] = customer_phone
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    # Reset retry_count on state change if not explicitly overridden
    if "state" in updates and "retry_count" not in updates:
        updates["retry_count"] = 0
    try:
        db.table("conversation_sessions").upsert(
            updates, on_conflict="customer_phone"
        ).execute()
        return True
    except Exception as e:
        logger.error(f"Error actualizando sesion de {customer_phone}: {e}")
        return False


async def reset_session(customer_phone: str) -> None:
    """Pública: resetea la sesión a idle. Usada también por el scheduler."""
    await _update_session(customer_phone, {
        "state": "idle",
        "selected_combo_id": None, "selected_combo_name": None,
        "combo_price": None, "combo_quantity": None,
        "order_items_text": None, "order_total": 0,
        "observations": None, "customer_name": None,
        "delivery_type": None, "delivery_address": None,
        "delivery_barrio": None, "payment_method": None,
    })


async def _save_customer(customer_phone: str, session: dict) -> bool:
    """Guarda/actualiza el contacto en la tabla customers y retorna True si es cliente VIP (ej. 5to pedido)."""
    db = get_supabase()
    name   = session.get("customer_name") or ""
    barrio = session.get("delivery_barrio") or ""
    label  = f"{name} - {barrio} - Distrito Burger" if name else customer_phone
    now    = datetime.now(timezone.utc).isoformat()
    is_vip = False
    
    try:
        existing = (
            db.table("customers")
            .select("total_orders")
            .eq("customer_phone", customer_phone)
            .limit(1)
            .execute()
        )
        if existing.data:
            total = (existing.data[0].get("total_orders") or 0) + 1
            if total > 0 and total % 5 == 0:
                is_vip = True
                
            db.table("customers").update({
                "customer_name":    name,
                "delivery_address": session.get("delivery_address"),
                "delivery_barrio":  barrio,
                "whatsapp_label":   label,
                "last_order_at":    now,
                "last_interaction_at": now,
                "total_orders":     total,
            }).eq("customer_phone", customer_phone).execute()
        else:
            db.table("customers").insert({
                "customer_phone":   customer_phone,
                "customer_name":    name,
                "delivery_address": session.get("delivery_address"),
                "delivery_barrio":  barrio,
                "whatsapp_label":   label,
                "first_order_at":   now,
                "last_order_at":    now,
                "last_interaction_at": now,
                "total_orders":     1,
                "notes":            ""
            }).execute()
        logger.info(f"Cliente guardado: {label}")
    except Exception as e:
        logger.error(f"Error guardando cliente {customer_phone}: {e}")
        
    return is_vip

async def _finalize_sale(customer_phone: str, session: dict) -> bool:
    """Inserta la venta en BD, descuenta inventario y verifica fidelidad."""
    db = get_supabase()
    is_vip = await _save_customer(customer_phone, session)
    
    try:
        # Calcular daily_order_number
        now = datetime.now(timezone.utc)
        today_str = now.strftime('%Y-%m-%d')
        # Buscamos cuantas ordenes hay hoy
        sales_today = db.table("sales").select("id").gte("created_at", f"{today_str}T00:00:00Z").lte("created_at", f"{today_str}T23:59:59Z").execute()
        daily_count = len(sales_today.data) + 1 if sales_today.data else 1

        # 1. Registrar Venta
        db.table("sales").insert({
            "customer_phone": customer_phone,
            "order_detail": session.get("order_items_text", ""),
            "total_amount": session.get("order_total", 0),
            "customer_name": session.get("customer_name", ""),
            "payment_method": session.get("payment_method", ""),
            "delivery_type": session.get("delivery_type", ""),
            "delivery_barrio": session.get("delivery_barrio", ""),
            "status": "por_aceptar",
            "daily_order_number": daily_count
        }).execute()

        # 2. El inventario ya no se descuenta aquí, se descuenta al pasar a Entregado.
    except Exception as e:
        logger.error(f"Error finalizando venta para {customer_phone}: {e}")
        
    return is_vip


# ─────────────────────────────────────────────────────────────
# Detectores
# ─────────────────────────────────────────────────────────────

def should_start_flow(body: str) -> bool:
    # Solo inicia el flujo si el mensaje contiene una palabra clave de saludo/pedido
    if not body: return False
    return is_greeting(body)


async def _detect_combo(body: str, i_type: str, i_id: str) -> str | None:
    combos = await get_db_combos()
    if i_type == "list_reply" and i_id in combos:
        return i_id
    if body:
        normalized = body.lower().strip()
        aliases = await get_combo_aliases()
        for pattern, combo_id in aliases:
            if re.search(pattern, normalized):
                if combo_id in combos:
                    return combo_id
    return None


def _detect_qty(body: str, i_type: str, i_id: str) -> int | None:
    if i_type == "list_reply" and i_id in QTY_MAP:
        return QTY_MAP[i_id]
    if body:
        normalized = body.lower().strip()
        word_map = {
            "un": 1, "uno": 1, "una": 1,
            "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
            "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10
        }
        if normalized in word_map:
            return word_map[normalized]
        
        m = re.search(r"\b(\d+)\b", body)
        if m:
            qty = int(m.group(1))
            if 1 <= qty <= 20: # Límite razonable
                return qty
    return None


def _normalize_obs(body: str) -> str:
    return "Ninguna" if body.lower().strip() in NO_OBS_WORDS else body.strip()


def _detect_delivery(body: str, i_type: str, i_id: str) -> str | None:
    if i_type == "button_reply":
        if i_id == "entrega_domicilio": return "domicilio"
        if i_id == "entrega_recoger":   return "recoger"
    if body:
        n = body.lower()
        if any(w in n for w in ["domicilio", "entrega", "llevar", "envio", "delivery"]):
            return "domicilio"
        if any(w in n for w in ["recoger", "local", "busco", "voy", "paso", "recojo"]):
            return "recoger"
    return None


def _detect_payment(body: str, i_type: str, i_id: str) -> str | None:
    if i_type == "button_reply":
        if i_id == "pago_efectivo":      return "efectivo"
        if i_id == "pago_transferencia": return "transferencia"
    if body:
        n = body.lower()
        if "efectivo" in n or "cash" in n: return "efectivo"
        if any(w in n for w in ["transferencia", "nequi", "bre", "digital"]): return "transferencia"
    return None


# ─────────────────────────────────────────────────────────────
# Builders de resumen del pedido
# ─────────────────────────────────────────────────────────────

async def _add_item_to_order(session: dict, combo_id: str, qty: int) -> tuple[str, int]:
    """Acumula el nuevo combo en order_items_text y retorna (nuevo_texto, nuevo_total)."""
    combos = await get_db_combos()
    combo = combos.get(combo_id, {"price": 0, "name": "Desconocido", "emoji": "🍔"})
    subtotal   = combo["price"] * qty
    new_line   = f"{combo['emoji']} {qty}x {combo['name']} — ${subtotal:,}"
    existing   = session.get("order_items_text") or ""
    new_text   = f"{existing}\n{new_line}".strip()
    new_total  = (session.get("order_total") or 0) + subtotal
    return new_text, new_total


def _build_summary(session: dict, customer_phone: str) -> str:
    items  = session.get("order_items_text") or "Sin items"
    total  = session.get("order_total") or 0
    obs    = session.get("observations") or "Ninguna"
    deliv  = session.get("delivery_type") or ""
    name   = session.get("customer_name") or ""
    addr   = session.get("delivery_address") or ""
    barrio = session.get("delivery_barrio") or ""

    lines = ["📋 *RESUMEN DE TU PEDIDO*\n", items, ""]
    if name:
        lines.append(f"👤 Nombre: {name}")
    lines.append(f"📱 Telefono: {customer_phone}")
    lines.append(f"📝 Observaciones: {obs}")

    if deliv == "domicilio":
        lines.append(f"🏠 Direccion: {addr}")
        lines.append(f"🏘 Barrio: {barrio}")
        lines.append(f"💰 Total combos: *${total:,}*")
        lines.append("_(El domicilio lo cobra la empresa de delivery)_")
    else:
        lines.append(f"📍 Recoger en: {get_pickup_address()}")
        lines.append(f"💰 Total: *${total:,}*")

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────
# Funciones de envío
# ─────────────────────────────────────────────────────────────

async def _send_welcome(phone: str) -> None:
    buttons = [
        {"id": "ver_combos", "title": "🍔 VER COMBOS"},
        {"id": "hablar_asesor", "title": "👨‍💼 HABLAR CON ASESOR"}
    ]
    
    await send_button_message(
        to=phone,
        body_text=get_welcome_message(),
        buttons=buttons,
    )


async def _send_combos_list(phone: str, category: str = None) -> None:
    combos = await get_db_combos(category)
    rows = []
    for cid, cdata in combos.items():
        rows.append({
            "id": cid,
            "title": f"{cdata['name']} ${cdata['price']:,}",
            "description": cdata["desc"][:70]  # Limite de whatsapp para descripcion
        })

    if not rows:
        await send_text_message(phone, f"No hay productos activos en {category or 'el catálogo'} en este momento.")
        return

    # Enviar imagen de combos si la categoría es Combos o no se especificó (catálogo general)
    from services.ycloud_client import send_image_message
    if not category or category.lower() == "combos":
        # Usamos la URL pública de Render para la imagen
        image_url = "https://distrito.onrender.com/media/COMBOS.jpeg"
        try:
            await send_image_message(phone, image_url, caption="🍔 Nuestros increíbles combos")
        except Exception as e:
            logger.error(f"No se pudo enviar la imagen de combos: {e}")

    cat_title = category if category else "Combos"
    await send_list_message(
        to=phone,
        body_text=f"🍔 *Nuestro Catálogo: {cat_title}*\n\nRevisa las opciones y selecciona tu favorito:",
        button_label=f"Abrir {cat_title}"[:20],
        sections=[{"title": f"Opciones de {cat_title}", "rows": rows}]
    )


async def _send_qty_list(phone: str, combo_name: str) -> None:
    await send_list_message(
        to=phone,
        body_text=f"Cuantos combos *{combo_name}* deseas pedir?",
        button_label="Elegir cantidad",
        sections=[{"title": "Selecciona la cantidad", "rows": [
            {"id": "qty_1", "title": "1 combo"},
            {"id": "qty_2", "title": "2 combos"},
            {"id": "qty_3", "title": "3 combos"},
            {"id": "qty_4", "title": "4 combos"},
            {"id": "qty_5", "title": "5 combos"},
        ]}],
    )


async def _ask_add_combo(phone: str, items_text: str, total: int) -> None:
    await send_button_message(
        to=phone,
        body_text=(
            f"Agregado al pedido! ✅\n\n"
            f"{items_text}\n"
            f"_Subtotal: ${total:,}_\n\n"
            "Deseas agregar otro combo?"
        ),
        buttons=[
            {"id": "add_combo_si", "title": "Si, agregar otro"},
            {"id": "add_combo_no", "title": "No, continuar"},
        ],
    )


async def _send_delivery_buttons(phone: str) -> None:
    await send_button_message(
        to=phone,
        body_text=get_msg_ask_delivery(),
        buttons=[
            {"id": "entrega_domicilio", "title": "Domicilio"},
            {"id": "entrega_recoger",   "title": "Recoger en local"},
        ],
    )


async def _send_payment_buttons(phone: str, summary: str) -> None:
    await send_button_message(
        to=phone,
        body_text=f"{summary}\n\n{get_msg_ask_payment()}",
        buttons=[
            {"id": "pago_efectivo",      "title": "Efectivo"},
            {"id": "pago_transferencia", "title": "Transferencia"},
        ],
    )


# ─────────────────────────────────────────────────────────────
# Prevención de Bucles y Auxiliares de Selección
# ─────────────────────────────────────────────────────────────

async def _detect_combo_selection_attempt(body: str) -> str | None:
    if not body:
        return None
    normalized = body.lower().strip()
    
    # Comprobar nombres directos
    if "parche xl" in normalized or "parchexl" in normalized:
        return "combo_parche_xl"
    if "parche" in normalized:
        return "combo_parche"
    if "duo" in normalized or "dúo" in normalized:
        return "combo_duo"
    if "personal" in normalized:
        return "combo_personal"
        
    # Comprobar patrón combo + número, ej. "combo 3", "combo numero 3", "el 3"
    m = re.search(r"combo\s*(?:n[uú]mero\s*)?\b([1-4])\b", normalized)
    if m:
        num = m.group(1)
        mapping = {
            "1": "combo_personal",
            "2": "combo_duo",
            "3": "combo_parche",
            "4": "combo_parche_xl"
        }
        return mapping.get(num)
        
    return None


async def _handle_invalid_input(customer_phone: str, session: dict, state: str) -> None:
    current_retry = session.get("retry_count") or 0
    if current_retry >= 2:
        # Escalación
        await reset_session(customer_phone)
        msg = (
            "Parece que hay problemas para procesar tu respuesta. 📴\n\n"
            "Te hemos comunicado con un *asesor humano* para que te ayude manualmente. "
            "Por favor espera un momento o escribe *reiniciar* si deseas empezar de nuevo. 🍔"
        )
        await send_text_message(customer_phone, msg)
    else:
        # Incrementar reintentos y repetir el prompt del estado actual
        await _update_session(customer_phone, {"retry_count": current_retry + 1, "state": state})
        if state == "waiting_combo_selection":
            await _send_combos_list(customer_phone)
        elif state == "waiting_quantity":
            await _send_qty_list(customer_phone, session.get("selected_combo_name", "el combo"))
        elif state == "waiting_add_combo":
            await send_button_message(
                to=customer_phone,
                body_text="Deseas agregar otro combo al pedido?",
                buttons=[
                    {"id": "add_combo_si", "title": "Si, agregar otro"},
                    {"id": "add_combo_no", "title": "No, continuar"},
                ],
            )
        elif state == "waiting_delivery_type":
            await _send_delivery_buttons(customer_phone)
        elif state == "waiting_name":
            await send_text_message(customer_phone, get_msg_ask_name())
        elif state == "waiting_address":
            await send_text_message(
                customer_phone,
                "Por favor escribe una direccion mas completa. 📍\n_(Ej: Calle 15 #12-34)_"
            )
        elif state == "waiting_barrio":
            await send_text_message(customer_phone, get_msg_ask_neighborhood())
        elif state == "waiting_payment":
            await _send_payment_buttons(customer_phone, _build_summary(session, customer_phone))


# ─────────────────────────────────────────────────────────────
# Máquina de estados
# ─────────────────────────────────────────────────────────────

async def handle_customer_message(
    customer_phone: str,
    body: str = "",
    interactive_type: str = "",
    interactive_id: str = "",
    interactive_title: str = "",
) -> bool:
    session = await _get_session(customer_phone)
    state   = session.get("state", "idle")

    logger.info(f"[{customer_phone}] {state} | body='{body[:25]}' | id={interactive_id}")

    # ── DETECCIÓN DE CANCELACIÓN GLOBAL ───────────────────────
    if body:
        body_clean = body.lower().strip()
        if body_clean in ["cancelar", "reiniciar", "salir", "cancelar pedido"]:
            await reset_session(customer_phone)
            await send_text_message(
                customer_phone,
                "Tu pedido actual ha sido cancelado. ❌ Si deseas ordenar nuevamente, escribe cualquier mensaje para iniciar de nuevo. 🍔"
            )
            return True

    # ── DETECCIÓN DE ASESOR ───────────────────────────────────
    if (body and "asesor" in body.lower()) or (interactive_type == "button_reply" and interactive_id == "hablar_asesor"):
        await reset_session(customer_phone)
        await send_text_message(
            customer_phone, 
            "Te estamos comunicando con un asesor humano. Por favor, espera un momento. 👨‍💻"
        )
        return True

    # ── RECUPERACIÓN DE CARRITOS ABANDONADOS ──────────────────
    if interactive_type == "button_reply":
        if interactive_id == "recovery_cancel":
            await reset_session(customer_phone)
            # Log metrics as cancelled
            db = get_supabase()
            db.table("abandoned_orders_log").update({"status": "cancelled"}).eq("customer_phone", customer_phone).eq("status", "abandoned").execute()
            await send_text_message(
                customer_phone,
                "✅ Pedido cancelado correctamente.\n\nCuando quieras volver a ordenar estaremos disponibles.\nGracias por visitar Distrito BG 🍔"
            )
            return True
        elif interactive_id == "recovery_continue":
            db = get_supabase()
            db.table("conversation_sessions").update({"recovery_status": "recovered", "updated_at": datetime.now(timezone.utc).isoformat(), "retry_count": 0}).eq("customer_phone", customer_phone).execute()
            db.table("abandoned_orders_log").update({"status": "recovered"}).eq("customer_phone", customer_phone).eq("status", "abandoned").execute()
            
            await send_text_message(
                customer_phone,
                "🍔 Perfecto.\n\nRetomemos tu pedido donde lo dejaste."
            )
            # Resend the prompt for the current state without triggering an error limit
            session["retry_count"] = -1
            await _handle_invalid_input(customer_phone, session, state)
            return True

    # ── IDLE / FINALIZADO: iniciar flujo ──────────────────────
    if state in ("idle", "order_complete", "en_camino"):
        if should_start_flow(body) or interactive_type:
            if not is_restaurant_open():
                return False # Let auto_reply handle off_hours
                
            if interactive_type == "button_reply":
                if interactive_id == "ver_combos":
                    await _send_combos_list(customer_phone, "Combos")
                    await _update_session(customer_phone, {"state": "waiting_combo_selection"})
                    return True
                elif interactive_id.startswith("ver_cat_"):
                    cat = interactive_id.replace("ver_cat_", "")
                    await _send_combos_list(customer_phone, cat)
                    await _update_session(customer_phone, {"state": "waiting_combo_selection"})
                    return True
            await reset_session(customer_phone)
            await _send_welcome(customer_phone)
            await _update_session(customer_phone, {"state": "waiting_combo_selection"})
        return True

    # ── SELECCIÓN DE COMBO ────────────────────────────────────
    if state == "waiting_combo_selection":
        if interactive_type == "button_reply" and interactive_id == "ver_combos":
            await _send_combos_list(customer_phone)
            return True

        combo_id = await _detect_combo(body, interactive_type, interactive_id)
        if combo_id:
            combos = await get_db_combos()
            combo = combos[combo_id]
            await _update_session(customer_phone, {
                "state": "waiting_quantity",
                "selected_combo_id":   combo_id,
                "selected_combo_name": combo["name"],
                "combo_price":         combo["price"],
            })
            await send_text_message(
                customer_phone,
                f"{combo['emoji']} *{combo['name']}* — ${combo['price']:,}\n_{combo['desc']}_"
            )
            await _send_qty_list(customer_phone, combo["name"])
        else:
            await _handle_invalid_input(customer_phone, session, state)
        return True

    # ── CANTIDAD ──────────────────────────────────────────────
    if state == "waiting_quantity":
        # Verificar intento de cambiar/seleccionar combo en lugar de ingresar cantidad
        combo_attempt = await _detect_combo_selection_attempt(body)
        if combo_attempt:
            combos = await get_db_combos()
            combo = combos.get(combo_attempt)
            if combo:
                await _update_session(customer_phone, {
                    "selected_combo_id":   combo_attempt,
                    "selected_combo_name": combo["name"],
                    "combo_price":         combo["price"],
                })
                await send_text_message(
                    customer_phone,
                    f"Cambiado al combo: {combo['emoji']} *{combo['name']}* — ${combo['price']:,}\n_{combo['desc']}_"
                )
                await _send_qty_list(customer_phone, combo["name"])
                return True

        qty = _detect_qty(body, interactive_type, interactive_id)
        if qty:
            combo_id   = session.get("selected_combo_id", "")
            items_text, total = await _add_item_to_order(session, combo_id, qty)

            await _update_session(customer_phone, {
                "state":            "waiting_add_combo",
                "combo_quantity":   (session.get("combo_quantity") or 0) + qty,
                "order_items_text": items_text,
                "order_total":      total,
            })
            await _ask_add_combo(customer_phone, items_text, total)
        else:
            await _handle_invalid_input(customer_phone, session, state)
        return True

    # ── ¿AGREGAR OTRO COMBO? ──────────────────────────────────
    if state == "waiting_add_combo":
        answer_id = interactive_id if interactive_type == "button_reply" else ""
        body_low  = body.lower().strip()

        quiere_mas = (
            answer_id == "add_combo_si"
            or body_low in ("si", "sí", "s", "otro", "agregar", "mas", "más", "claro", "dale", "sip", "obvio", "por supuesto", "de una")
        )
        quiere_continuar = (
            answer_id == "add_combo_no"
            or body_low in ("no", "n", "continuar", "listo", "ya", "nop", "nada")
        )

        if quiere_mas:
            await _update_session(customer_phone, {
                "state": "waiting_combo_selection",
                # Limpiamos el combo actual para la nueva selección
                "selected_combo_id": None, "selected_combo_name": None, "combo_price": None,
            })
            await _send_combos_list(customer_phone)

        elif quiere_continuar:
            await _update_session(customer_phone, {"state": "waiting_observations"})
            await send_text_message(
                customer_phone,
                "Tienes alguna *observacion* para tu pedido?\n"
                "_(Ej: sin cebolla, extra salsa)_\n\n"
                "Si no tienes ninguna, escribe *no* o *ninguna*"
            )
        else:
            await _handle_invalid_input(customer_phone, session, state)
        return True

    # ── OBSERVACIONES ─────────────────────────────────────────
    if state == "waiting_observations":
        obs = _normalize_obs(body) if body else "Ninguna"
        ok  = await _update_session(customer_phone, {
            "state": "waiting_delivery_type",
            "observations": obs,
        })
        if ok:
            await _send_delivery_buttons(customer_phone)
        return True

    # ── TIPO DE ENTREGA ───────────────────────────────────────
    if state == "waiting_delivery_type":
        delivery = _detect_delivery(body, interactive_type, interactive_id)

        if delivery == "domicilio":
            ok = await _update_session(customer_phone, {
                "state": "waiting_name",
                "delivery_type": "domicilio",
            })
            if ok:
                await send_text_message(
                    customer_phone,
                    get_msg_ask_name()
                )

        elif delivery == "recoger":
            ok = await _update_session(customer_phone, {
                "state": "waiting_name",
                "delivery_type": "recoger",
                "delivery_address": get_pickup_address(),
                "delivery_barrio": "La Esperanza",
            })
            if ok:
                await send_text_message(
                    customer_phone,
                    get_msg_ask_name()
                )
        else:
            await _handle_invalid_input(customer_phone, session, state)
        return True

    # ── NOMBRE (domicilio) ────────────────────────────────────
    if state == "waiting_name":
        name = body.strip() if body else ""
        if len(name) < 2:
            await _handle_invalid_input(customer_phone, session, state)
            return True
        ok = await _update_session(customer_phone, {
            "customer_name": name,
        })
        
        if ok:
            if session.get("delivery_type") == "recoger":
                await _update_session(customer_phone, {"state": "waiting_payment"})
                updated = {**session, "customer_name": name}
                summary = _build_summary(updated, customer_phone)
                await _send_payment_buttons(customer_phone, summary)
            else:
                await _update_session(customer_phone, {"state": "waiting_address"})
                await send_text_message(
                    customer_phone,
                    get_msg_ask_address()
                )
        return True

    # ── DIRECCIÓN (domicilio) ─────────────────────────────────
    if state == "waiting_address":
        address = body.strip() if body else ""
        if len(address) < 5:
            await _handle_invalid_input(customer_phone, session, state)
            return True
        ok = await _update_session(customer_phone, {
            "state": "waiting_barrio",
            "delivery_address": address,
        })
        if ok:
            await send_text_message(customer_phone, get_msg_ask_neighborhood())
        else:
            await _handle_invalid_input(customer_phone, session, state)
        return True

    # ── BARRIO (domicilio) ────────────────────────────────────
    if state == "waiting_barrio":
        barrio = body.strip() if body else ""
        if len(barrio) < 2:
            await _handle_invalid_input(customer_phone, session, state)
            return True
        updated = {**session, "delivery_barrio": barrio}
        ok = await _update_session(customer_phone, {
            "state": "waiting_payment",
            "delivery_barrio": barrio,
        })
        if ok:
            summary = _build_summary(updated, customer_phone)
            await _send_payment_buttons(customer_phone, summary)
        return

    # ── MÉTODO DE PAGO ────────────────────────────────────────
    if state == "waiting_payment":
        payment = _detect_payment(body, interactive_type, interactive_id)

        if payment == "efectivo":
            await _update_session(customer_phone, {"state": "order_complete", "payment_method": "efectivo"})
            session["payment_method"] = "efectivo"
            is_vip = await _finalize_sale(customer_phone, session)
            
            delivery = session.get("delivery_type", "")
            msg = get_msg_order_registered()
            
            if is_vip:
                msg += "\n\n🎁 *¡Sorpresa!* Vemos que eres un cliente frecuente. Hoy hemos incluido un *obsequio especial* en tu pedido por tu fidelidad. ¡Disfrútalo!"
                
            await send_text_message(customer_phone, msg)
            return True

        elif payment == "transferencia":
            await _update_session(customer_phone, {"state": "esperando_comprobante", "payment_method": "transferencia"})
            await send_text_message(customer_phone, get_payment_transfer_text())
            return True
        else:
            await _send_payment_buttons(
                customer_phone,
                _build_summary(session, customer_phone)
            )
        return True

    # ── ESPERANDO COMPROBANTE ─────────────────────────────────
    if state == "esperando_comprobante":
        await _update_session(customer_phone, {"state": "order_complete"})
        session["payment_method"] = "transferencia"
        is_vip = await _finalize_sale(customer_phone, session)
        
        msg = get_msg_order_registered()
        if is_vip:
            msg += "\n\n🎁 *¡Sorpresa!* Vemos que eres un cliente frecuente. Hoy hemos incluido un *obsequio especial* en tu pedido por tu fidelidad. ¡Disfrútalo!"
            
        await send_text_message(customer_phone, msg)
        return True

    # ── Estado desconocido ────────────────────────────────────
    logger.warning(f"Estado desconocido '{state}' para {customer_phone}")
    await reset_session(customer_phone)
    await _send_welcome(customer_phone)
    await _update_session(customer_phone, {"state": "waiting_combo_selection"})
