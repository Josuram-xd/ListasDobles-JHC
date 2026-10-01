"""HTTP API for the parade organizer. Also serves the frontend."""

import mimetypes
from pathlib import Path
from typing import Literal

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .models import Category
from .seed import build_demo_parade
from .storage import ParadeRepository

# Windows sometimes maps .js to text/plain, which breaks ES modules.
mimetypes.add_type("application/javascript", ".js")

ROOT = Path(__file__).resolve().parent.parent
repository = ParadeRepository(ROOT / "data" / "parade.json", build_demo_parade)
parade = repository.load()

app = FastAPI(title="Carnival Parade Organizer")


class ParticipantIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    category: Category
    members: int = Field(default=20, ge=1, le=3000)
    theme: str = Field(default="", max_length=120)
    anchor_id: int | None = None
    place: Literal["before", "after"] = "after"


class ParticipantPatch(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    theme: str = Field(default="", max_length=120)


class MoveIn(BaseModel):
    participant_id: int
    target_id: int
    place: Literal["before", "after"]


class SettingsIn(BaseModel):
    start_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


@app.exception_handler(KeyError)
async def not_found(_request, exc):
    detail = exc.args[0] if exc.args else "No encontrado"
    return JSONResponse(status_code=404, content={"detail": detail})


def commit():
    repository.save(parade)
    return parade.snapshot()


@app.get("/api/parade")
async def get_parade():
    return parade.snapshot()


@app.post("/api/participants")
async def add_participant(body: ParticipantIn):
    parade.add(**body.model_dump())
    return commit()


@app.patch("/api/participants/{participant_id}")
async def update_participant(participant_id: int, body: ParticipantPatch):
    parade.update(participant_id, body.name, body.theme)
    return commit()


@app.delete("/api/participants/{participant_id}")
async def delete_participant(participant_id: int):
    parade.lineup.remove(participant_id)
    return commit()


@app.post("/api/parade/move")
async def move_participant(body: MoveIn):
    parade.move(body.participant_id, body.target_id, body.place)
    return commit()


@app.post("/api/parade/arrange")
async def arrange_parade():
    parade.auto_arrange()
    return commit()


@app.put("/api/parade/settings")
async def update_settings(body: SettingsIn):
    parade.start_time = body.start_time
    return commit()


@app.post("/api/parade/reset")
async def reset_parade():
    global parade
    parade = build_demo_parade()
    return commit()


app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
