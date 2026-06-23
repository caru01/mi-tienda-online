from fastapi import APIRouter
from services.supabase_client import get_supabase
from typing import Dict, Any

router = APIRouter()

# ==========================================
# ENDPOINTS PARA LA APP DE PEDIDOS (Frontend)
# ==========================================

@router.get("/api/pedidos/init")
async def get_pedidos_init_data() -> Dict[str, Any]:
    """
    Endpoint principal para la App de Pedidos.
    Devuelve la configuración (números de WS, Nequi) y la lista de productos activos.
    """
    db = get_supabase()
    try:
        # Obtener configuración de la App de pedidos
        settings_res = db.table("pedidos_app_settings").select("*").eq("id", 1).single().execute()
        settings = settings_res.data or {}
        
        # Obtener configuración general (Horarios)
        bot_settings_res = db.table("settings").select("open_time,close_time,business_days,is_open_manual").eq("id", 1).single().execute()
        if bot_settings_res.data:
            settings.update(bot_settings_res.data)
        
        # Obtener productos activos
        products_res = db.table("pedidos_app_products").select("*").eq("is_active", True).execute()
        products = products_res.data or []
        
        return {
            "status": "ok",
            "settings": settings,
            "products": products
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/pedidos/checkout")
async def process_checkout(payload: dict) -> Dict[str, Any]:
    """
    Recibe la orden desde la App de Pedidos, la registra en 'sales' 
    y actualiza/crea al cliente en 'customers'.
    """
    db = get_supabase()
    try:
        from datetime import datetime, timezone
        now_str = datetime.now(timezone.utc).isoformat()
        
        customer = payload.get("customer", {})
        cart = payload.get("cart", [])
        total = payload.get("total", 0)
        
        phone = customer.get("phone", "").strip()
        name = customer.get("name", "").strip()
        
        # 1. UPSERT Customer
        if phone:
            cust_res = db.table("customers").select("*").eq("customer_phone", phone).execute()
            if cust_res.data:
                existing = cust_res.data[0]
                new_total_orders = existing.get("total_orders", 0) + 1
                new_total_spent = float(existing.get("total_spent", 0)) + float(total)
                db.table("customers").update({
                    "customer_name": name,
                    "last_order_at": now_str,
                    "total_orders": new_total_orders,
                    "total_spent": new_total_spent
                }).eq("customer_phone", phone).execute()
            else:
                db.table("customers").insert({
                    "customer_phone": phone,
                    "customer_name": name,
                    "first_seen_at": now_str,
                    "last_order_at": now_str,
                    "total_orders": 1,
                    "total_spent": float(total),
                    "tags": ""
                }).execute()
        
        # 2. INSERT Sale
        delivery_type = customer.get("deliveryType", "domicilio")
        payment_method = customer.get("paymentMethod", "efectivo")
        
        db.table("sales").insert({
            "customer_phone": phone,
            "customer_name": name,
            "total_amount": float(total),
            "payment_method": payment_method,
            "delivery_type": delivery_type,
            "status": "pendiente",
            "order_detail": cart,
            "created_at": now_str
        }).execute()
        
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# ENDPOINTS PARA EL DASHBOARD (Administración)
# ==========================================

@router.get("/api/dashboard/pedidos/settings")
async def get_pedidos_settings() -> Dict[str, Any]:
    db = get_supabase()
    try:
        res = db.table("pedidos_app_settings").select("*").eq("id", 1).single().execute()
        return {"status": "ok", "settings": res.data or {}}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/pedidos/settings")
async def update_pedidos_settings(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        db.table("pedidos_app_settings").update(payload).eq("id", 1).execute()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/api/dashboard/pedidos/products")
async def get_pedidos_products() -> Dict[str, Any]:
    db = get_supabase()
    try:
        res = db.table("pedidos_app_products").select("*").order("created_at", desc=False).execute()
        return {"status": "ok", "products": res.data or []}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/pedidos/products")
async def save_pedidos_product(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        product_id = payload.get("id")
        
        if product_id:
            # Update
            update_data = {k: v for k, v in payload.items() if k != "id" and k != "created_at"}
            res = db.table("pedidos_app_products").update(update_data).eq("id", product_id).execute()
        else:
            # Insert
            res = db.table("pedidos_app_products").insert(payload).execute()
            
        return {"status": "success", "product": res.data[0] if res.data else None}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/pedidos/products/delete")
async def delete_pedidos_product(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        product_id = payload.get("id")
        if not product_id:
            return {"status": "error", "message": "Missing product id"}
        db.table("pedidos_app_products").delete().eq("id", product_id).execute()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
