import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

const USER_TYPES = [
  { value: "customer", label: "개인회원", icon: "🛒", desc: "상품 구매 · 리뷰" },
  { value: "seller", label: "사업자회원", icon: "🏷️", desc: "상품 등록 · 판매" },
];

const initialForm = {
  user_type: "customer",
  email: "",
  name: "",
  nickname: "",
  password: "",
  confirmPassword: "",
  address: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;

const validate = (formData) => {
  const { email, name, password, confirmPassword, user_type } = formData;

  if (!user_type) return "회원구분을 선택해주세요.";
  if (!email.trim() || !name.trim() || !password.trim()) {
    return "이메일, 이름, 비밀번호는 필수 입력 항목입니다.";
  }
  if (name.trim().length === 0) return "이름에 공백만 입력할 수 없습니다.";
  if (!EMAIL_REGEX.test(email.trim())) {
    return "올바른 이메일 형식이 아닙니다. (예: example@domain.com)";
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
  }
  if (!PASSWORD_REGEX.test(password)) {
    return "비밀번호는 영문과 숫자를 모두 포함해야 합니다.";
  }
  if (password !== confirmPassword) {
    return "비밀번호와 비밀번호 확인이 일치하지 않습니다.";
  }
  return null;
};

function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasConfirmInput = formData.confirmPassword.length > 0;
  const isPasswordMatched = formData.password === formData.confirmPassword;
  const isCustomer = formData.user_type === "customer";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const { confirmPassword, ...payload } = formData;
      if (!isCustomer) delete payload.address;

      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "회원가입에 실패했습니다.");
      }

      setSuccess(data.message || "회원가입이 완료되었습니다.");
      setFormData(initialForm);
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
    <main className="signup-page">
      <section className="signup-container">
        <p className="brand">
          <span>VIBE</span> CODING
        </p>

        <h1 className="signup-title">SIGN UP</h1>
        <p className="signup-subtitle">회원가입</p>

        <form className="signup-form" onSubmit={handleSubmit}>
          {/* 회원구분 */}
          <div className="user-type-section">
            <div className="user-type-cards">
              {USER_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`user-type-card${formData.user_type === type.value ? " active" : ""}`}
                  onClick={() => setFormData((prev) => ({ ...prev, user_type: type.value }))}
                >
                  <span className="user-type-icon">{type.icon}</span>
                  <span className="user-type-label">{type.label}</span>
                  <span className="user-type-desc">{type.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 이메일 */}
          <label className="input-label" htmlFor="email">이메일*</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="example@domain.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          {/* 이름 */}
          <label className="input-label" htmlFor="name">이름*</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="이름을 입력하세요"
            value={formData.name}
            onChange={handleChange}
            required
          />

          {/* 닉네임 */}
          <label className="input-label" htmlFor="nickname">닉네임</label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            placeholder="닉네임을 입력하세요 (선택)"
            value={formData.nickname}
            onChange={handleChange}
          />

          {/* 비밀번호 */}
          <label className="input-label" htmlFor="password">비밀번호*</label>
          <div className="password-wrap">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="영문 + 숫자 조합, 8자 이상"
              value={formData.password}
              onChange={handleChange}
              required
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

          {/* 비밀번호 확인 */}
          <label className="input-label" htmlFor="confirmPassword">비밀번호 확인*</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호를 다시 입력하세요"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
          {hasConfirmInput &&
            (isPasswordMatched ? (
              <p className="password-match success">✓ 비밀번호가 일치합니다.</p>
            ) : (
              <p className="password-match error">비밀번호가 일치하지 않습니다.</p>
            ))}

          {/* 주소 (customer만 표시) */}
          {isCustomer && (
            <>
              <label className="input-label" htmlFor="address">주소</label>
              <input
                id="address"
                name="address"
                type="text"
                placeholder="배송지 주소를 입력하세요 (선택)"
                value={formData.address}
                onChange={handleChange}
              />
            </>
          )}

          {error && <p className="message error">{error}</p>}
          {success && <p className="message success">{success}</p>}

          <button type="submit" className="submit-button" disabled={submitting}>
            {submitting ? "가입중..." : "가입하기"}
          </button>
        </form>

        <div className="signup-footer">
          <span>이미 계정이 있으신가요?</span>
          <button type="button" onClick={() => navigate("/login")} className="login-link">
            로그인하기
          </button>
        </div>
      </section>
    </main>
  );
}

export default SignupPage;
