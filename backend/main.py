from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect
from app.core.config import settings
from app.api.router import api_router
from app.db.session import engine
import app.db.base  # noqa – register all models

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
async def ensure_schema():
    """Add any model columns missing from the database (no Alembic in this project)."""
    with engine.connect() as conn:
        insp = inspect(engine)
        if "conversations" in insp.get_table_names():
            existing = {c["name"] for c in insp.get_columns("conversations")}
            if "elevenlabs_conversation_id" not in existing:
                conn.execute(text(
                    "ALTER TABLE conversations ADD COLUMN elevenlabs_conversation_id VARCHAR(255)"
                ))
            if "agent_id" not in existing:
                conn.execute(text(
                    "ALTER TABLE conversations ADD COLUMN agent_id VARCHAR(255)"
                ))
            if "conversation_metadata" not in existing:
                conn.execute(text(
                    "ALTER TABLE conversations ADD COLUMN conversation_metadata JSONB DEFAULT '{}'"
                ))
            conn.commit()


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
