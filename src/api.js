const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export async function listCharts(ownerId) {
  const url = ownerId ? `${API_URL}/charts?ownerId=${encodeURIComponent(ownerId)}` : `${API_URL}/charts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to list charts");
  return res.json();
}

export async function getChart(id) {
  const res = await fetch(`${API_URL}/charts/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch chart");
  return res.json();
}

export async function getLatestChart() {
  const res = await fetch(`${API_URL}/charts/latest`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch latest chart");
  return res.json();
}

export async function createChart(data) {
  const res = await fetch(`${API_URL}/charts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create chart");
  return res.json();
}

export async function updateChart(id, data) {
  const res = await fetch(`${API_URL}/charts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update chart");
  return res.json();
}

export async function deleteChart(id) {
  const res = await fetch(`${API_URL}/charts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete chart");
  return res.json();
}

export async function listQuickItems(ownerId) {
  const url = ownerId ? `${API_URL}/quick-items?ownerId=${encodeURIComponent(ownerId)}` : `${API_URL}/quick-items`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to list quick action items");
  return res.json();
}

export async function createQuickItem(data) {
  const res = await fetch(`${API_URL}/quick-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create quick action item");
  return res.json();
}

export async function updateQuickItem(id, data) {
  const res = await fetch(`${API_URL}/quick-items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update quick action item");
  return res.json();
}

export async function deleteQuickItem(id) {
  const res = await fetch(`${API_URL}/quick-items/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete quick action item");
  return res.json();
}