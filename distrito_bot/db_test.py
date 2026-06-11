import sys, asyncio, json
sys.path.append(r'Z:\RESPALDO PC CAMILO\Documentos\mi-tienda-online\distrito_bot')
from services.supabase_client import get_supabase

db = get_supabase()
try:
    res = db.table('customers').select('*').limit(1).execute()
    data = res.data
    with open('db_test_output.json', 'w') as f:
        json.dump({'status': 'success', 'data': data}, f)
except Exception as e:
    with open('db_test_output.json', 'w') as f:
        json.dump({'status': 'error', 'message': str(e)}, f)
