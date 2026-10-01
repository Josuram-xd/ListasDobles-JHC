"""Demo data inspired by the Carnaval de Negros y Blancos (Pasto, Nariño).

The order is intentionally imperfect so the rules have something to report.
"""

from .models import Category, Participant
from .parade import Parade

DEMO_PARTICIPANTS = [
    ("Taita Sol", Category.INDIVIDUAL, 1, "El sol de los pastos ilumina el carnaval"),
    ("Murga Los Rumberos del Sur", Category.MURGA, 35, "Ritmo de banda de pueblo"),
    ("Murga Chiva Parrandera", Category.MURGA, 30, "La chiva llega cargada de música"),
    ("Carrito Café del Volcán", Category.AD_CART, 2, "Patrocina: café de las montañas del sur"),
    ("Comparsa Familia Castañeda", Category.COMPARSA, 40, "La familia que llegó al carnaval"),
    ("Señor del Galeras", Category.INDIVIDUAL, 1, "El volcán despierta entre confeti"),
    ("Colectivo Raíces Andinas", Category.CHOREOGRAPHIC, 120, "Danza de la cosecha andina"),
    ("Comparsa Danzantes de Genoy", Category.COMPARSA, 50, "Tradición campesina en movimiento"),
    ("Carrito Radio Confeti FM", Category.AD_CART, 2, "La emisora del carnaval"),
    ("Carrito Helados del Páramo", Category.AD_CART, 2, "Refresca tu carnaval"),
    ("Carroza Pachamama", Category.MOTOR_FLOAT, 25, "La madre tierra en barniz de Pasto"),
    ("Carroza Laguna de la Cocha", Category.MOTOR_FLOAT, 20, "Leyendas de la laguna"),
    ("Carroza El Cuy Viajero", Category.FLOAT, 15, "Un cuy que recorre Nariño"),
    ("Carroza Guardianes del Agua", Category.FLOAT, 18, "Los páramos que cuidan el agua"),
]


def build_demo_parade():
    participants = [
        Participant(index, name, category, members, theme)
        for index, (name, category, members, theme) in enumerate(DEMO_PARTICIPANTS, start=1)
    ]
    return Parade(participants, start_time="10:00")
