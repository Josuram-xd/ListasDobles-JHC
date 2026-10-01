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
- **Descansos**: cada grupo para a descansar según su categoría y con su propia variación (no todos igual).
  Cuando uno para, los de atrás frenan para no acercarse a menos de 12 m y los de adelante lo esperan para no
  alejarse más de 45 m, así la distancia entre grupos se mantiene parecida (efecto acordeón).
- **Carritos publicitarios** 📢: no descansan, no pueden abrir el desfile ni ir dos seguidos, y el
  auto-organizar los reparte de forma pareja a lo largo del desfile.
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
  route.py         Route y Checkpoint (recorrido y puntos de control)
  simulation.py    Walker y ParadeSimulator (simulación minuto a minuto con descansos)
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
| Simulación | En cada minuto se recorre de `head` a `tail`; cada grupo mira a `prev` (distancia mínima) y a `next` (distancia máxima) | O(n) por paso |
| Auto-organizar | Se arma una lista nueva probando cada candidato en la cola y luego se insertan los carritos en puntos repartidos | O(n²) |

Se usa un diccionario `id → nodo` como índice para encontrar un nodo en O(1).

> El recorrido y los puntos de la ruta son de referencia y se pueden cambiar en `backend/route.py`.
> Los nombres de los grupos y patrocinadores son ficticios.
