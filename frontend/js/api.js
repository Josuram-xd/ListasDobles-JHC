export class ApiClient {
  constructor(base = "/api") {
    this.base = base;
  }

  async send(method, path, body) {
    const response = await fetch(this.base + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join(", ") : data.detail;
      throw new Error(detail || `Error ${response.status}`);
    }
    return data;
  }
}
