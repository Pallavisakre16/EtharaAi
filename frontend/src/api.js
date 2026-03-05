const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    let message = "Unexpected error occurred";
    try {
      const payload = await response.json();
      message = payload.detail || payload.message || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getEmployees() {
  return request("/api/employees");
}

export function createEmployee(payload) {
  return request("/api/employees", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteEmployee(employeeId) {
  return request(`/api/employees/${employeeId}`, {
    method: "DELETE",
  });
}

export function getAttendance(filters = {}) {
  const params = new URLSearchParams();
  if (filters.employee_id) params.set("employee_id", filters.employee_id);
  if (filters.date) params.set("date", filters.date);

  const suffix = params.toString() ? `?${params}` : "";
  return request(`/api/attendance${suffix}`);
}

export function createAttendance(payload) {
  return request("/api/attendance", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSummary() {
  return request("/api/dashboard/summary");
}