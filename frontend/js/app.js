import { ApiClient } from "./api.js";
import { LineupBoard } from "./lineup.js";
import { NarrativeView } from "./narrative.js";
import { RouteView } from "./route.js";
import { LinkedListStrip } from "./strip.js";
import { duration } from "./util.js";

const $ = (selector) => document.querySelector(selector);

class App {
  constructor() {
    this.api = new ApiClient();
    this.snapshot = null;
    this.narrative = new NarrativeView($("#narrative"));
    this.strip = new LinkedListStrip($("#strip"));
    this.route = new RouteView($("#route"), {
      play: $("#play-btn"), range: $("#timeline"), clock: $("#clock"),
      speed: $("#speed"), status: $("#route-status"),
    });
    this.board = new LineupBoard($("#lineup"), $("#palette"), {
      onMove: (id, targetId, place) =>
        this.run("POST", "/parade/move", { participant_id: id, target_id: targetId, place }),
      onCreate: (category, anchorId, place) => this.createFromPalette(category, anchorId, place),
      onDelete: (p) => this.run("DELETE", `/participants/${p.id}`, null, `Se retiró ${p.name}`),
      onRename: (p, name) => this.run("PATCH", `/participants/${p.id}`, { name, theme: p.theme }),
      onHover: (id) => { this.route.highlight(id); this.strip.highlight(id); },
    });
    this.bindToolbar();
  }

  async start() {
    try {
      this.render(await this.api.send("GET", "/parade"));
    } catch (error) {
      this.toast(`No se pudo cargar el desfile: ${error.message}`, true);
    }
  }

  /** Calls the API and re-renders every view with the new snapshot. */
  async run(method, path, body, successMessage) {
    try {
      this.render(await this.api.send(method, path, body ?? undefined));
      if (successMessage) this.toast(successMessage);
    } catch (error) {
      this.toast(error.message, true);
    }
  }

  render(snapshot) {
    this.snapshot = snapshot;
    const { summary } = snapshot;
    $("#summary").innerHTML = `
      <div><b>${summary.groups}</b><span>grupos</span></div>
      <div><b>${summary.members}</b><span>personas</span></div>
      <div><b>${duration(summary.total_minutes)}</b><span>duración</span></div>
      <div><b>${summary.end_time}</b><span>llega el último · 🚛 calle limpia ${summary.clean_time}</span></div>
      <div><b>${summary.rests}</b><span>paradas de descanso</span></div>
      <div class="${summary.warnings ? "bad" : "good"}"><b>${summary.warnings}</b><span>${summary.warnings ? "problemas de orden" : "orden válido ✔"}</span></div>`;
    $("#start-time").value = snapshot.start_time;
    $("#route-name").textContent = snapshot.route.name;
    $("#category-select").innerHTML = snapshot.categories
      .map((c) => `<option value="${c.value}">${c.icon} ${c.label}</option>`).join("");

    this.board.render(snapshot.participants, snapshot.categories);
    this.route.setData(snapshot);
    this.narrative.render(snapshot);
    this.strip.render(snapshot.participants);
  }

  createFromPalette(category, anchorId, place) {
    const info = this.snapshot.categories.find((c) => c.value === category);
    const count = this.snapshot.participants.filter((p) => p.category === category).length + 1;
    const defaultMembers = { individual: 1, ad_cart: 2, float: 15, motor_float: 15 };
    const members = defaultMembers[category] ?? 25;
    this.run("POST", "/participants",
      { name: `${info.label} ${count}`, category, members, anchor_id: anchorId, place },
      "Grupo creado. Doble clic en su nombre para renombrarlo.");
  }

  bindToolbar() {
    $("#arrange-btn").addEventListener("click", () =>
      this.run("POST", "/parade/arrange", null, "Desfile reorganizado por bloques respetando las reglas"));
    $("#reset-btn").addEventListener("click", () =>
      this.run("POST", "/parade/reset", null, "Se cargaron los datos de ejemplo"));
    $("#start-time").addEventListener("change", (event) => {
      if (event.target.value) this.run("PUT", "/parade/settings", { start_time: event.target.value });
    });

    $("#add-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      this.run("POST", "/participants", {
        name: form.get("name"), category: form.get("category"),
        members: Number(form.get("members")) || 1, theme: form.get("theme"),
      }, "Grupo agregado al final del desfile");
      event.target.reset();
    });

    const toggle = $("#theme-toggle");
    const applyTheme = (theme) => {
      document.documentElement.dataset.theme = theme;
      toggle.textContent = theme === "negros" ? "🤍 Día de Blancos" : "🖤 Día de Negros";
      try { localStorage.setItem("parade-theme", theme); } catch { /* storage unavailable */ }
    };
    let saved = null;
    try { saved = localStorage.getItem("parade-theme"); } catch { /* storage unavailable */ }
    applyTheme(saved || "blancos");
    toggle.addEventListener("click", () =>
      applyTheme(document.documentElement.dataset.theme === "negros" ? "blancos" : "negros"));
  }

  toast(message, isError = false) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.className = `toast show ${isError ? "error" : ""}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }
}

new App().start();
