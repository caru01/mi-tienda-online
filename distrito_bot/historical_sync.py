import asyncio
import logging
import time
from datetime import datetime, timedelta, timezone
import httpx
from services.supabase_client import get_supabase
from config.dynamic_settings import get_ycloud_api_key

logger = logging.getLogger(__name__)

YCLOUD_MESSAGES_ENDPOINT = "https://api.ycloud.com/v1/whatsapp/messages"
PAGE_SIZE = 100
SLEEP_SECONDS = 0.5  # rate‑limit pause

async def fetch_page(session: httpx.AsyncClient, params: dict) -> dict:
    response = await session.get(YCLOUD_MESSAGES_ENDPOINT, params=params)
    response.raise_for_status()
    return response.json()

async def process_message(msg: dict, db):
    # Determine phone (from inbound/outbound direction)
    phone = msg.get("from") or msg.get("to")
    if not phone:
        return
    # Optional fields
    name = msg.get("profile_name") or ""
    address = msg.get("address") or ""
    timestamp = msg.get("timestamp")  # assume ISO format or epoch seconds
    # Convert to ISO if needed
    if isinstance(timestamp, (int, float)):
        ts_iso = datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()
    else:
        ts_iso = timestamp
    # Upsert into customers
    data = {
        "customer_phone": phone,
        "customer_name": name,
        "whatsapp_label": phone,
        "first_order_at": ts_iso,
        "last_order_at": ts_iso,
        "total_orders": 1,
        "notes": "",
        "direccion_frecuente": address,
        "fecha_registro": ts_iso,
        "categoria": "Nuevo",
        "total_pedidos": 1,
    }
    # on_conflict will update the row, but keep existing values for fields we don't want to overwrite
    db.table("customers").upsert(data, on_conflict="customer_phone").execute()
    logger.info(f"✅ Inserted/updated customer {phone}")

async def main():
    db = get_supabase()
    async with httpx.AsyncClient(timeout=30.0, headers={"X-API-Key": get_ycloud_api_key()}) as client:
        start_date = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%d")
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        next_page = None
        while True:
            params = {
                "page_size": PAGE_SIZE,
                "start_date": start_date,
                "end_date": end_date,
            }
            if next_page:
                params["next_page"] = next_page
            try:
                data = await fetch_page(client, params)
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    logger.warning("Rate limit hit, sleeping 5 seconds...")
                    await asyncio.sleep(5)
                    continue
                else:
                    logger.error(f"Failed to fetch YCloud messages: {e}")
                    break
            messages = data.get("messages", [])
            for msg in messages:
                await process_message(msg, db)
                time.sleep(SLEEP_SECONDS)  # respect YCloud & Supabase limits
            next_page = data.get("next_page")
            if not next_page:
                break
    logger.info("✅ Historical sync completed.")

if __name__ == "__main__":
    asyncio.run(main())
