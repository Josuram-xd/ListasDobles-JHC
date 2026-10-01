import { svg, trackPosition } from "./util.js";

const LITTER_PIECES = 70;
const TRASH_ICONS = ["🥤", "🧻", "🍾", "🎈"];

/**
 * Litter that appears on the street once the parade passes and the
 * garbage truck that closes the parade and cleans it up.
 */
export class CleanupCrew {
  constructor(litterLayer, truckLayer, path) {
    this.path = path;
    this.pathLength = path.getTotalLength();
    this.truckLayer = truckLayer;
    this.pieces = this.scatterLitter(litterLayer);
    this.truck = null;
  }

  scatterLitter(layer) {
    const pieces = [];
    for (let i = 0; i < LITTER_PIECES; i++) {
      // deterministic pseudo-random spots along the street
      const fraction = (i + 0.5 + ((i * 0.37) % 0.5)) / LITTER_PIECES;
      const at = fraction * this.pathLength;
      const p1 = this.path.getPointAtLength(at);
      const p2 = this.path.getPointAtLength(Math.min(at + 1, this.pathLength));
      const norm = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
      const side = ((i * 7) % 25) - 12; // -12 .. 12 px across the street
      const x = p1.x - ((p2.y - p1.y) / norm) * side;
      const y = p1.y + ((p2.x - p1.x) / norm) * side;

      const el = i % 7 === 0
        ? svg("text", { x, y, class: "litter-piece trash", "text-anchor": "middle" }, layer)
        : svg("rect", { x: x - 2.5, y: y - 1.5, width: 5, height: 3, transform: `rotate(${(i * 47) % 180} ${x} ${y})`,
                        class: `litter-piece dot d${i % 5}` }, layer);
      if (i % 7 === 0) el.textContent = TRASH_ICONS[(i / 7) % TRASH_ICONS.length];
      pieces.push({ el, fraction });
    }
    return pieces;
  }

  setData(cleanup) {
    this.cleanup = cleanup;
    this.truckLayer.innerHTML = "";
    if (!cleanup) {
      this.truck = null;
      return;
    }
    this.truck = svg("g", { class: "marcher truck" }, this.truckLayer);
    svg("title", {}, this.truck).textContent = `${cleanup.name}: cierra el desfile y limpia la calle`;
    svg("rect", { x: -20, y: -12, width: 40, height: 22, rx: 5, class: "marcher-body" }, this.truck);
    svg("circle", { cx: -11, cy: 12, r: 4.5, class: "wheel" }, this.truck);
    svg("circle", { cx: 11, cy: 12, r: 4.5, class: "wheel" }, this.truck);
    svg("text", { class: "marcher-icon", "text-anchor": "middle", dy: "6" }, this.truck).textContent = cleanup.icon;
    const broom = svg("g", { class: "broom", transform: "translate(-28 6)" }, this.truck);
    svg("text", { "text-anchor": "middle", dy: "4" }, broom).textContent = "🧹";
  }

  /** Updates the truck and the litter for a minute; returns a status text. */
  update(time, leaderMeters, routeLength) {
    const truckMeters = this.cleanup ? trackPosition(this.cleanup.schedule.track, time) : -Infinity;
    let dirty = 0;
    for (const piece of this.pieces) {
      const meters = piece.fraction * routeLength;
      const visible = leaderMeters > meters && truckMeters < meters;
      piece.el.classList.toggle("on", visible);
      if (visible) dirty++;
    }
    if (!this.truck) return "";

    const state = truckMeters <= 0 ? "waiting" : truckMeters >= routeLength ? "arrived" : "marching";
    this.truck.dataset.state = state;
    if (state === "marching") {
      const point = this.path.getPointAtLength((truckMeters / routeLength) * this.pathLength);
      this.truck.setAttribute("transform", `translate(${point.x} ${point.y})`);
    }
    if (state === "waiting") return `🚛 El carro de la basura espera al último grupo · 🗑️ basura en la calle: <b>${dirty}</b>`;
    if (state === "marching") return `🚛 El carro de la basura va limpiando · 🗑️ basura en la calle: <b>${dirty}</b>`;
    return "🚛 ¡Calle limpia! El carro de la basura terminó el recorrido ✨";
  }
}
