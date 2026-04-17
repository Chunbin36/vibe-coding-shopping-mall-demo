import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const API_BASE_URL = "http://localhost:5000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setError("이메일을 입력해주세요.");
      emailRef.current?.focus();
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("올바른 이메일 형식이 아닙니다. (예: example@domain.com)");
      emailRef.current?.focus();
      return;
    }

    if (!trimmedPassword) {
      setError("비밀번호를 입력해주세요.");
      passwordRef.current?.focus();
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "로그인에 실패했습니다.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (submitError) {
      if (submitError instanceof TypeError && submitError.message === "Failed to fetch") {
        setError("네트워크 연결을 확인해주세요.");
      } else {
        setError(submitError.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-container">
        <p className="brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <span>VIBE</span> CODING
        </p>

        <h1 className="auth-title">LOGIN</h1>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="input-label" htmlFor="email">이메일</label>
          <input
            ref={emailRef}
            id="email"
            type="email"
            placeholder="example@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <label className="input-label" htmlFor="password">비밀번호</label>
          <div className="password-wrap">
            <input
              ref={passwordRef}
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="영문 + 숫자 조합, 8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label="비밀번호 표시 전환"
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>

          {error && <p className="message error">{error}</p>}

          <button type="submit" className="login-submit-button" disabled={submitting}>
            {submitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="login-promo">
          <p>회원가입을 통해 <strong>할인 · 멤버십 혜택</strong>을 누리세요!</p>
        </div>

        <button
          type="button"
          className="signup-navigate-button"
          onClick={() => navigate("/signup")}
        >
          회원가입
        </button>

        <div className="login-footer-links">
          <button type="button">비회원 주문조회</button>
          <span className="divider">|</span>
          <button type="button">아이디찾기</button>
          <span className="divider">|</span>
          <button type="button">비밀번호찾기</button>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
