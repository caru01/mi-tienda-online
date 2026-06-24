"""
api/dashboard.py
Endpoints para el Dashboard Web.
"""
from fastapi import APIRouter, File, UploadFile
from services.supabase_client import get_supabase
from typing import Dict, Any

router = APIRouter()

@router.get("/api/dashboard/stats")
async def get_dashboard_stats() -> Dict[str, Any]:
    db = get_supabase()
    from datetime import datetime, timezone
    from config.dynamic_settings import is_restaurant_open

    # Solo ventas de hoy para KPIs (liviano)
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    sales_today_res = db.table("sales").select("total_amount, payment_method, delivery_type, status, raw_message").gte("created_at", f"{today}T00:00:00Z").execute()
    # Filtrar solo las de la App (raw_message is null)
    sales_today = [s for s in (sales_today_res.data or []) if s.get("raw_message") is None]
    
    total_revenue = sum([s.get("total_amount", 0) for s in sales_today])
    total_orders = len(sales_today)

    # Ultimas 200 ventas para historial y graficos (paginado)
    all_sales_res = db.table("sales").select("*").is_("raw_message", "null").order("created_at", desc=True).limit(200).execute()

    # Obtener inventario
    inventory = db.table("inventory_items").select("*").execute()

    # Obtener catalogo
    products = db.table("products").select("*").execute()

    # Obtener pedidos pendientes/en preparación (solo de la App)
    active_sales_res = db.table("sales").select("*").is_("raw_message", "null").not_.in_("status", ["entregado", "cancelado"]).order("created_at", desc=True).execute()

    return {
        "status": "ok",
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "inventory": inventory.data or [],
        "products": products.data or [],
        "active_sales": active_sales_res.data or [],
        "all_sales": all_sales_res.data or [],
        "is_store_open": is_restaurant_open()
    }

