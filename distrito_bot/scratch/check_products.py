import sys
sys.path.append('Z:/RESPALDO PC CAMILO/Documentos/mi-tienda-online/distrito_bot')
from services.supabase_client import get_supabase
db = get_supabase()

try:
    res = db.table('products').insert({'name': 'Test2', 'description': 'Test2', 'price': 1000, 'category': 'Combos', 'is_active': True}).execute()
    print("SUCCESS INSERT:", res.data)
except Exception as e:
    import traceback
    traceback.print_exc()
    print("ERROR INSERT:", e)

