export function saveAuth({ token, user }) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}
export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
export function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}
export function isLoggedIn() {
  return !!localStorage.getItem("token");
}
