from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import books, reading, highlights, feed, friends, choices, planet, auth, ai, comic, reading_notes

app = FastAPI(title="Booky API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(books.router, prefix="/api/books", tags=["books"])
app.include_router(reading.router, prefix="/api/reading", tags=["reading"])
app.include_router(highlights.router, prefix="/api/highlights", tags=["highlights"])
app.include_router(feed.router, prefix="/api/feed", tags=["feed"])
app.include_router(friends.router, prefix="/api/friends", tags=["friends"])
app.include_router(choices.router, prefix="/api/choices", tags=["choices"])
app.include_router(planet.router, prefix="/api/planet", tags=["planet"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(comic.router, prefix="/api/comic", tags=["comic"])
app.include_router(reading_notes.router, prefix="/api/reading-notes", tags=["reading-notes"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
