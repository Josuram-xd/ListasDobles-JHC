import { duration, escapeHtml, SEVERITY_ICON } from "./util.js";

const CONNECTORS = ["Luego", "Después", "A continuación", "Le sigue", "Detrás desfila"];

/** Explains the order in plain words by walking the list from head to tail. */
export class NarrativeView {
  constructor(container) {
    this.container = container;
  }

  render(snapshot) {
    const { participants, summary, start_time: start, route } = snapshot;
    if (!participants.length) {
      this.container.innerHTML = `<p class="muted">Aún no hay grupos en el desfile.</p>`;
      return;
    }

    const intro = `
      <p class="intro">El desfile sale a las <b>${start}</b> y recorre <b>${(route.length / 1000).toFixed(1)} km</b>.
      Participan <b>${summary.groups}</b> grupos con <b>${summary.members}</b> personas;
      dura cerca de <b>${duration(summary.total_minutes)}</b> y el último grupo llega a las <b>${summary.end_time}</b>.
      En total se hacen <b>${summary.rests}</b> paradas de descanso; cuando un grupo para, los de atrás frenan
      y los de adelante lo esperan, así todos mantienen una distancia parecida.</p>`;

    let previousBlock = null;
    const steps = participants.map((p, index) => {
      const isFirst = index === 0;
      const isLast = index === participants.length - 1;
      const connector = isFirst ? "Abre el desfile" : isLast ? "Cierra el desfile" : CONNECTORS[(index - 1) % CONNECTORS.length];
      const tribune = p.schedule.passes[1] ?? p.schedule.passes[0];
      const arrival = p.schedule.passes.at(-1);
      // ad carts are spread everywhere, so they do not open a new block
      const blockChange = !p.is_ad && previousBlock !== null && p.block !== previousBlock;
      if (!p.is_ad) previousBlock = p.block;
      const rests = p.schedule.rests;
      const restText = p.is_ad
        ? `Va anunciando${p.theme ? ` “${escapeHtml(p.theme)}”` : ""} sin detenerse.`
        : rests.length
          ? `Descansa ${rests.length} ${rests.length === 1 ? "vez" : "veces"} (${p.schedule.rest_total} min en total, a los ${rests.map((r) => `${r.at} m`).join(", ")}).`
          : "No alcanza a descansar.";
      const notes = p.issues
        .map((i) => `<span class="note ${i.severity}">${SEVERITY_ICON[i.severity]} ${escapeHtml(i.message)}</span>`)
        .join("");

      return `
        ${blockChange ? `<li class="block-break">nuevo bloque · ${escapeHtml(p.label)}</li>` : ""}
        <li class="step cat-${p.category}" data-id="${p.id}">
          <span class="step-number">${p.position}</span>
          <div>
            <p><b>${connector}</b> ${p.icon} <strong>${escapeHtml(p.name)}</strong>
            <span class="muted">(${escapeHtml(p.label)}, ${p.members} integrantes)</span>.
            Sale a las ${p.schedule.passes[0].time}, pasa por ${escapeHtml(tribune.checkpoint.toLowerCase())} a las ${tribune.time}
            y llega a las ${arrival.time}. ${restText}</p>
            ${notes}
          </div>
        </li>`;
    });

    this.container.innerHTML = `${intro}<ol class="steps">${steps.join("")}</ol>`;
  }
}
