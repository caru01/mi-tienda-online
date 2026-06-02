"""
test_webhook.py
Script de prueba rápida para verificar que el webhook procesa correctamente
los payloads de YCloud sin necesidad de YCloud o Supabase reales.

Uso:
    python test_webhook.py

Requiere que el servidor esté corriendo en localhost:8000
    uvicorn main:app --reload
"""
import json

# ── Payloads de prueba ───────────────────────────────────────────────────────

# Mensaje ENTRANTE normal (cliente escribe)
payload_inbound = {
    "type": "whatsapp.message.created",
    "whatsapp.message": {
        "id": "test_msg_001",
        "from": "+573001234567",
        "to": "+573007654321",
        "direction": "inbound",
        "type": "text",
        "text": {"body": "Hola, tienen disponible el combo clásico?"},
        "createTime": "2024-01-01T19:00:00Z",
    },
}

# Mensaje SALIENTE con VENTA (operador confirma pedido)
payload_sale = {
    "type": "whatsapp.message.created",
    "whatsapp.message": {
        "id": "test_msg_002",
        "from": "+573007654321",
        "to": "+573001234567",
        "direction": "outbound",
        "type": "text",
        "text": {
            "body": (
                "CONFIRMAR PEDIDO ✅\n"
                "Cliente: Juan\n"
                "---\n"
                "2x Combo Clásico\n"
                "1x Papas Grandes\n"
                "2x Gaseosa\n"
                "---\n"
                "TOTAL: $45.000"
            )
        },
        "createTime": "2024-01-01T19:05:00Z",
    },
}

# Mensaje SALIENTE sin venta (respuesta normal del operador)
payload_outbound_normal = {
    "type": "whatsapp.message.created",
    "whatsapp.message": {
        "id": "test_msg_003",
        "from": "+573007654321",
        "to": "+573001234567",
        "direction": "outbound",
        "type": "text",
        "text": {"body": "Sí, el combo clásico está disponible! ¿Qué más te puedo ofrecer?"},
        "createTime": "2024-01-01T19:02:00Z",
    },
}

if __name__ == "__main__":
    import httpx

    BASE_URL = "http://localhost:8000"

    print("=" * 60)
    print("🧪 TEST: Distrito Burger Bot Webhook")
    print("=" * 60)

    payloads = [
        ("Mensaje ENTRANTE (cliente escribe)", payload_inbound),
        ("Mensaje SALIENTE normal (operador responde)", payload_outbound_normal),
        ("Mensaje SALIENTE con VENTA (parser activa)", payload_sale),
    ]

    for name, payload in payloads:
        print(f"\n📤 Enviando: {name}")
        print(f"   Payload: {json.dumps(payload['whatsapp.message']['text'], ensure_ascii=False)}")

        try:
            resp = httpx.post(f"{BASE_URL}/webhook", json=payload, timeout=10)
            print(f"   ✅ Respuesta: {resp.status_code} → {resp.json()}")
        except Exception as e:
            print(f"   ❌ Error: {e}")

    print("\n" + "=" * 60)
    print("💡 Verifica los resultados en tu dashboard de Supabase")
    print("=" * 60)
