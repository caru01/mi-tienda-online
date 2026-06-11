import sys
sys.path.append('Z:/RESPALDO PC CAMILO/Documentos/mi-tienda-online/distrito_bot')
from services.supabase_client import get_supabase
db = get_supabase()

try:
    # Try fetching a row from customers
    res = db.table('customers').select('*').limit(1).execute()
    print("CUSTOMERS TABLE EXISTS:", res.data)
except Exception as e:
    print("CUSTOMERS TABLE ERROR:", e)

try:
    res = db.table('crm_campaigns').select('*').limit(1).execute()
    print("CRM_CAMPAIGNS TABLE EXISTS:", res.data)
except Exception as e:
    print("CRM_CAMPAIGNS TABLE ERROR:", e)
