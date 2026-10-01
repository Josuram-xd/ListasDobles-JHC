const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

export function clockAt(startTime, minutes) {
  const [hours, mins] = startTime.split(":").map(Number);
  const total = Math.round(hours * 60 + mins + minutes);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

export function duration(minutes) {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  return hours ? `${hours} h ${total % 60} min` : `${total} min`;
}

export const SEVERITY_ICON = { error: "⛔", warning: "⚠️", info: "💡" };

const SVG_NS = "http://www.w3.org/2000/svg";

export function svg(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  if (parent) parent.appendChild(el);
  return el;
}

/** Position (meters) at a given minute, interpolating the samples of the simulation. */
export function trackPosition(track, time) {
  const exact = time / track.every;
  const index = Math.min(Math.floor(exact), track.positions.length - 1);
  const next = Math.min(index + 1, track.positions.length - 1);
  const from = track.positions[index];
  return from + (track.positions[next] - from) * (exact - index);
}
