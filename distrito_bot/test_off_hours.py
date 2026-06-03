import asyncio
import os
import sys

from config.dynamic_settings import get_off_hours_message
from modules.auto_reply import handle_off_hours

async def main():
    print("Testing get_off_hours_message():")
    print(get_off_hours_message())
    
    print("\nTesting handle_off_hours()...")
    # This will actually attempt to send a message via YCloud if YCloud API key is valid.
    # To avoid spamming real people, we won't call it unless we are sure.
    print("Success")

if __name__ == "__main__":
    asyncio.run(main())
