import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function CheckoutStepperFail() {
  return (
    <div className="order-stepper" aria-label="주문 진행 단계">
      <div className="order-step order-step--done">
        <span className="order-step-icon">✓</span>
        <span className="order-step-label">장바구니</span>
      </div>
      <span className="order-step-line" />
      <div className="order-step order-step--done">
        <span className="order-step-icon">✓</span>
        <span className="order-step-label">주문/결제</span>
      </div>
      <span className="order-step-line" />
      <div className="order-step order-step--fail">
        <span className="order-step-num">!</span>
        <span className="order-step-label">실패</span>
      </div>
    </div>
  );
}

function OrderFailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const message =
    location.state?.message ||
    "결제 또는 주문 처리 중 오류가 발생했습니다. 다시 시도해 주세요.";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  return (
    <div className="home-layout order-result-page order-result-page--fail">
      <Navbar user={user} onLogout={logout} />

      <main className="order-result-main">
        <CheckoutStepperFail />

        <div className="order-complete-hero order-fail-hero">
          <div className="order-fail-icon" aria-hidden>
            <svg viewBox="0 0 48 48" width="48" height="48">
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M16 16l16 16M32 16L16 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="order-complete-title order-fail-title">ORDER FAILED</h1>
          <p className="order-complete-sub">
            주문이 완료되지 않았습니다. 아래 내용을 확인한 뒤 다시 시도해 주세요.
          </p>
          <div className="order-fail-message-box">
            {message}
          </div>
        </div>

        <nav className="order-result-footer-nav">
          <Link to="/order" className="order-result-link order-result-link--primary">
            주문서로 돌아가기
          </Link>
          <Link to="/cart" className="order-result-link">
            장바구니로
          </Link>
          <Link to="/" className="order-result-link order-result-link--muted">
            홈으로
          </Link>
        </nav>
      </main>

      <Footer user={user} onLogout={logout} />
    </div>
  );
}

export default OrderFailPage;
