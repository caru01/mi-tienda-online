"""
modules/inventory_manager.py
Gestiona el descuento automático de inventario basado en recetas.
"""
import logging
from services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

async def deduct_inventory_for_order(combo_id: str, quantity: int, customer_phone: str) -> None:
    """
    Descuenta los ingredientes necesarios del inventario basados en el combo vendido.
    """
    db = get_supabase()
    try:
        # Obtener receta
        recipe_res = db.table("recipe_ingredients").select("inventory_item_id, quantity_required").eq("product_id", combo_id).execute()
        if not recipe_res.data:
            logger.warning(f"No hay receta definida para el combo {combo_id}. No se descuenta inventario.")
            return

        for ingredient in recipe_res.data:
            item_id = ingredient["inventory_item_id"]
            qty_needed_per_combo = ingredient["quantity_required"]
            total_qty_needed = float(qty_needed_per_combo) * quantity

            # Registrar transacción negativa (salida por venta)
            db.table("inventory_transactions").insert({
                "inventory_item_id": item_id,
                "quantity_change": -total_qty_needed,
                "reason": "venta",
                "reference_id": customer_phone
            }).execute()

            # Obtener stock actual para actualizarlo (podríamos usar un RPC en BD, pero lo hacemos en código por simplicidad si hay poco tráfico)
            item_res = db.table("inventory_items").select("current_stock").eq("id", item_id).single().execute()
            if item_res.data:
                current_stock = float(item_res.data.get("current_stock", 0))
                new_stock = current_stock - total_qty_needed
                
                db.table("inventory_items").update({
                    "current_stock": new_stock
                }).eq("id", item_id).execute()
                
        logger.info(f"✅ Inventario descontado para {quantity}x {combo_id}")

    except Exception as e:
        logger.error(f"❌ Error descontando inventario para {combo_id}: {e}")