@router.get("/api/dashboard/recovery-stats")
async def get_recovery_stats() -> Dict[str, Any]:
    db = get_supabase()
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    try:
        # Pedidos Confirmados: Ventas creadas hoy
        sales_res = db.table("sales").select("id").is_("raw_message", "null").gte("created_at", f"{today}T00:00:00Z").execute()
        confirmados = len(sales_res.data or [])

        # Pedidos Abandonados y Recuperados: de abandoned_orders_log
        log_res = db.table("abandoned_orders_log").select("*").gte("created_at", f"{today}T00:00:00Z").execute()
        logs = log_res.data or []
        
        abandonados = len(logs)
        recuperados = len([log for log in logs if log.get("status") == "recovered"])
        
        # Pedidos Iniciados
        # Podemos estimarlo como confirmados + abandonados - recuperados 
        # (ya que los recuperados terminan siendo confirmados o siguen pendientes, pero empezaron como abandonados).
        # Por simplicidad, "Iniciados" = Confirmados + Abandonados que no se recuperaron.
        iniciados = confirmados + (abandonados - recuperados)
        
        tasa = 0
        if abandonados > 0:
            tasa = round((recuperados / abandonados) * 100, 1)
            
        return {
            "status": "ok",
            "stats": {
                "iniciados": iniciados,
                "confirmados": confirmados,
                "abandonados": abandonados,
                "recuperados": recuperados,
                "tasa": tasa
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/api/dashboard/sales/history")
async def get_sales_history(start_date: str = None, end_date: str = None) -> Dict[str, Any]:
    db = get_supabase()
    try:
        query = db.table("sales").select("*")
        if start_date:
            query = query.gte("created_at", f"{start_date}T00:00:00Z")
        if end_date:
            query = query.lte("created_at", f"{end_date}T23:59:59Z")
            
        # Solo devolvemos los finalizados / cancelados, ordenados, y SOLO de la App
        query = query.is_("raw_message", "null").in_("status", ["entregado", "cancelado"]).order("created_at", desc=True)
        res = query.execute()
        
        return {"status": "ok", "sales": res.data or []}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/api/dashboard/categories")
async def get_categories() -> Dict[str, Any]:
    """Devuelve todas las categorías de productos activos con su estado (visible/oculta en bienvenida)."""
    db = get_supabase()
    try:
        # Obtener todas las categorías únicas de productos activos
        res = db.table("products").select("category").eq("is_active", True).execute()
        cats = sorted({row["category"] for row in (res.data or []) if row.get("category")})

        # Obtener categorías ocultas
        settings_res = db.table("bot_settings").select("welcome_hidden_categories").eq("id", 1).single().execute()
        hidden_raw = (settings_res.data or {}).get("welcome_hidden_categories", "") or ""
        hidden = {c.strip() for c in hidden_raw.split(",") if c.strip()}

        categories = [{"name": c, "visible": c not in hidden} for c in cats]
        return {"status": "ok", "categories": categories}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/categories/toggle")
async def toggle_category_visibility(payload: dict) -> Dict[str, Any]:
    """Activa o desactiva una categoría del mensaje de bienvenida."""
    db = get_supabase()
    try:
        category = payload.get("category", "").strip()
        visible = payload.get("visible", True)

        # Leer estado actual
        res = db.table("bot_settings").select("welcome_hidden_categories").eq("id", 1).single().execute()
        hidden_raw = (res.data or {}).get("welcome_hidden_categories", "") or ""
        hidden = {c.strip() for c in hidden_raw.split(",") if c.strip()}

        if visible:
            hidden.discard(category)
        else:
            hidden.add(category)

        new_hidden = ",".join(sorted(hidden))
        db.table("bot_settings").update({"welcome_hidden_categories": new_hidden}).eq("id", 1).execute()

        # Invalidar caché
        from config.dynamic_settings import clear_cache
        clear_cache()

        return {"status": "ok", "hidden_categories": list(hidden)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/api/dashboard/purchases")
async def get_purchases() -> Dict[str, Any]:
    db = get_supabase()
    try:
        # We need the item name too, Supabase allows joins: purchases!inner(inventory_item_id), inventory_items(name)
        res = db.table("purchases").select("*, inventory_items(name, unit)").order("purchase_date", desc=True).limit(100).execute()
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
    
    supplier = payload.get("supplier")
    
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
        if supplier:
            data_to_insert["supplier"] = supplier
            
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
        from config.dynamic_settings import is_restaurant_open
        res = db.table("bot_settings").select("*").eq("id", 1).single().execute()
        return {
            "status": "ok",
            "settings": res.data,
            "is_store_open": is_restaurant_open()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/settings")
async def save_settings(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        # Avoid updating id
        if "id" in payload:
            del payload["id"]
        
        # ── PROTECCIÓN CRÍTICA: No sobrescribir credenciales vacías ──
        # Si el usuario guarda estos campos en blanco, NO los pisamos
        # (así evitamos borrar las credenciales reales por error en el UI)
        PROTECTED_IF_EMPTY = ["ycloud_api_key", "whatsapp_phone_id", "whatsapp_token"]
        for field in PROTECTED_IF_EMPTY:
            val = payload.get(field, None)
            if val is not None and str(val).strip() == "":
                del payload[field]
                
        db.table("bot_settings").update(payload).eq("id", 1).execute()
        
        # Invalidate cache locally
        from config.dynamic_settings import clear_cache, is_restaurant_open
        clear_cache()
        
        return {
            "status": "success",
            "is_store_open": is_restaurant_open()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/products/add")
async def add_product(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        import uuid
        payload["id"] = uuid.uuid4().hex
        
        if "category" not in payload or not payload["category"]:
            payload["category"] = "Combos"
            
        # Intentar remover emoji si no existe la columna en DB
        # Para evitar el error de Supabase si la tabla products no tiene emoji
        try:
            res = db.table("products").insert(payload).execute()
        except Exception as insert_e:
            if "emoji" in payload and "does not exist" in str(insert_e).lower():
                del payload["emoji"]
                res = db.table("products").insert(payload).execute()
            else:
                raise insert_e

        return {"status": "success", "product": res.data[0]}
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error agregando producto: {e}")
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/products/update")
async def update_product(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        product_id = payload.get("id")
        if not product_id:
            return {"status": "error", "message": "Missing product id"}
        update_data = {k: v for k, v in payload.items() if k != "id"}
        
        try:
            db.table("products").update(update_data).eq("id", product_id).execute()
        except Exception as update_e:
            if "emoji" in update_data and "does not exist" in str(update_e).lower():
                del update_data["emoji"]
                db.table("products").update(update_data).eq("id", product_id).execute()
            else:
                raise update_e
                
        return {"status": "success"}
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error actualizando producto: {e}")
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/products/delete")
async def delete_product(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        product_id = payload.get("product_id")
        if not product_id:
            return {"status": "error", "message": "Missing product_id"}
        db.table("products").delete().eq("id", product_id).execute()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/inventory/add")
async def add_inventory_item(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        if "id" in payload:
            del payload["id"]
        res = db.table("inventory_items").insert(payload).execute()
        return {"status": "success", "item": res.data[0] if res.data else None}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/inventory/update")
async def update_inventory_item(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    item_id = payload.get("id")
    update_data = {}
    if "current_stock" in payload:
        update_data["current_stock"] = payload.get("current_stock")
    if "minimum_stock" in payload:
        update_data["minimum_stock"] = payload.get("minimum_stock")
    try:
        res = db.table("inventory_items").update(update_data).eq("id", item_id).execute()
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
            from config.dynamic_settings import get_msg_order_accepted, get_msg_order_dispatched, get_msg_ready_pickup, get_msg_order_delivered
            
            # Fetch customer_name, delivery_type and order_detail
            order_res = db.table("sales").select("customer_name, delivery_type, order_detail").eq("id", order_id).single().execute()
            customer_name = order_res.data.get("customer_name", "") if order_res.data else ""
            deliv = order_res.data.get("delivery_type", "") if order_res.data else ""
            
            if new_status == "en_preparacion":
                msg = get_msg_order_accepted().replace("{cliente}", customer_name)
                await send_text_message(customer_phone, msg)
                
            elif new_status == "por_entregar":
                if deliv == "recoger":
                    msg = get_msg_ready_pickup().replace("{cliente}", customer_name)
                else:
                    msg = get_msg_order_dispatched().replace("{cliente}", customer_name)
                    
                await send_text_message(customer_phone, msg)
                
            elif new_status == "entregado":
                msg = get_msg_order_delivered()
                await send_text_message(customer_phone, msg)
                
                # Descontar inventario automáticamente cuando se entrega
                import re
                from modules.inventory_manager import deduct_inventory_for_order
                order_detail = order_res.data.get("order_detail", "") if order_res.data else ""
                for line in order_detail.split('\n'):
                    match = re.search(r"(\d+)x\s+(.+?)\s+—", line)
                    if match:
                        qty = int(match.group(1))
                        c_name = match.group(2).strip()
                        prod_res = db.table("products").select("id").eq("name", c_name).execute()
                        if prod_res.data:
                            c_id = prod_res.data[0]["id"]
                            await deduct_inventory_for_order(c_id, qty, customer_phone)
            
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

# ── CRM Endpoints ────────────────────────────────────────────────────────────

@router.get("/api/dashboard/crm/customers")
async def get_crm_customers() -> Dict[str, Any]:
    db = get_supabase()
    try:
        res = db.table("customers").select("*").order("last_order_at", desc=True).execute()
        
        # Calculate messages sent today for limits
        from datetime import datetime, timezone
        today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        campaigns_res = db.table("crm_campaigns").select("sent_count").gte("created_at", f"{today_str}T00:00:00Z").execute()
        messages_sent_today = sum([c.get("sent_count", 0) for c in (campaigns_res.data or [])])
        
        return {"status": "ok", "customers": res.data or [], "messages_sent_today": messages_sent_today}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/crm/customers/notes")
async def update_customer_notes(payload: dict) -> Dict[str, Any]:
    db = get_supabase()
    try:
        phone = payload.get("customer_phone")
        notes = payload.get("notes", "")
        if not phone:
            return {"status": "error", "message": "Falta el teléfono del cliente"}
        
        db.table("customers").update({"notes": notes}).eq("customer_phone", phone).execute()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

from fastapi import BackgroundTasks

async def _run_broadcast_task(campaign_name: str, message_body: str, target_segment: str, image_url: str, interval: float, customers: list):
    from services.ycloud_client import send_text_message, send_image_message
    import asyncio
    import logging
    from services.supabase_client import get_supabase
    
    logger = logging.getLogger(__name__)
    db = get_supabase()
    sent_count = 0
    
    for c in customers:
        phone = c.get("customer_phone")
        if phone:
            try:
                if image_url:
                    await send_image_message(phone, image_url)
                if message_body:
                    await send_text_message(phone, message_body)
                sent_count += 1
                await asyncio.sleep(interval) # Intervalo para evitar spam
            except Exception as ex:
                logger.error(f"Error enviando broadcast a {phone}: {ex}")

    # Registrar la campaña al finalizar
    try:
        db.table("crm_campaigns").insert({
            "campaign_name": campaign_name,
            "message_body": message_body,
            "target_segment": target_segment,
            "sent_count": sent_count,
            "status": "completed"
        }).execute()
    except Exception as e:
        logger.error(f"Error guardando crm_campaigns: {e}")

@router.post("/api/dashboard/crm/broadcast")
async def send_crm_broadcast(payload: dict, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """Envía un mensaje masivo a un segmento de clientes y registra la campaña."""
    db = get_supabase()
    try:
        campaign_name = payload.get("campaign_name", "Campaña sin nombre")
        message_body = payload.get("message_body", "")
        target_segment = payload.get("target_segment", "all")
        
        image_url = payload.get("image_url", "").strip()
        interval = float(payload.get("interval", 2.0))

        if not message_body and not image_url:
            return {"status": "error", "message": "El mensaje o la imagen no pueden estar vacíos."}

        # Obtener los clientes según el segmento
        customers = []
        if target_segment == "custom_numbers":
            raw_text = payload.get("custom_numbers_text", "")
            import re
            matches = re.findall(r'\+?\d{7,15}', raw_text)
            
            unique_phones = set()
            for m in matches:
                clean = m.strip()
                if not clean.startswith('+'):
                    clean = "+" + clean
                unique_phones.add(clean)
                
            customers = [{"customer_phone": p} for p in unique_phones]
            
            # Guardar en base de datos si no existen
            from datetime import datetime, timezone
            now_iso = datetime.now(timezone.utc).isoformat()
            
            if unique_phones:
                try:
                    existing_res = db.table("customers").select("customer_phone").in_("customer_phone", list(unique_phones)).execute()
                    existing_phones = {row["customer_phone"] for row in (existing_res.data or [])}
                    
                    new_inserts = []
                    for p in unique_phones:
                        if p not in existing_phones:
                            new_inserts.append({
                                "customer_phone": p,
                                "customer_name": "",
                                "total_orders": 0,
                                "first_order_at": now_iso,
                                "last_interaction_at": now_iso,
                                "whatsapp_label": p,
                                "notes": "Agregado via campaña manual"
                            })
                    if new_inserts:
                        db.table("customers").insert(new_inserts).execute()
                except Exception as ex:
                    import logging
                    logging.getLogger(__name__).error(f"Error guardando nuevos números: {ex}")
        else:
            query = db.table("customers").select("customer_phone, total_orders, last_order_at")
            
            if target_segment == "vip":
                query = query.gte("total_orders", 5)
            elif target_segment == "dormant":
                # Más de 30 días sin interactuar (mensajes)
                from datetime import datetime, timedelta, timezone
                thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
                query = query.lte("last_interaction_at", thirty_days_ago)
            elif target_segment == "new":
                # Solo 1 compra
                query = query.eq("total_orders", 1)
                
            res = query.execute()
            customers = res.data or []
        
        if not customers:
            return {"status": "error", "message": "No hay clientes en este segmento."}

        # Lanzar envío en segundo plano para evitar timeout de HTTP
        background_tasks.add_task(
            _run_broadcast_task, 
            campaign_name, 
            message_body, 
            target_segment, 
            image_url, 
            interval, 
            customers
        )
        
        return {"status": "success", "sent_count": len(customers), "message": "Campaña iniciada en segundo plano."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/dashboard/crm/upload")
async def upload_crm_image(file: UploadFile = File(...)) -> Dict[str, Any]:
    db = get_supabase()
    try:
        import uuid
        import os
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1]
        if not file_ext:
            file_ext = ".jpg"
        file_name = f"{uuid.uuid4().hex}{file_ext}"
        
        # Subir a supabase storage (requiere bucket publico crm_assets)
        db.storage.from_("crm_assets").upload(
            file_name, 
            content, 
            {"content-type": file.content_type}
        )
        
        # Obtener url publica
        public_url = db.storage.from_("crm_assets").get_public_url(file_name)
        
        return {"status": "success", "url": public_url}
    except Exception as e:
        return {"status": "error", "message": str(e)}
