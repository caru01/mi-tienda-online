import asyncio
import os
import sys

# Asegurar que se puede importar desde la raiz
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from modules.order_flow import handle_customer_message
from services.supabase_client import get_supabase
import services.ycloud_client

# Mock YCloud client to prevent sending real messages during tests
sent_messages = []

async def mock_send_text_message(to: str, text: str):
    print(f"\n[BOT -> {to} (TEXT)]:\n{text}\n" + "-"*40)
    sent_messages.append({"to": to, "type": "text", "content": text})

async def mock_send_button_message(to: str, body_text: str, buttons: list):
    print(f"\n[BOT -> {to} (BUTTONS)]:\n{body_text}")
    print(f"Botones: {[b['title'] for b in buttons]}\n" + "-"*40)
    sent_messages.append({"to": to, "type": "buttons", "content": body_text, "buttons": buttons})

async def mock_send_list_message(to: str, body_text: str, button_text: str, sections: list):
    print(f"\n[BOT -> {to} (LIST)]:\n{body_text}")
    for sec in sections:
        print(f" Sección: {sec.get('title')}")
        for row in sec.get('rows', []):
            print(f"  - {row.get('title')}: {row.get('description')}")
    print("-"*40)
    sent_messages.append({"to": to, "type": "list", "content": body_text})

# Inject mocks
services.ycloud_client.send_text_message = mock_send_text_message
services.ycloud_client.send_button_message = mock_send_button_message
services.ycloud_client.send_list_message = mock_send_list_message

TEST_PHONE = "+579990000000" # Numero falso de prueba

async def simulate_message(body: str = None, interactive_type: str = None, interactive_id: str = None, interactive_title: str = None):
    msg_type = "TEXT" if body else interactive_type.upper()
    print(f"\n[CLIENTE -> BOT ({msg_type})]: {body or interactive_title}")
    await handle_customer_message(
        TEST_PHONE, 
        body=body, 
        interactive_type=interactive_type, 
        interactive_id=interactive_id, 
        interactive_title=interactive_title
    )
    # Dar tiempo a que el async responda
    await asyncio.sleep(0.5)

async def run_test_scenario():
    db = get_supabase()
    
    print("=== INICIANDO PRUEBA END-TO-END DE CONVERSACIÓN ===")
    
    # 1. Limpiar estado previo si existe
    db.table("conversation_sessions").delete().eq("customer_phone", TEST_PHONE).execute()
    db.table("sales").delete().eq("customer_phone", TEST_PHONE).execute()
    db.table("messages").delete().eq("customer_phone", TEST_PHONE).execute()

    # 2. Saludo inicial
    await simulate_message(body="Hola")
    
    # 3. Ver Combos
    await simulate_message(interactive_type="button_reply", interactive_id="ver_combos", interactive_title="Ver Combos")
    
    # 4. Seleccionar un combo (Asumiendo que hay un producto activo llamado "combo1" o extraemos uno dinamicamente)
    res = db.table("products").select("id, name").eq("is_active", True).limit(1).execute()
    if not res.data:
        print("CRITICAL ERROR: No hay productos activos en la base de datos.")
        return
        
    product_id = res.data[0]["id"]
    product_name = res.data[0]["name"]
    
    await simulate_message(interactive_type="list_reply", interactive_id=f"prod_{product_id}", interactive_title=product_name)
    
    # 5. Elegir cantidad
    await simulate_message(body="2")
    
    # 6. Desea agregar algo mas? NO
    await simulate_message(interactive_type="button_reply", interactive_id="checkout", interactive_title="No, terminar")
    
    # 7. Opciones de entrega -> Domicilio
    await simulate_message(interactive_type="button_reply", interactive_id="delivery_domicilio", interactive_title="Domicilio")
    
    # 8. Nombre
    await simulate_message(body="Test User")
    
    # 9. Direccion
    await simulate_message(body="Calle Falsa 123")
    
    # 10. Barrio
    await simulate_message(body="Barrio de Pruebas")
    
    # 11. Medio de pago -> Nequi
    await simulate_message(interactive_type="button_reply", interactive_id="pago_nequi", interactive_title="Nequi")

    print("\n=== VERIFICACIÓN EN BASE DE DATOS ===")
    sales_res = db.table("sales").select("*").eq("customer_phone", TEST_PHONE).execute()
    if sales_res.data:
        print("Venta guardada exitosamente:", sales_res.data[0])
    else:
        print("ANOMALÍA: No se guardó la venta en la base de datos.")
        
    print("\nPRUEBA FINALIZADA.")

if __name__ == "__main__":
    asyncio.run(run_test_scenario())
