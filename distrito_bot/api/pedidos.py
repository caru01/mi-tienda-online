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
        # Obtener configuración
        settings_res = db.table("pedidos_app_settings").select("*").eq("id", 1).single().execute()
        settings = settings_res.data or {}
        
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
