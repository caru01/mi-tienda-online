import os
import json
import urllib.request
import urllib.parse
from datetime import datetime

url = "https://ucocsrbavnlglffwoviu.supabase.co/rest/v1/messages?select=created_at,direction,body&order=created_at.desc&limit=15"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjb2NzcmJhdm5sZ2xmZndvdml1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMzOTIxOCwiZXhwIjoyMDk1OTE1MjE4fQ.zmEaNzJZEusUlzuSsSTht4B9dDaobrmq7ltWb9y6f8U"

req = urllib.request.Request(url, headers={
    "apikey": key,
    "Authorization": f"Bearer {key}"
})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for msg in reversed(data):
            body_clean = msg['body'][:100].encode('ascii', 'ignore').decode()
            print(f"[{msg['created_at'][11:19]}] {msg['direction'].upper()}: {body_clean}")
except Exception as e:
    print("Error:", e)
