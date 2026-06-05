import asyncio
from services.supabase_client import get_supabase

async def check_tables():
    db = get_supabase()
    tables = [
        "inventory_items",
        "inventory_transactions",
        "purchases",
        "recipe_ingredients",
        "products"
    ]
    
    print("Verificando tablas de la base de datos...")
    for table in tables:
        try:
            res = db.table(table).select("*").limit(1).execute()
            print(f"✅ Tabla '{table}' existe y funciona.")
        except Exception as e:
            print(f"❌ Error en tabla '{table}': {e}")

if __name__ == "__main__":
    asyncio.run(check_tables())
