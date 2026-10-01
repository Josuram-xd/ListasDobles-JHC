"""Domain models: parade categories and participants."""

from dataclasses import asdict, dataclass
from enum import Enum


class Category(str, Enum):
    INDIVIDUAL = "individual"
    MURGA = "murga"
    COMPARSA = "comparsa"
    CHOREOGRAPHIC = "choreographic"
    FLOAT = "float"
    MOTOR_FLOAT = "motor_float"
    AD_CART = "ad_cart"


@dataclass(frozen=True)
class CategoryInfo:
    label: str
    icon: str
    block: int             # suggested block inside the parade (lower goes first)
    speed: float           # meters per minute when marching freely
    base_length: float     # meters the group occupies on the route
    rest_every: float      # meters walked before taking a break (0 = never rests)
    rest_minutes: float    # length of each break
    has_band: bool = False
    is_float: bool = False
    motorized: bool = False
    is_ad: bool = False


CATEGORY_INFO = {
    Category.INDIVIDUAL: CategoryInfo("Disfraz individual", "🎭", 1, 45, 6, 1500, 2),
    Category.MURGA: CategoryInfo("Murga", "🥁", 2, 40, 15, 1000, 3, has_band=True),
    Category.COMPARSA: CategoryInfo("Comparsa", "💃", 2, 38, 20, 850, 4),
    Category.CHOREOGRAPHIC: CategoryInfo("Colectivo coreográfico", "👯", 3, 35, 30, 700, 5),
    Category.FLOAT: CategoryInfo("Carroza no motorizada", "🛞", 4, 28, 15, 1100, 4, is_float=True),
    Category.MOTOR_FLOAT: CategoryInfo("Carroza motorizada", "🚚", 4, 22, 25, 1800, 3, is_float=True, motorized=True),
    Category.AD_CART: CategoryInfo("Carrito publicitario", "📢", 0, 30, 4, 0, 0, is_ad=True),
}


CLEANUP_INFO = CategoryInfo("Carro de la basura", "🚛", 99, 24, 10, 0, 0, motorized=True)


class CleanupTruck:
    """Service vehicle that always closes the parade behind the tail.
    It is not part of the lineup, so it cannot be dragged or reordered."""
    id = "cleanup"
    name = "Carro de la basura"
    info = CLEANUP_INFO
    length = CLEANUP_INFO.base_length
    rest_plan = (0, 0)


@dataclass
class Participant:
    id: int
    name: str
    category: Category
    members: int
    theme: str = ""

    @property
    def info(self):
        return CATEGORY_INFO[self.category]

    @property
    def length(self):
        """Approximate meters on the route: base size plus space per member."""
        return round(self.info.base_length + self.members * 0.4, 1)

    @property
    def rest_plan(self):
        """(meters between breaks, minutes per break). Each group gets its own
        variation so they do not all stop at the same place for the same time."""
        if not self.info.rest_minutes:
            return 0, 0
        distance_factor = 0.85 + (self.id * 3 % 4) * 0.1   # 0.85 .. 1.15
        time_factor = 0.75 + (self.id * 7 % 6) * 0.1       # 0.75 .. 1.25
        return round(self.info.rest_every * distance_factor), round(self.info.rest_minutes * time_factor, 1)

    def to_dict(self):
        data = asdict(self)
        data["category"] = self.category.value
        return data

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data["id"],
            name=data["name"],
            category=Category(data["category"]),
            members=data["members"],
            theme=data.get("theme", ""),
        )
