import sys, asyncio, json
sys.path.append(r'Z:\RESPALDO PC CAMILO\Documentos\mi-tienda-online\distrito_bot')
from api.dashboard import get_crm_customers
import nest_asyncio
nest_asyncio.apply()

async def main():
    try:
        res = await get_crm_customers()
        with open('crm_test_output.json', 'w') as f:
            json.dump(res, f)
    except Exception as e:
        with open('crm_test_output.json', 'w') as f:
            json.dump({'status': 'error', 'message': str(e)}, f)

asyncio.run(main())
