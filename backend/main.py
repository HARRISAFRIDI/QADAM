"""QADAM API entrypoint. Vercel detects the FastAPI `app` object in main.py."""

import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from api.routes import attempts, auth, catalog, health, results
from api.routes.admin import routes as admin_routes
from core.config import get_settings
from core.errors import install_error_handlers
from db.session import dispose_engine

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await dispose_engine()


settings = get_settings()

app = FastAPI(
    title="QADAM API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/api/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/api/openapi.json",
)

install_error_handlers(app)
app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=5)
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
        max_age=86400,
    )

v1 = APIRouter(prefix="/api/v1")
for r in (health.router, auth.router, catalog.router, attempts.router, results.router):
    v1.include_router(r)
v1.include_router(admin_routes.router)
app.include_router(v1)


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"service": "qadam-api", "health": "/api/v1/health"}
