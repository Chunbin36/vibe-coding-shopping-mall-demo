/**
 * 백엔드 API 베이스 URL (호스트만 — 경로에 `/api` 포함하지 않음).
 * 프로덕션: VITE_API_BASE_URL = https://your-app.herokuapp.com
 * (`.../api` 로 넣어도 자동으로 제거해 `/api/api/...` 중복을 막음)
 * 로컬: 비우면 http://localhost:5000
 */
function readApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== "string") return "http://localhost:5000";
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/\/+$/, "");
  // 실수로 .../api 까지 넣은 경우 (코드가 /api/... 를 붙이므로 중복 방지)
  s = s.replace(/\/api$/i, "");
  s = s.replace(/\/+$/, "");
  return s || "http://localhost:5000";
}

export const API_BASE_URL = readApiBaseUrl();
