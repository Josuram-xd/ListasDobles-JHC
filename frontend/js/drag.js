const START_DISTANCE = 6;   // pixels the pointer must travel before a drag starts
const EDGE = 80;            // size of the auto-scroll zone near the edges
const MAX_STEP = 22;        // max pixels scrolled per frame

function scrollStep(distanceIntoEdge) {
  return Math.ceil(Math.min(1, distanceIntoEdge / EDGE) * MAX_STEP);
}

/**
 * Pointer-based drag and drop. Unlike native HTML5 drag, the page keeps
 * receiving wheel and scroll events, so the list can be scrolled while dragging.
 */
export class DragController {
  constructor(scrollArea, { onHover, onDrop }) {
    this.scrollArea = scrollArea;
    this.onHover = onHover;
    this.onDrop = onDrop;
    this.state = null;
    this.handlers = {
      pointermove: (event) => this.move(event),
      pointerup: () => this.finish(true),
      pointercancel: () => this.finish(false),
      keydown: (event) => event.key === "Escape" && this.finish(false),
      scroll: () => this.state?.active && this.onHover(this.state),
    };
  }

  arm(event, payload, source) {
    this.state = {
      payload, source, active: false,
      startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
    };
    for (const [type, handler] of Object.entries(this.handlers)) {
      // scroll does not bubble, so listen in the capture phase to catch the list and the window
      document.addEventListener(type, handler, type === "scroll" ? { capture: true, passive: true } : undefined);
    }
  }

  move(event) {
    const state = this.state;
    state.x = event.clientX;
    state.y = event.clientY;
    if (!state.active) {
      if (Math.hypot(state.x - state.startX, state.y - state.startY) < START_DISTANCE) return;
      this.begin();
    }
    event.preventDefault();
    state.ghost.style.transform = `translate(${state.x - state.offsetX}px, ${state.y - state.offsetY}px) rotate(-2deg)`;
    this.onHover(state);
  }

  begin() {
    const state = this.state;
    const box = state.source.getBoundingClientRect();
    state.active = true;
    state.offsetX = state.startX - box.left;
    state.offsetY = state.startY - box.top;
    state.ghost = state.source.cloneNode(true);
    state.ghost.classList.add("drag-ghost");
    state.ghost.style.width = `${box.width}px`;
    document.body.appendChild(state.ghost);
    state.source.classList.add("dragging");
    document.body.classList.add("is-dragging");
    document.getSelection()?.removeAllRanges();
    state.frame = requestAnimationFrame(() => this.autoScroll());
  }

  /** Scrolls the list (and the window) while the pointer rests near an edge. */
  autoScroll() {
    const state = this.state;
    if (!state?.active) return;
    const box = this.scrollArea.getBoundingClientRect();
    const insideColumn = state.x >= box.left && state.x <= box.right;

    if (insideColumn && state.y < box.top + EDGE) this.scrollArea.scrollTop -= scrollStep(box.top + EDGE - state.y);
    else if (insideColumn && state.y > box.bottom - EDGE) this.scrollArea.scrollTop += scrollStep(state.y - (box.bottom - EDGE));

    if (state.y < EDGE) window.scrollBy(0, -scrollStep(EDGE - state.y));
    else if (state.y > window.innerHeight - EDGE) window.scrollBy(0, scrollStep(state.y - (window.innerHeight - EDGE)));

    state.frame = requestAnimationFrame(() => this.autoScroll());
  }

  finish(shouldDrop) {
    const state = this.state;
    if (!state) return;
    for (const [type, handler] of Object.entries(this.handlers)) {
      document.removeEventListener(type, handler, type === "scroll" ? { capture: true } : undefined);
    }
    this.state = null;
    if (!state.active) return;
    cancelAnimationFrame(state.frame);
    state.ghost.remove();
    state.source.classList.remove("dragging");
    document.body.classList.remove("is-dragging");
    this.onDrop(shouldDrop ? state : null);
  }
}
