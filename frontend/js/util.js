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
