"""
modules/sales_parser.py
Módulo B: Analizador y Asentador de Ventas.

Responsabilidades:
- Detectar "pago confirmado" en mensajes salientes.
- Leer datos del pedido desde la sesión (conversation_sessions).
- Insertar registro en `sales`.
"""
import re
import logging
from services.supabase_client import get_supabase
from modules.inventory_manager import deduct_inventory_for_order

logger = logging.getLogger(__name__)

SALE_TRIGGER_PATTERN = re.compile(r"(pago\s+confirmado|pedido\s+ya\s+ha\s+sido\s+preparado)", re.IGNORECASE)

def is_sale_message(text: str) -> bool:
    """Retorna True si el mensaje saliente es una confirmación de pago."""
    return bool(SALE_TRIGGER_PATTERN.search(text))

async def process_sale(customer_phone: str, message_body: str) -> None:
    """
    Procesa un mensaje saliente y, si confirma el pago, registra la venta.
    """
    if not is_sale_message(message_body):
        return

    logger.info(f"💰 Confirmación de pago detectada para {customer_phone}")
    db = get_supabase()

    try:
        # Obtener los datos de la sesión actual
        session_res = (
            db.table("conversation_sessions")
            .select("*")
            .eq("customer_phone", customer_phone)
            .limit(1)
            .execute()
        )
        
        if not session_res.data:
            logger.warning(f"⚠️ No se encontró sesión para {customer_phone} al registrar venta.")
            return
            
        session = session_res.data[0]
        
        # Insertar venta en BD
        db.table("sales").insert({
            "customer_phone": customer_phone,
            "order_detail": session.get("order_items_text", ""),
            "total_amount": session.get("order_total", 0),
            "combo_quantity": session.get("combo_quantity", 0),
            "customer_name": session.get("customer_name", ""),
            "payment_method": session.get("payment_method", ""),
            "delivery_type": session.get("delivery_type", ""),
            "delivery_barrio": session.get("delivery_barrio", ""),
            "raw_message": message_body
        }).execute()

        logger.info(f"✅ Venta registrada correctamente para {customer_phone}")
        
        # Descontar inventario (El combo quantity total puede ser inexacto si compró varios combos diferentes,
        # pero como no tenemos el desglose por combo id guardado fácilmente, asumiremos que pidio del last selected_combo_id.
        # Mejor: Deberiamos parsear order_items_text si queremos exactitud, pero por ahora tomaremos el selected_combo_id.)
        # Parse order_items_text to find combos and quantities
        items_text = session.get("order_items_text", "")
        # Format is "✨ 2x PARCHE — $60,000"
        import re
        for line in items_text.split('\n'):
            match = re.search(r"(\d+)x\s+(.+?)\s+—", line)
            if match:
                qty = int(match.group(1))
                c_name = match.group(2).strip()
                # Find product_id by name
                prod_res = db.table("products").select("id").eq("name", c_name).execute()
                if prod_res.data:
                    c_id = prod_res.data[0]["id"]
                    await deduct_inventory_for_order(c_id, qty, customer_phone)
        
    except Exception as e:
        logger.error(f"❌ Error al registrar venta en BD para {customer_phone}: {e}")
