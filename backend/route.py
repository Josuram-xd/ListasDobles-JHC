"""Route of the parade and clock helpers."""

from dataclasses import dataclass


def parse_clock(value):
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


def format_clock(minutes):
    total = round(minutes)
    return f"{(total // 60) % 24:02d}:{total % 60:02d}"


@dataclass(frozen=True)
class Checkpoint:
    name: str
    distance: float  # meters from the start


@dataclass(frozen=True)
class Route:
    name: str
    checkpoints: tuple

    @property
    def length(self):
        return self.checkpoints[-1].distance

    def to_dict(self):
        return {
            "name": self.name,
            "length": self.length,
            "checkpoints": [{"name": c.name, "distance": c.distance} for c in self.checkpoints],
        }


DEFAULT_ROUTE = Route(
    "Senda del Carnaval (recorrido de referencia)",
    (
        Checkpoint("Salida", 0),
        Checkpoint("Tribuna de jurados", 1200),
        Checkpoint("Zona de talco y espuma", 2600),
        Checkpoint("Llegada", 4000),
    ),
)
