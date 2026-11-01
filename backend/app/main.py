from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.auth import router as auth_router
from app.api.habitations import router as habitations_router
from app.api.sites import router as sites_router
from app.api.hazards import router as hazards_router
from app.api.relocations import router as relocations_router
from app.api.dashboard import router as dashboard_router
from app.api.realdata import router as realdata_router
from seed_data.seed import seed_database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles database table initialization and baseline data seeding on startup.
    """
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")

    # 1. Initialize Database Tables
    if settings.AUTO_CREATE_TABLES:
        try:
            logger.info("Verifying and synchronizing database schema...")
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database schema initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to auto-create database tables: {e}")

    # 2. Auto-Seed Initial Production Data
    if settings.AUTO_SEED_ON_STARTUP:
        try:
            async with SessionLocal() as session:
                await seed_database(session)
        except Exception as e:
            logger.error(f"Error during startup data seeding: {e}")

    yield

    # Shutdown
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")
    await engine.dispose()
    logger.info("Database connection pool closed.")


# Initialize FastAPI instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

# Configure CORS Middleware
origins = settings.BACKEND_CORS_ORIGINS if settings.BACKEND_CORS_ORIGINS else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in origins else origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api/v1 prefix
api_prefix = "/api/v1"
app.include_router(auth_router, prefix=api_prefix)
app.include_router(habitations_router, prefix=api_prefix)
app.include_router(sites_router, prefix=api_prefix)
app.include_router(hazards_router, prefix=api_prefix)
app.include_router(relocations_router, prefix=api_prefix)
app.include_router(dashboard_router, prefix=api_prefix)
app.include_router(realdata_router, prefix=api_prefix)


@app.get("/health", tags=["Health & Status"])
@app.get("/api/v1/health", tags=["Health & Status"])
async def health_check():
    """Service health verification endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["Health & Status"])
async def root():
    """Root redirect / welcoming endpoint."""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": "/api/v1",
    }
