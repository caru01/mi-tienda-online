"""
main.py
Punto de entrada de la aplicación FastAPI - Distrito Burger Bot.

Inicia:
- El servidor web FastAPI con Uvicorn.
- El APScheduler para la tarea de revisión de chats pendientes.
- El router del webhook.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from api.webhook import router as webhook_router
from api.dashboard import router as dashboard_router
from scheduler.pending_replies import start_scheduler

# ── Configuración de logging ─────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan: arranca y detiene el scheduler con la app ─────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestiona el ciclo de vida de la aplicación."""
    logger.info("🚀 Iniciando Distrito Burger Bot...")

    # Iniciar scheduler en segundo plano
    state: dict = {}
    start_scheduler(state)
    app.state.scheduler = state.get("scheduler")

    logger.info("✅ Bot listo y escuchando eventos de WhatsApp")

    yield  # La aplicación está corriendo

    # Al apagar: detener el scheduler limpiamente
    if hasattr(app.state, "scheduler") and app.state.scheduler:
        app.state.scheduler.shutdown(wait=False)
        logger.info("⏹️ Scheduler detenido")

    logger.info("👋 Distrito Burger Bot apagado")


# ── Creación de la app FastAPI ───────────────────────────────────────────────
app = FastAPI(
    title="Distrito Burger Bot",
    description=(
        "Sistema de automatización de ventas y gestión de chats "
        "para Distrito Burger via WhatsApp Business (YCloud)."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rutas
app.include_router(webhook_router)
app.include_router(dashboard_router)


# ── Rutas API ────────────────────────────────────────────────────────────────
@app.get("/api")
async def root():
    return {
        "service": "Distrito Burger Bot API 🍔",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }

# ── Servir el Dashboard (Frontend React) ─────────────────────────────────────
# Montamos la carpeta dist de React. Debe ejecutarse `npm run build` en dashboard/ primero.
frontend_path = os.path.join(os.path.dirname(__file__), "dashboard", "dist")

if os.path.exists(frontend_path):
    # Montar archivos estáticos (JS, CSS, imágenes)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")
    
    # Servir index.html en la ruta raíz para que cargue la app
    @app.get("/{catchall:path}")
    async def serve_react_app(catchall: str):
        # Excluir llamadas API
        if catchall.startswith("api/") or catchall == "docs" or catchall == "openapi.json":
            return {"error": "Not found"}
        
        file_path = os.path.join(frontend_path, catchall)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Para SPA routing, enviar index.html si no se encuentra el archivo
        return FileResponse(os.path.join(frontend_path, "index.html"))
else:
    logger.warning("No se encontró dashboard/dist. Asegúrate de ejecutar 'npm run build' en la carpeta dashboard.")
    @app.get("/")
    async def root_fallback():
        return {"message": "El dashboard no ha sido construido. Ejecuta npm run build."}


# ── Ejecución directa ────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
