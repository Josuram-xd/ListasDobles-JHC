import { DragController } from "./drag.js";
import { escapeHtml, SEVERITY_ICON } from "./util.js";

function worstSeverity(issues) {
  for (const level of ["error", "warning", "info"]) {
    if (issues.some((issue) => issue.severity === level)) return level;
  }
  return "ok";
}

function cardTemplate(p) {
  const issues = p.issues
    .map((i) => `<li class="issue ${i.severity}">${SEVERITY_ICON[i.severity]} ${escapeHtml(i.message)}</li>`)
    .join("");
  return `
    <li class="card cat-${p.category} sev-${worstSeverity(p.issues)}" data-id="${p.id}" tabindex="0"
        aria-label="${p.position}. ${escapeHtml(p.name)}. Alt + flechas para mover">
      <span class="handle" title="Arrastrar" aria-hidden="true">⠿</span>
      <span class="pos">${p.position}</span>
      <span class="icon" aria-hidden="true">${p.icon}</span>
      <div class="body">
        <div class="name" title="Doble clic para renombrar">${escapeHtml(p.name)}</div>
        <div class="meta">${escapeHtml(p.label)} · ${p.members} integrantes · ${p.length} m · sale ${p.schedule.passes[0].time}</div>
        <div class="meta rest">${p.rest_minutes
          ? `☕ descansa cada ~${p.rest_every} m durante ${p.rest_minutes} min · ${p.schedule.rests.length} paradas`
          : "📢 no se detiene: va anunciando durante todo el recorrido"}</div>
        ${p.theme ? `<div class="theme">“${escapeHtml(p.theme)}”</div>` : ""}
        ${issues ? `<ul class="issues">${issues}</ul>` : ""}
        <div class="links">prev: ${p.prev_id ?? "null"} · id: ${p.id} · next: ${p.next_id ?? "null"}</div>
      </div>
      <div class="actions">
        <button type="button" data-action="up" title="Subir (intercambiar con prev)" ${p.prev_id ? "" : "disabled"}>↑</button>
        <button type="button" data-action="down" title="Bajar (intercambiar con next)" ${p.next_id ? "" : "disabled"}>↓</button>
        <button type="button" data-action="delete" title="Eliminar">✕</button>
      </div>
    </li>`;
}

/** Board that shows the parade order and lets the user rearrange it. */
export class LineupBoard {
  constructor(listEl, paletteEl, handlers) {
    this.list = listEl;
    this.palette = paletteEl;
    this.handlers = handlers;
    this.participants = [];
    this.focusId = null;
    this.drag = new DragController(listEl, {
      onHover: (state) => this.markDropTarget(this.isOverList(state) ? this.dropTarget(state.y) : null),
      onDrop: (state) => this.drop(state),
    });
    this.bindEvents();
  }

