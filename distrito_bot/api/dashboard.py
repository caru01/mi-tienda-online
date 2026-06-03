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
    from datetime import datetime, timezone

    # Solo ventas de hoy para KPIs (liviano)
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    sales_today_res = db.table("sales").select("total_amount, payment_method, delivery_type, status").gte("created_at", f"{today}T00:00:00Z").execute()
    sales_today = sales_today_res.data or []
    total_revenue = sum([s.get("total_amount", 0) for s in sales_today])
    total_orders = len(sales_today)

    # Ultimas 200 ventas para historial y graficos (paginado)
    all_sales_res = db.table("sales").select("*").order("created_at", desc=True).limit(200).execute()

    # Obtener inventario
    inventory = db.table("inventory_items").select("*").execute()

    # Obtener catalogo
    products = db.table("products").select("*").execute()

    # Obtener ordenes activas (excluye entregadas y canceladas)
    active_sales_res = db.table("sales").select("*").not_.in_("status", ["entregado", "cancelado"]).order("created_at", desc=True).execute()

    return {
        "status": "ok",
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "inventory": inventory.data or [],
        "products": products.data or [],
        "active_sales": active_sales_res.data or [],
        "all_sales": all_sales_res.data or []
    }

@router.get("/api/dashboard/purchases")
async def get_purchases() -> Dict[str, Any]:
    db = get_supabase()
    try:
        # We need the item name too, Supabase allows joins: purchases!inner(inventory_item_id), inventory_items(name)
        res = db.table("purchases").select("*, inventory_items(name, unit_measure)").order("purchase_date", desc=True).limit(100).execute()
        return {"status": "ok", "purchases": res.data or []}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/api/dashboard/purchases/stats")
async def get_purchases_stats() -> Dict[str, Any]:
    db = get_supabase()
    from datetime import datetime, timezone, timedelta
    try:
        # Get purchases from the last 30 days
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        res = db.table("purchases").select("*, inventory_items(name)").gte("purchase_date", cutoff).execute()
        
        purchases = res.data or []
        total_invested = sum([float(p.get("total_price", 0)) for p in purchases])
        
        # Most bought item
        item_totals = {}
        for p in purchases:
            item_name = p.get("inventory_items", {}).get("name", "Desconocido")
            item_totals[item_name] = item_totals.get(item_name, 0) + float(p.get("total_price", 0))
            
        most_bought_item = max(item_totals.items(), key=lambda x: x[1]) if item_totals else ("Ninguno", 0)
        
        return {
            "status": "ok",
            "total_invested_30d": total_invested,
            "most_bought_item": most_bought_item[0],
            "most_bought_item_total": most_bought_item[1]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/purchases")
async def register_purchase(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    item_id = payload.get("inventory_item_id")
    quantity = payload.get("quantity", 0)
    unit_price = payload.get("unit_price", 0)
    total_price = payload.get("total_price", 0)
    purchase_date = payload.get("purchase_date") # ISO format or None for now
    
    if not item_id or float(quantity) <= 0 or float(unit_price) < 0:
        return {"status": "error", "message": "Datos inválidos"}
        
    try:
        data_to_insert = {
            "inventory_item_id": item_id,
            "quantity": quantity,
            "unit_price": unit_price,
            "total_price": total_price
        }
        if purchase_date:
            data_to_insert["purchase_date"] = purchase_date
            
        # Registrar la compra financiera
        db.table("purchases").insert(data_to_insert).execute()
        
        # Registrar la transacción de inventario por retrocompatibilidad
        db.table("inventory_transactions").insert({
            "inventory_item_id": item_id,
            "quantity_change": quantity,
            "reason": "compra",
            "reference_id": "erp_dashboard"
        }).execute()
        
        # Actualizar stock actual
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

@router.post("/api/dashboard/products/add")
async def add_product(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        if "id" in payload:
            del payload["id"]
        if "category" not in payload or not payload["category"]:
            payload["category"] = "Combos"
            
        res = db.table("products").insert(payload).execute()
        return {"status": "success", "product": res.data[0]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/inventory/add")
async def add_inventory_item(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        if "id" in payload:
            del payload["id"]
        res = db.table("inventory_items").insert(payload).execute()
        return {"status": "success", "item": res.data[0]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/inventory/update")
async def update_inventory_item(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    item_id = payload.get("id")
    current_stock = payload.get("current_stock")
    try:
        res = db.table("inventory_items").update({"current_stock": current_stock}).eq("id", item_id).execute()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/orders/status")
async def update_order_status(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    order_id = payload.get("id")
    new_status = payload.get("status")
    customer_phone = payload.get("customer_phone")
    
    try:
        db.table("sales").update({"status": new_status}).eq("id", order_id).execute()
        
        if customer_phone:
            from services.ycloud_client import send_text_message
            from config.dynamic_settings import get_msg_order_accepted, get_msg_order_dispatched, get_msg_ready_pickup
            
            if new_status == "en_preparacion":
                msg = get_msg_order_accepted()
                await send_text_message(customer_phone, msg)
                
            elif new_status == "por_entregar":
                # Necesitamos saber si es recoger o domicilio
                order = db.table("sales").select("delivery_type").eq("id", order_id).single().execute()
                deliv = order.data.get("delivery_type", "") if order.data else ""
                
                if deliv == "recoger":
                    msg = get_msg_ready_pickup()
                else:
                    msg = get_msg_order_dispatched()
                    
                await send_text_message(customer_phone, msg)
            
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/api/dashboard/recipes")
async def get_recipes() -> Dict[str, Any]:
    db = get_supabase()
    try:
        res = db.table("recipe_ingredients").select("*").execute()
        return {"status": "ok", "recipes": res.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/recipes")
async def save_recipe(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        product_id = payload.get("product_id")
        ingredients = payload.get("ingredients", [])
        
        if not product_id:
            return {"status": "error", "message": "product_id is required"}
            
        # Delete old recipe for this product
        db.table("recipe_ingredients").delete().eq("product_id", product_id).execute()
        
        # Insert new recipe if there are ingredients
        if ingredients:
            # Prepare data
            insert_data = []
            for item in ingredients:
                insert_data.append({
                    "product_id": product_id,
                    "inventory_item_id": item["inventory_item_id"],
                    "quantity_required": item["quantity_required"]
                })
            db.table("recipe_ingredients").insert(insert_data).execute()
            
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
