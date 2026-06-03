import sys
import traceback
import asyncio
from dotenv import load_dotenv

# Try to load environment
load_dotenv()

async def run_test():
    try:
        from config.dynamic_settings import _get_dynamic_settings
        print("Dynamic settings:", _get_dynamic_settings())
        
        from modules.order_flow import handle_customer_message
        print("Imported handle_customer_message")
        
        # We need to simulate the exact flow
        res = await handle_customer_message("+573235989590", body="Hola")
        print("Result:", res)
    except Exception as e:
        print("ERROR OCCURRED:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())
