"""Saves and loads the parade as JSON, keeping the order of the list."""

import json
from pathlib import Path

from .models import Participant
from .parade import Parade


class ParadeRepository:
    def __init__(self, path, seed_factory):
        self.path = Path(path)
        self.seed_factory = seed_factory

    def load(self):
        if not self.path.exists():
            parade = self.seed_factory()
            self.save(parade)
            return parade
        data = json.loads(self.path.read_text(encoding="utf-8"))
        participants = [Participant.from_dict(item) for item in data["participants"]]
        parade = Parade(participants, data.get("start_time", "10:00"))
        parade.next_id = max(parade.next_id, data.get("next_id", 1))
        return parade

    def save(self, parade):
        data = {
            "start_time": parade.start_time,
            "next_id": parade.next_id,
            "participants": [node.value.to_dict() for node in parade.lineup],
        }
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix(".tmp")
        temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(self.path)
