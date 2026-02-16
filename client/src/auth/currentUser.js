import { normalizeRole } from "./rolePermissions";

const decodeJwtPayload = (token) => {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payloadJson = atob(padded);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
};

const getCurrentUser = () => {
  const fallback = {
    id: null,
    name: "Guest",
    email: "",
    role: "student",
    priority: 1,
  };

  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const role = normalizeRole(parsedUser.role);
      return { ...fallback, ...parsedUser, role };
    }

    const token = localStorage.getItem("token");
    const payload = decodeJwtPayload(token);
    if (payload) {
      const role = normalizeRole(payload.role);
      return {
        ...fallback,
        id: payload.id || null,
        role,
        priority: payload.priority || fallback.priority,
      };
    }
  } catch {
    return fallback;
  }

  return fallback;
};

const isAuthenticated = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const payload = decodeJwtPayload(token);
    if (!payload || !payload.id) return false;

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export { getCurrentUser, isAuthenticated, clearAuth };
