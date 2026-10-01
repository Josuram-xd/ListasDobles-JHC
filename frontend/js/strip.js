import { escapeHtml } from "./util.js";

/** Shows the parade as a chain of nodes linked in both directions. */
export class LinkedListStrip {
  constructor(container) {
    this.container = container;
  }

  render(participants) {
    const nodes = participants.map((p, index) => `
      ${index ? `<span class="link" aria-hidden="true">⇄</span>` : ""}
      <div class="node cat-${p.category}" data-id="${p.id}">
        ${index === 0 ? `<span class="tag">HEAD</span>` : ""}
        ${index === participants.length - 1 ? `<span class="tag tail">TAIL</span>` : ""}
        <span class="node-icon">${p.icon}</span>
        <span class="node-name">${escapeHtml(p.name)}</span>
        <span class="node-pointers"><i>prev</i> ${p.prev_id ?? "∅"} · <i>id</i> ${p.id} · <i>next</i> ${p.next_id ?? "∅"}</span>
      </div>`);

    this.container.innerHTML = `
      <span class="null">null</span><span class="link" aria-hidden="true">←</span>
      ${nodes.join("")}
      <span class="link" aria-hidden="true">→</span><span class="null">null</span>`;
  }

  highlight(id) {
    this.container.querySelectorAll(".node").forEach((node) => {
      node.classList.toggle("highlight", Number(node.dataset.id) === id);
    });
  }
}
