from fastapi import APIRouter
from pydantic import BaseModel
from app.services import comic_service

router = APIRouter()


class ComicRequest(BaseModel):
    book_title: str
    author: str
    chapters_summary: str


@router.post("/generate")
async def generate_comic(req: ComicRequest):
    result = await comic_service.generate_comic(
        req.book_title, req.author, req.chapters_summary
    )
    return result


@router.post("/scenes")
async def generate_scenes_only(req: ComicRequest):
    """Generate scene descriptions without images (faster, for preview)."""
    panels = await comic_service.generate_scene_prompts(
        req.book_title, req.author, req.chapters_summary
    )
    return {"panels": panels}
