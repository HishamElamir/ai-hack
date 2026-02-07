from fastapi import APIRouter
from app.api.endpoints import auth, new_hires, contracts, questions, templates, analytics, voice, webhooks

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(new_hires.router)
api_router.include_router(contracts.router)
api_router.include_router(questions.router)
api_router.include_router(templates.router)
api_router.include_router(analytics.router)
api_router.include_router(voice.router)
api_router.include_router(webhooks.router)
