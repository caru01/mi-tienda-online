import sys, asyncio
sys.path.append(r'Z:\RESPALDO PC CAMILO\Documentos\mi-tienda-online\distrito_bot')
import nest_asyncio
nest_asyncio.apply()

from api.dashboard import get_crm_customers

async def main():
    try:
        res = await get_crm_customers()
        print('RESULT:', res)
    except Exception as e:
        print('ERROR:', e)

asyncio.run(main())
