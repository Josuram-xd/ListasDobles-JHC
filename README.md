# Desfile Magno · Organizador con Listas Dobles

Organizador interactivo del desfile del **Carnaval de Negros y Blancos** (Pasto, Nariño).
El orden del desfile se guarda en una **lista doblemente enlazada**: cada grupo (carroza,
comparsa, murga…) es un nodo que conoce al grupo de adelante (`prev`) y al de atrás (`next`).

## Cómo ejecutarlo

```bash
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload
```

Abrir http://127.0.0.1:8000

## Qué se puede hacer

- **Drag and drop** de grupos para cambiar el orden. Mientras arrastras puedes usar la rueda del ratón
  o acercarte al borde para que la lista se desplace sola (`Esc` cancela). En pantallas táctiles se arrastra desde ⠿.
- Teclado: `↑`/`↓` navegan entre grupos y `Alt + ↑`/`↓` los mueven.
- Arrastrar una **categoría** a la fila para crear un grupo justo en ese punto.
- Botones ↑ / ↓ que intercambian el nodo con su `prev` o su `next`.
- Doble clic en el nombre para renombrar.
- **Ruta animada**: los grupos avanzan por el recorrido y se ve a qué hora pasa cada uno por cada punto.
- **Explicación del orden**: "Abre el desfile…, luego…, cierra el desfile…".
- **Reglas** que revisan a cada nodo con sus vecinos:
  - Una carroza no puede abrir el desfile.
  - No pueden ir dos murgas seguidas (se mezcla la música).
  - No pueden ir dos carrozas motorizadas seguidas (seguridad).
  - Aviso si un grupo rápido queda detrás de uno lento (cuello de botella).
  - Recomendación de cerrar con una carroza.
- **Auto-organizar**: reconstruye la lista por bloques evitando romper las reglas.
- Tema **Día de Negros / Día de Blancos**.

## Estructura

```
backend/
  linked_list.py   Node y DoublyLinkedList (append, insert, remove, find, recorrido)
  models.py        Category, CategoryInfo, Participant
  rules.py         Rule (abstracta), reglas concretas y RuleBook
  schedule.py      Route, Checkpoint y ScheduleCalculator (horarios)
  parade.py        Parade: une la lista, las reglas y el horario
  storage.py       ParadeRepository: guarda/carga en data/parade.json
  seed.py          Datos de ejemplo
  main.py          API con FastAPI
frontend/
  index.html, styles.css
  js/  ApiClient, LineupBoard (drag and drop), RouteView (SVG), NarrativeView, LinkedListStrip, App
```

## Dónde se usa la lista doble

| Operación | Cómo usa la lista | Costo |
|---|---|---|
| Mover un grupo | `remove` (desenlaza) + `insert` antes/después del destino | O(1) |
| Insertar en medio | Se enlaza entre `anchor.prev` y `anchor` | O(1) |
| Reglas | Cada nodo se compara con `node.prev` / `node.next` | O(1) por nodo |
| Horario | Recorrido de `head` a `tail`; el ritmo depende del grupo anterior | O(n) |
| Auto-organizar | Se arma una lista nueva y se prueba cada candidato en la cola | O(n²) |

Se usa un diccionario `id → nodo` como índice para encontrar un nodo en O(1).

> El recorrido y los puntos de la ruta son de referencia y se pueden cambiar en `backend/schedule.py`.
> Los nombres de los grupos son ficticios.
