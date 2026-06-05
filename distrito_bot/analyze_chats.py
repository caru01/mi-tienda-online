import os
import sys
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Missing SUPABASE_URL or SUPABASE_KEY")
    sys.exit(1)

supabase: Client = create_client(url, key)

try:
    two_months_ago = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
    
    # Numeros unicos en tabla conversation_sessions (todos los que interactuaron)
    res_sessions = supabase.table("conversation_sessions").select("customer_phone, updated_at").gte("updated_at", two_months_ago).execute()
    print(f"Total de numeros unicos que han interactuado con el bot en los ultimos 2 meses: {len(res_sessions.data)}")

    # De esos, cuántos se convirtieron en clientes reales en los ultimos 2 meses?
    res_customers = supabase.table("customers").select("customer_phone").gte("last_order_at", two_months_ago).execute()
    print(f"Total de clientes activos (compraron) en los ultimos 2 meses: {len(res_customers.data)}")
    
    # Cuántos pedidos en total en los últimos 2 meses
    res_sales = supabase.table("sales").select("id").gte("created_at", two_months_ago).execute()
    print(f"Total de pedidos realizados por todos los clientes en los ultimos 2 meses: {len(res_sales.data)}")

except Exception as e:
    print(f"Error querying Supabase: {e}")
