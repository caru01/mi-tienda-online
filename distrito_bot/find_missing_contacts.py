import sys, asyncio, httpx, logging
sys.path.append(r'e:\RESPALDO PC CAMILO\Documentos\mi-tienda-online\distrito_bot')

from config.dynamic_settings import get_ycloud_api_key
from services.supabase_client import get_supabase

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

YCLOUD_API_BASE = "https://api.ycloud.com/v2"

async def get_all_ycloud_contacts():
    api_key = get_ycloud_api_key()
    if not api_key:
        logger.error("No YCloud API key found.")
        return set()

    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key,
    }

    ycloud_phones = set()
    page = 1
    limit = 100

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            logger.info(f"Fetching YCloud contacts page {page}...")
            url = f"{YCLOUD_API_BASE}/contact/contacts?page={page}&limit={limit}"
            response = await client.get(url, headers=headers)
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch YCloud contacts: {response.status_code} {response.text}")
                break
                
            data = response.json()
            items = data.get("items", [])
            
            if not items:
                break
                
            for item in items:
                phone = item.get("phoneNumber")
                if phone:
                    ycloud_phones.add(phone)
            
            if len(items) < limit:
                break
            
            page += 1

    return ycloud_phones

def get_all_supabase_customers():
    db = get_supabase()
    supabase_phones = set()
    
    # Supabase REST API has a limit of 1000 rows by default, we need to paginate if necessary
    # For simplicity, we'll fetch all using a loop
    offset = 0
    limit = 1000
    while True:
        res = db.table("customers").select("customer_phone").range(offset, offset + limit - 1).execute()
        data = res.data or []
        if not data:
            break
            
        for row in data:
            phone = row.get("customer_phone")
            if phone:
                supabase_phones.add(phone)
                
        if len(data) < limit:
            break
        offset += limit
        
    return supabase_phones

async def main():
    logger.info("Starting extraction...")
    
    ycloud_phones = await get_all_ycloud_contacts()
    logger.info(f"Total contacts found in YCloud: {len(ycloud_phones)}")
    
    supabase_phones = get_all_supabase_customers()
    logger.info(f"Total customers found in Supabase: {len(supabase_phones)}")
    
    missing_in_supabase = ycloud_phones - supabase_phones
    
    logger.info(f"Found {len(missing_in_supabase)} numbers in YCloud that are NOT in Supabase.")
    
    with open("missing_numbers.txt", "w") as f:
        for phone in missing_in_supabase:
            f.write(f"{phone}\n")
            
    logger.info("Saved missing numbers to missing_numbers.txt")

if __name__ == "__main__":
    asyncio.run(main())
