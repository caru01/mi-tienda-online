"""
api/dashboard.py
Endpoints para el Dashboard Web.
"""
from fastapi import APIRouter
from services.supabase_client import get_supabase
from typing import Dict, Any

router = APIRouter()

@router.get("/api/dashboard/stats")
async def get_dashboard_stats() -> Dict[str, Any]:
    db = get_supabase()
    # Ventas totales
    sales = db.table("sales").select("*").execute()
    total_revenue = sum([s.get("total_amount", 0) for s in sales.data or []])
    total_orders = len(sales.data or [])

    # Obtener inventario
    inventory = db.table("inventory_items").select("*").execute()
    
    # Obtener catálogo
    products = db.table("products").select("*").execute()

    return {
        "status": "ok",
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "inventory": inventory.data or [],
        "products": products.data or [],
        "recent_sales": sales.data[-5:] if sales.data else []
    }

@router.post("/api/dashboard/inventory/purchase")
async def add_inventory(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    item_id = payload.get("item_id")
    quantity = payload.get("quantity", 0)
    
    if not item_id or quantity <= 0:
        return {"status": "error", "message": "Datos inválidos"}
        
    try:
        # Registrar transacción positiva
        db.table("inventory_transactions").insert({
            "inventory_item_id": item_id,
            "quantity_change": quantity,
            "reason": "compra",
            "reference_id": "dashboard"
        }).execute()
        
        # Actualizar stock
        item = db.table("inventory_items").select("current_stock").eq("id", item_id).single().execute()
        new_stock = float(item.data["current_stock"]) + float(quantity)
        
        db.table("inventory_items").update({"current_stock": new_stock}).eq("id", item_id).execute()
        
        return {"status": "success", "new_stock": new_stock}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/products/toggle")
async def toggle_product(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    product_id = payload.get("product_id")
    is_active = payload.get("is_active")
    
    try:
        db.table("products").update({"is_active": is_active}).eq("id", product_id).execute()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/api/dashboard/settings")
async def get_settings() -> Dict[str, Any]:
    db = get_supabase()
    try:
        res = db.table("bot_settings").select("*").eq("id", 1).single().execute()
        return {"status": "ok", "settings": res.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/settings")
async def save_settings(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        # Avoid updating id
        if "id" in payload:
            del payload["id"]
        
        db.table("bot_settings").update(payload).eq("id", 1).execute()
        
        # Invalidate cache locally
        from config.dynamic_settings import _cache
        _cache.clear()
        
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
