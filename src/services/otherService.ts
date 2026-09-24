
export const API = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");

if (!API) {
  throw new Error("VITE_API_URL must be set before building or starting the frontend.");
}
