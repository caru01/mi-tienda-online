import asyncio, httpx
from config.dynamic_settings import get_ycloud_api_key

async def main():
    api_key = get_ycloud_api_key()
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
    
    async with httpx.AsyncClient() as client:
        r = await client.get('https://api.ycloud.com/v2/whatsapp/messages?limit=5', headers=headers)
        print("Status:", r.status_code)
        print("Response:", r.json())

if __name__ == "__main__":
    asyncio.run(main())
