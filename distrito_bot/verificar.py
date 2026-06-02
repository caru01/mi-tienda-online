import httpx
import os
import sys
from dotenv import load_dotenv

# Forzar UTF-8 en la salida de Windows
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')
api_key = os.getenv('YCLOUD_API_KEY')

print('=' * 55)
print('  VERIFICACION SISTEMA - DISTRITO BURGER BOT')
print('=' * 55)

# 1. Servidor local
try:
    r = httpx.get('http://localhost:8000/health', timeout=5)
    estado = "OK" if r.status_code == 200 else "ERROR"
    print(f'[1] Servidor FastAPI local:   [{estado}] ({r.status_code})')
except Exception as e:
    print(f'[1] Servidor FastAPI local:   [FALLO] - {e}')

# 2. Tunel ngrok
try:
    r = httpx.get(
        'https://dragster-dangle-hence.ngrok-free.dev/health',
        timeout=8,
        headers={"ngrok-skip-browser-warning": "true"}
    )
    estado = "OK" if r.status_code == 200 else "ERROR"
    print(f'[2] Tunel ngrok publico:      [{estado}] ({r.status_code}) - URL activa')
except Exception as e:
    print(f'[2] Tunel ngrok publico:      [FALLO] - {e}')

# 3. Inspector ngrok - requests recibidos
try:
    r = httpx.get('http://127.0.0.1:4040/api/requests/http', timeout=5)
    data = r.json()
    requests_list = data.get('requests', [])
    total = len(requests_list)
    print(f'[3] Ngrok inspector:          [OK] - {total} requests en total')
    if requests_list:
        last = requests_list[0]
        uri = last.get('request', {}).get('uri', 'N/A')
        method = last.get('request', {}).get('method', 'N/A')
        resp_status = last.get('response', {}).get('status', 'N/A')
        print(f'    Ultimo request: {method} {uri} -> {resp_status}')
    webhooks = [req for req in requests_list if '/webhook' in req.get('request', {}).get('uri', '')]
    if webhooks:
        print(f'    Requests al /webhook: {len(webhooks)} encontrados')
    else:
        print(f'    ADVERTENCIA: Ningun request de YCloud al /webhook todavia')
except Exception as e:
    print(f'[3] Ngrok inspector:          [FALLO] - {e}')

# 4. Supabase - mensajes
try:
    r = httpx.get(
        f'{url}/rest/v1/messages?select=count',
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Prefer': 'count=exact'
        },
        timeout=8
    )
    estado = "OK" if r.status_code in (200, 206) else f"ERROR {r.status_code}"
    count = r.headers.get('content-range', '?')
    print(f'[4] Supabase tabla messages:  [{estado}] | Registros: {count}')
    if r.status_code not in (200, 206):
        print(f'    Detalle: {r.text[:150]}')
except Exception as e:
    print(f'[4] Supabase tabla messages:  [FALLO] - {e}')

# 5. Supabase - ventas
try:
    r = httpx.get(
        f'{url}/rest/v1/sales?select=count',
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Prefer': 'count=exact'
        },
        timeout=8
    )
    estado = "OK" if r.status_code in (200, 206) else f"ERROR {r.status_code}"
    count = r.headers.get('content-range', '?')
    print(f'[5] Supabase tabla sales:     [{estado}] | Registros: {count}')
    if r.status_code not in (200, 206):
        print(f'    Detalle: {r.text[:150]}')
except Exception as e:
    print(f'[5] Supabase tabla sales:     [FALLO] - {e}')

# 6. Supabase - pending_replies
try:
    r = httpx.get(
        f'{url}/rest/v1/pending_replies?select=count',
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Prefer': 'count=exact'
        },
        timeout=8
    )
    estado = "OK" if r.status_code in (200, 206) else f"ERROR {r.status_code}"
    count = r.headers.get('content-range', '?')
    print(f'[6] Supabase pending_replies: [{estado}] | Registros: {count}')
    if r.status_code not in (200, 206):
        print(f'    Detalle: {r.text[:150]}')
except Exception as e:
    print(f'[6] Supabase pending_replies: [FALLO] - {e}')

# 7. YCloud API
try:
    r = httpx.get(
        'https://api.ycloud.com/v2/whatsapp/phoneNumbers',
        headers={'X-API-Key': api_key},
        timeout=8
    )
    if r.status_code == 200:
        data = r.json()
        numeros = data.get('items', [])
        print(f'[7] YCloud API:               [OK] - {len(numeros)} numero(s) registrado(s)')
        for n in numeros:
            phone = n.get('displayPhoneNumber', 'N/A')
            quality = n.get('qualityRating', 'N/A')
            status_n = n.get('status', 'N/A')
            print(f'    Numero: {phone} | Calidad: {quality} | Estado: {status_n}')
    else:
        print(f'[7] YCloud API:               [ERROR {r.status_code}] - {r.text[:120]}')
except Exception as e:
    print(f'[7] YCloud API:               [FALLO] - {e}')

print('=' * 55)
print('  FIN DE VERIFICACION')
print('=' * 55)
