import asyncio, httpx
from config.dynamic_settings import get_ycloud_api_key

async def main():
    api_key = get_ycloud_api_key()
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
    
    async with httpx.AsyncClient() as client:
        r = await client.get('https://api.ycloud.com/v2/contact/contacts?limit=5', headers=headers)
        data = r.json()
        items = data.get("items", [])
        if items:
            print("Fields available in contact object:", list(items[0].keys()))
            print("Sample contact:", items[0])
        else:
            print("No items found.")

if __name__ == "__main__":
    asyncio.run(main())
