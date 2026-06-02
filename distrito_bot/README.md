# 🍔 Distrito Burger Bot — Guía de Configuración Completa

## Paso 1: Configurar Supabase (Base de Datos)

### 1.1 Crear cuenta y proyecto

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Haz clic en **"New Project"**.
3. Elige un nombre (ej. `distrito-burger`) y una contraseña fuerte para la BD.
4. Selecciona la región **South America (São Paulo)** para menor latencia.
5. Espera ~2 minutos mientras se crea.

### 1.2 Crear las tablas

1. En el panel izquierdo, ve a **"SQL Editor"**.
2. Haz clic en **"New Query"**.
3. Copia y pega **todo el contenido** del archivo `db/schema.sql`.
4. Haz clic en **"Run"** (botón verde).
5. Deberías ver `Success. No rows returned` — eso significa que las tablas se crearon correctamente.

### 1.3 Obtener tus credenciales

1. En el panel izquierdo, ve a **Settings → API**.
2. Copia estos dos valores:

| Variable | Dónde encontrarla |
|----------|-------------------|
| `SUPABASE_URL` | Campo **"Project URL"** |
| `SUPABASE_KEY` | Sección **"Project API Keys"** → copia la **"service_role"** key (NO la anon key) |

> ⚠️ **La service_role key tiene acceso completo a la BD. Nunca la compartas públicamente.**

---

## Paso 2: Configurar YCloud (WhatsApp API)

### 2.1 Crear cuenta en YCloud

