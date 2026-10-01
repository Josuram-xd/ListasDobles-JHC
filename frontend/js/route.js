import { CleanupCrew } from "./cleanup.js";
import { clockAt, escapeHtml, svg, trackPosition } from "./util.js";

const ROUTE_PATH = "M 60 395 C 190 400 170 300 300 300 S 470 360 520 290 S 520 175 420 160 S 250 130 300 80 S 540 40 735 70";
const BASE_MINUTES_PER_SECOND = 4;

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
    const litterLayer = svg("g", {}, this.svg);
    this.checkpointLayer = svg("g", {}, this.svg);
    const truckLayer = svg("g", {}, this.svg);
    this.marcherLayer = svg("g", {}, this.svg);
    this.pathLength = this.path.getTotalLength();
    this.cleanupCrew = new CleanupCrew(litterLayer, truckLayer, this.path);
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
      const group = svg("g", { class: `marcher cat-${p.category}${p.is_ad ? " ad" : ""}`, "data-id": p.id }, this.marcherLayer);
      svg("title", {}, group).textContent = `${p.position}. ${p.name}${p.theme ? ` — ${p.theme}` : ""}`;
      if (p.is_ad) {
        // small advertising cart: a rounded box with wheels and a flag
        svg("rect", { x: -13, y: -9, width: 26, height: 16, rx: 4, class: "marcher-body" }, group);
        svg("circle", { cx: -7, cy: 9, r: 3.5, class: "wheel" }, group);
        svg("circle", { cx: 7, cy: 9, r: 3.5, class: "wheel" }, group);
        svg("text", { class: "marcher-icon small", "text-anchor": "middle", dy: "4" }, group).textContent = p.icon;
      } else {
        svg("circle", { r: 17, class: "marcher-body" }, group);
        svg("text", { class: "marcher-icon", "text-anchor": "middle", dy: "6" }, group).textContent = p.icon;
        svg("circle", { r: 8, cx: 13, cy: -13, class: "marcher-badge" }, group);
        svg("text", { x: 13, y: -10, class: "marcher-number", "text-anchor": "middle" }, group).textContent = p.position;
      }
      const bubble = svg("g", { class: "rest-bubble", transform: "translate(-20 -26)" }, group);
      svg("rect", { x: -13, y: -11, width: 26, height: 20, rx: 10 }, bubble);
      svg("text", { "text-anchor": "middle", dy: "4" }, bubble).textContent = "☕";
      this.marchers.set(p.id, group);
    });
    this.cleanupCrew.setData(snapshot.cleanup);
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
    time = Math.min(Math.max(0, time), this.data.summary.total_minutes);
    this.time = time;
    this.controls.range.value = time;
    this.controls.clock.textContent = clockAt(this.data.start_time, time);

    const routeLength = this.data.route.length;
    const counts = { waiting: 0, marching: 0, resting: 0, arrived: 0 };
    for (const p of this.data.participants) {
      const meters = trackPosition(p.schedule.track, time);
      const resting = p.schedule.rests.some((rest) => time >= rest.start && time < rest.end);
      const marcher = this.marchers.get(p.id);
      const state = meters <= 0 ? "waiting" : meters >= routeLength ? "arrived" : resting ? "resting" : "marching";
      marcher.dataset.state = state;
      counts[state]++;
      if (state === "marching" || state === "resting") {
        const point = this.path.getPointAtLength((meters / routeLength) * this.pathLength);
        marcher.setAttribute("transform", `translate(${point.x} ${point.y})`);
      }
    }
    this.controls.status.innerHTML =
      `⏳ En espera: <b>${counts.waiting}</b> · 🎉 Desfilando: <b>${counts.marching}</b>` +
      ` · ☕ Descansando: <b>${counts.resting}</b> · 🏁 Llegaron: <b>${counts.arrived}</b>` +
      ` · Recorrido de <b>${(routeLength / 1000).toFixed(1)} km</b> (${escapeHtml(this.data.route.name)})`;

    const leader = this.data.participants[0];
    const leaderMeters = leader ? trackPosition(leader.schedule.track, time) : 0;
    const cleanupStatus = this.cleanupCrew.update(time, leaderMeters, routeLength);
    if (cleanupStatus) this.controls.status.innerHTML += `<br>${cleanupStatus}`;
  }

  toggle() {
    if (!this.data) return;
    this.playing = !this.playing;
    this.controls.play.textContent = this.playing ? "❚❚" : "▶";
    // always stop the previous loop so two loops never run at the same time
    cancelAnimationFrame(this.frameId);
    if (!this.playing) return;
    if (this.time >= this.data.summary.total_minutes) this.seek(0);

    let last = null;
    const frame = (now) => {
      if (!this.playing) return;
      // the first frame only sets the reference: its timestamp can be earlier than
      // performance.now() at click time, which made the time go negative
      const elapsed = last === null ? 0 : Math.max(0, now - last);
      last = now;
      const speed = Number(this.controls.speed.value) * BASE_MINUTES_PER_SECOND;
      const next = this.time + (elapsed / 1000) * speed;
      if (next >= this.data.summary.total_minutes) {
        this.seek(this.data.summary.total_minutes);
        this.toggle();
        return;
      }
      this.seek(next);
      this.frameId = requestAnimationFrame(frame);
    };
    this.frameId = requestAnimationFrame(frame);
  }

  highlight(id) {
    this.marchers?.forEach((group, key) => group.classList.toggle("highlight", key === id));
  }
}
