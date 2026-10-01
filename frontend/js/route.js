import { clockAt, escapeHtml } from "./util.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const ROUTE_PATH = "M 60 395 C 190 400 170 300 300 300 S 470 360 520 290 S 520 175 420 160 S 250 130 300 80 S 540 40 735 70";
const BASE_MINUTES_PER_SECOND = 4;

function svg(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  if (parent) parent.appendChild(el);
  return el;
}

/** Draws the route and animates every group along it over time. */
export class RouteView {
  constructor(svgEl, controls) {
    this.svg = svgEl;
    this.controls = controls;
    this.time = 0;
    this.playing = false;
    this.data = null;
    this.drawStatic();

    controls.play.addEventListener("click", () => this.toggle());
    controls.range.addEventListener("input", () => this.seek(Number(controls.range.value)));
  }

  drawStatic() {
    const decor = svg("g", { class: "confetti" }, this.svg);
    for (let i = 0; i < 70; i++) {
      // deterministic pseudo-random confetti so it does not jump between renders
      const x = (i * 137.5) % 800, y = (i * 89.3) % 440;
      svg("circle", { cx: x, cy: y, r: 2 + (i % 3), class: `dot d${i % 5}` }, decor);
    }
    svg("path", { d: ROUTE_PATH, class: "street-edge" }, this.svg);
    this.path = svg("path", { d: ROUTE_PATH, class: "street" }, this.svg);
    svg("path", { d: ROUTE_PATH, class: "street-line" }, this.svg);
    this.checkpointLayer = svg("g", {}, this.svg);
    this.marcherLayer = svg("g", {}, this.svg);
    this.pathLength = this.path.getTotalLength();
  }

  setData(snapshot) {
    this.data = snapshot;
    const total = snapshot.summary.total_minutes;
    this.controls.range.max = total;
    this.time = Math.min(this.time, total);
    this.drawCheckpoints(snapshot.route);

    this.marcherLayer.innerHTML = "";
    this.marchers = new Map();
    // draw from last to first so the head of the parade stays on top
    [...snapshot.participants].reverse().forEach((p) => {
      const group = svg("g", { class: `marcher cat-${p.category}`, "data-id": p.id }, this.marcherLayer);
      svg("title", {}, group).textContent = `${p.position}. ${p.name}`;
      svg("circle", { r: 17, class: "marcher-body" }, group);
      svg("text", { class: "marcher-icon", "text-anchor": "middle", dy: "6" }, group).textContent = p.icon;
      svg("circle", { r: 8, cx: 13, cy: -13, class: "marcher-badge" }, group);
      svg("text", { x: 13, y: -10, class: "marcher-number", "text-anchor": "middle" }, group).textContent = p.position;
      this.marchers.set(p.id, group);
    });
    this.seek(this.time);
  }

  drawCheckpoints(route) {
    this.checkpointLayer.innerHTML = "";
    route.checkpoints.forEach((checkpoint, index) => {
      const point = this.path.getPointAtLength((checkpoint.distance / route.length) * this.pathLength);
      const above = index % 2 === 0;
      svg("circle", { cx: point.x, cy: point.y, r: 9, class: "checkpoint" }, this.checkpointLayer);
      const label = svg("text", {
        x: point.x, y: point.y + (above ? -22 : 34), "text-anchor": "middle", class: "checkpoint-label",
      }, this.checkpointLayer);
      label.textContent = checkpoint.name;
    });
  }

  seek(time) {
    if (!this.data) return;
    this.time = time;
    this.controls.range.value = time;
    this.controls.clock.textContent = clockAt(this.data.start_time, time);

    const routeLength = this.data.route.length;
    let waiting = 0, marching = 0, arrived = 0;
    for (const p of this.data.participants) {
      const meters = (time - p.schedule.start) * p.schedule.pace;
      const marcher = this.marchers.get(p.id);
      const state = meters <= 0 ? "waiting" : meters >= routeLength ? "arrived" : "marching";
      marcher.dataset.state = state;
      if (state === "waiting") waiting++;
      else if (state === "arrived") arrived++;
      else marching++;
      if (state === "marching") {
        const point = this.path.getPointAtLength((meters / routeLength) * this.pathLength);
        marcher.setAttribute("transform", `translate(${point.x} ${point.y})`);
      }
    }
    this.controls.status.innerHTML =
      `⏳ En espera: <b>${waiting}</b> · 🎉 Desfilando: <b>${marching}</b> · 🏁 Llegaron: <b>${arrived}</b>` +
      ` · Recorrido de <b>${(routeLength / 1000).toFixed(1)} km</b> (${escapeHtml(this.data.route.name)})`;
  }

  toggle() {
    this.playing = !this.playing;
    this.controls.play.textContent = this.playing ? "❚❚" : "▶";
    if (!this.playing) return;
    if (this.time >= this.data.summary.total_minutes) this.time = 0;

    let last = performance.now();
    const frame = (now) => {
      if (!this.playing) return;
      const speed = Number(this.controls.speed.value) * BASE_MINUTES_PER_SECOND;
      const next = this.time + ((now - last) / 1000) * speed;
      last = now;
      if (next >= this.data.summary.total_minutes) {
        this.seek(this.data.summary.total_minutes);
        this.toggle();
        return;
      }
      this.seek(next);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  highlight(id) {
    this.marchers?.forEach((group, key) => group.classList.toggle("highlight", key === id));
  }
}