1. Ve a [ycloud.com](https://ycloud.com) y crea una cuenta.
2. En el panel, ve a la sección de **WhatsApp** y conecta tu número de WhatsApp Business.
3. Sigue el flujo de verificación del número (recibirás un código por SMS).

### 2.2 Obtener tu API Key

1. En el panel de YCloud, ve a **Settings → API Keys** (o similar).
2. Crea una nueva API Key y cópiala.

### 2.3 Configurar el Webhook en YCloud

> ⚠️ El webhook se configura **después** de tener el bot corriendo con ngrok (Paso 4).

1. En YCloud, busca la sección **"Webhooks"** o **"Notifications"**.
2. Agrega una nueva URL de webhook con el formato:
   ```
   https://TU-URL-DE-NGROK.ngrok-free.app/webhook
   ```
3. Suscríbete a los eventos:
   - `whatsapp.message.created`
   - `whatsapp.message.updated` (opcional, para estados de entrega)

---

## Paso 3: Configurar el Proyecto

### 3.1 Instalar Python

Asegúrate de tener **Python 3.11+** instalado.
Verifica: abre PowerShell y ejecuta:
```powershell
python --version
```

### 3.2 Crear entorno virtual e instalar dependencias

Abre PowerShell en la carpeta `distrito_bot` y ejecuta:

```powershell
# Crear entorno virtual
python -m venv venv

# Activar el entorno virtual
.\venv\Scripts\Activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3.3 Crear el archivo .env

1. Copia el archivo `.env.example` y renómbralo a `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Ábrelo con el editor de texto y rellena los valores reales:
   ```env
   YCLOUD_API_KEY=tu_api_key_de_ycloud
   YCLOUD_PHONE_NUMBER=+573001234567
   SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   SUPABASE_KEY=tu_service_role_key
   ```

---

## Paso 4: Instalar y Configurar Ngrok

### 4.1 Instalar ngrok

1. Ve a [ngrok.com](https://ngrok.com) y crea una cuenta gratuita.
2. Descarga ngrok para Windows.
3. Extrae el archivo y coloca `ngrok.exe` en una carpeta de fácil acceso (ej. `C:\ngrok\`).
4. Autentícate con tu token (lo encuentras en el dashboard de ngrok):
   ```powershell
   ngrok config add-authtoken TU_TOKEN_AQUI
   ```

---

## Paso 5: Arrancar el Sistema

Necesitarás **dos ventanas de PowerShell** abiertas en la carpeta `distrito_bot`:

### Terminal 1: Servidor FastAPI

```powershell
# Activar entorno virtual (si no está activo)
.\venv\Scripts\Activate

# Iniciar el bot
uvicorn main:app --reload --port 8000
```

Deberías ver:
```
INFO: 🚀 Iniciando Distrito Burger Bot...
INFO: ⏰ Scheduler iniciado — revisando pendientes cada 60 segundos
INFO: ✅ Bot listo y escuchando eventos de WhatsApp
INFO: Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2: Túnel ngrok

```powershell
ngrok http 8000
```

Verás una URL como:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:8000
```

**Copia esa URL** → ve al panel de YCloud → pégala como URL del Webhook + `/webhook` al final:
```
https://abc123.ngrok-free.app/webhook
```

---

## Paso 6: Verificar que Funciona

### Prueba 1: Verificar el servidor
Abre tu navegador y ve a:
```
http://localhost:8000/docs
```
Deberías ver la documentación interactiva de Swagger de FastAPI.

### Prueba 2: Ejecutar el script de prueba
```powershell
python test_webhook.py
```
Esto enviará 3 eventos de prueba al webhook y mostrará las respuestas.

Después ve a tu **dashboard de Supabase → Table Editor** y verifica:
- Tabla `messages`: debe tener 3 filas nuevas.
- Tabla `sales`: debe tener 1 fila (la venta de $45.000).

### Prueba 3: Probar fuera de horario
1. Abre tu WhatsApp personal y envía un mensaje al número de Distrito Burger.
2. El bot debería responder automáticamente con el mensaje de horarios.

---

## Comandos de Referencia Rápida

```powershell
# Activar entorno virtual
.\venv\Scripts\Activate

# Iniciar bot
uvicorn main:app --reload --port 8000

# Iniciar ngrok (en otra terminal)
ngrok http 8000

# Correr pruebas
python test_webhook.py

# Ver logs en tiempo real (ya los muestra uvicorn)
# Busca líneas con 📝 (mensajes guardados) y 💰 (ventas detectadas)
```

---

## Estructura del Proyecto

```
distrito_bot/
├── .env                  ← TUS CREDENCIALES (nunca subir a GitHub)
├── .env.example          ← Plantilla de referencia
├── requirements.txt      ← Dependencias Python
├── main.py               ← Punto de entrada del servidor
├── test_webhook.py       ← Script de pruebas
│
├── api/
│   └── webhook.py        ← Endpoint POST /webhook
│
├── config/
│   └── settings.py       ← Configuración centralizada (horarios, textos)
│
├── modules/
│   ├── chat_history.py   ← Módulo A: Registro de mensajes
│   ├── sales_parser.py   ← Módulo B: Parser de ventas
│   └── auto_reply.py     ← Módulo C: Respuestas automáticas
│
├── scheduler/
│   └── pending_replies.py← Tarea periódica de respaldo
│
├── services/
│   ├── supabase_client.py← Conexión a Supabase
│   └── ycloud_client.py  ← Cliente API de YCloud
│
└── db/
    └── schema.sql        ← Script SQL (ejecutar en Supabase)
```

---

## Personalizar los Mensajes Automáticos

Abre `config/settings.py` y modifica las propiedades `off_hours_message` y `backup_reply_message` con el texto exacto que quieras enviar a tus clientes.

---

## Cómo Registrar una Venta Manualmente

Cuando confirmes un pedido desde tu celular, simplemente escribe el mensaje con este formato:

```
CONFIRMAR PEDIDO ✅
Cliente: Nombre
---
2x Combo Clásico
1x Papas Grandes
---
TOTAL: $45.000
```

El bot detectará automáticamente el mensaje y registrará la venta en Supabase.

---

## Consultar las Ventas del Día

En Supabase → SQL Editor, ejecuta:
```sql
SELECT * FROM ventas_hoy;
```

Para ver el resumen diario:
```sql
SELECT * FROM resumen_ventas_diario;
```