  render(participants, categories) {
    // FLIP animation: remember where each card was before re-rendering
    const previousTops = new Map([...this.list.querySelectorAll(".card")]
      .map((card) => [card.dataset.id, card.getBoundingClientRect().top]));

    this.participants = participants;
    this.palette.innerHTML = categories
      .map((c) => `<span class="chip cat-${c.value}" data-category="${c.value}">${c.icon} ${escapeHtml(c.label)}</span>`)
      .join("");
    this.list.innerHTML = participants.length
      ? participants.map(cardTemplate).join("")
      : `<li class="empty">No hay grupos. Arrastra una categoría aquí.</li>`;

    this.list.querySelectorAll(".card").forEach((card) => {
      const before = previousTops.get(card.dataset.id);
      if (before === undefined) {
        if (previousTops.size) card.animate([{ opacity: 0, transform: "scale(.95)" }, { opacity: 1, transform: "none" }], 300);
        return;
      }
      const delta = before - card.getBoundingClientRect().top;
      if (delta) card.animate([{ transform: `translateY(${delta}px)` }, { transform: "none" }], { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" });
    });

    if (this.focusId !== null) {
      this.list.querySelector(`.card[data-id="${this.focusId}"]`)?.focus({ preventScroll: false });
      this.focusId = null;
    }
  }

  bindEvents() {
    const onPointerDown = (event) => {
      if (event.button !== 0 || event.target.closest("button, [contenteditable='true']")) return;
      const card = event.target.closest(".card");
      const chip = event.target.closest(".chip");
      // on touch screens only the handle starts a drag, so the list can still be scrolled
      if (card && event.pointerType === "touch" && !event.target.closest(".handle")) return;
      if (card) this.drag.arm(event, { kind: "move", id: Number(card.dataset.id) }, card);
      else if (chip) this.drag.arm(event, { kind: "create", category: chip.dataset.category }, chip);
    };
    this.list.addEventListener("pointerdown", onPointerDown);
    this.palette.addEventListener("pointerdown", onPointerDown);

    this.list.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const p = this.participantOf(button);
      if (button.dataset.action === "up") this.handlers.onMove(p.id, p.prev_id, "before");
      if (button.dataset.action === "down") this.handlers.onMove(p.id, p.next_id, "after");
      if (button.dataset.action === "delete") this.handlers.onDelete(p);
    });

    this.list.addEventListener("keydown", (event) => {
      const card = event.target.closest(".card");
      if (!card || event.target.isContentEditable || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      const up = event.key === "ArrowUp";
      const p = this.participantOf(card);
      if (!event.altKey) {
        (up ? card.previousElementSibling : card.nextElementSibling)?.focus();
        return;
      }
      const targetId = up ? p.prev_id : p.next_id;
      if (targetId === null) return;
      this.focusId = p.id;
      this.handlers.onMove(p.id, targetId, up ? "before" : "after");
    });

    this.list.addEventListener("dblclick", (event) => {
      const nameEl = event.target.closest(".name");
      if (nameEl) this.editName(nameEl);
    });

    this.list.addEventListener("mouseover", (event) => {
      const card = event.target.closest(".card");
      this.handlers.onHover(card ? Number(card.dataset.id) : null);
    });
    this.list.addEventListener("mouseleave", () => this.handlers.onHover(null));
  }

  participantOf(element) {
    const id = Number(element.closest(".card").dataset.id);
    return this.participants.find((p) => p.id === id);
  }

  isOverList({ x, y }) {
    const box = this.list.getBoundingClientRect();
    return x >= box.left - 30 && x <= box.right + 30 && y >= box.top - 40 && y <= box.bottom + 40;
  }

  /** Card under the pointer and whether to drop before or after it. */
  dropTarget(clientY) {
    const cards = [...this.list.querySelectorAll(".card:not(.dragging)")];
    for (const card of cards) {
      const box = card.getBoundingClientRect();
      if (clientY < box.top + box.height / 2) return { card, id: Number(card.dataset.id), place: "before" };
    }
    const last = cards.at(-1);
    return last ? { card: last, id: Number(last.dataset.id), place: "after" } : { card: null, id: null, place: "after" };
  }

  markDropTarget(target) {
    this.list.querySelectorAll(".drop-before, .drop-after").forEach((el) => el.classList.remove("drop-before", "drop-after"));
    this.list.classList.toggle("drop-active", Boolean(target));
    if (target?.card) target.card.classList.add(target.place === "before" ? "drop-before" : "drop-after");
  }

  drop(state) {
    this.markDropTarget(null);
    if (!state || !this.isOverList(state)) return;
    const target = this.dropTarget(state.y);
    const { payload } = state;
    if (payload.kind === "move" && target.id && target.id !== payload.id) {
      this.focusId = payload.id;
      this.handlers.onMove(payload.id, target.id, target.place);
    } else if (payload.kind === "create") {
      this.handlers.onCreate(payload.category, target.id, target.place);
    }
  }

  editName(nameEl) {
    const participant = this.participantOf(nameEl);
    nameEl.contentEditable = "true";
    nameEl.focus();
    document.getSelection().selectAllChildren(nameEl);

    const onKey = (event) => {
      if (event.key === "Enter") { event.preventDefault(); nameEl.blur(); }
      if (event.key === "Escape") { nameEl.textContent = participant.name; nameEl.blur(); }
    };
    nameEl.addEventListener("keydown", onKey);
    nameEl.addEventListener("blur", () => {
      nameEl.removeEventListener("keydown", onKey);
      nameEl.contentEditable = "false";
      const name = nameEl.textContent.trim();
      if (name && name !== participant.name) this.handlers.onRename(participant, name);
      else nameEl.textContent = participant.name;
    }, { once: true });
  }
}
