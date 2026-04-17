/**
 * 백엔드 API 베이스 URL.
 * 프로덕션(Vercel 등): 환경 변수 VITE_API_BASE_URL = https://your-api.herokuapp.com (끝 슬래시 없이)
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
  s = s.replace(/\/$/, "");
  return s || "http://localhost:5000";
}

export const API_BASE_URL = readApiBaseUrl();
