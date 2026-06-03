import urllib.request
import json
import urllib.parse

key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjb2NzcmJhdm5sZ2xmZndvdml1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMzOTIxOCwiZXhwIjoyMDk1OTE1MjE4fQ.zmEaNzJZEusUlzuSsSTht4B9dDaobrmq7ltWb9y6f8U"
url = "https://ucocsrbavnlglffwoviu.supabase.co/rest/v1/bot_settings?id=eq.1"

req = urllib.request.Request(url, data=b'{"is_open":true}', headers={
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json'
}, method='PATCH')

res = urllib.request.urlopen(req)
print("Bot turned ON successfully!")
