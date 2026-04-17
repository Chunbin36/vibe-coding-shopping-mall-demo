import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const PAYMENT_LABEL = {
  card: "신용·체크카드",
  bank_transfer: "무통장입금",
  kakao_pay: "카카오페이",
  naver_pay: "네이버페이",
};

function CheckoutStepper() {
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
      <div className="order-step order-step--active">
        <span className="order-step-num">3</span>
        <span className="order-step-label">주문 완료</span>
      </div>
    </div>
  );
}

function DeliveryTimeline() {
  const steps = [
    { key: "paid", label: "결제 완료", done: true },
    { key: "prep", label: "상품 준비", done: false },
    { key: "ship", label: "배송 중", done: false },
    { key: "done", label: "배송 완료", done: false },
  ];
  return (
    <div className="order-timeline">
      {steps.map((s) => (
        <div
          key={s.key}
          className={`order-timeline-item${s.done ? " order-timeline-item--done" : ""}`}
        >
          <span className="order-timeline-dot">
            {s.done ? "✓" : ""}
          </span>
          <span className="order-timeline-text">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function OrderSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const order = location.state?.order;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!order) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate, order]);

  if (authLoading || !user || !order) return null;

  const sa = order.shippingAddress || {};
  const pay = order.payment || {};
  const items = order.items || [];
  const orderNo = order.orderNumber || order._id;

  const fullAddress = [
    sa.zipCode ? `(${sa.zipCode})` : "",
    sa.address,
    sa.addressDetail,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="home-layout order-result-page">
      <Navbar user={user} onLogout={logout} />

      <main className="order-result-main">
        <CheckoutStepper />

        <div className="order-complete-hero">
          <div className="order-complete-icon" aria-hidden>
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
                d="M14 24l7 7 13-14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="order-complete-title">ORDER COMPLETE</h1>
          <p className="order-complete-sub">
            주문이 성공적으로 완료되었습니다. 소중한 작품이 곧 찾아갑니다.
          </p>
          <div className="order-number-box">
            주문번호 <strong>#{orderNo}</strong>
          </div>
        </div>

        <div className="order-result-sections">
          <section className="order-detail-card">
            <h2 className="order-detail-card-title">주문 상품</h2>
            <ul className="order-line-list">
              {items.map((line, idx) => (
                <li key={line.product?._id || line.product || idx} className="order-line-item">
                  <div className="order-line-thumb">
                    {line.image ? (
                      <img src={line.image} alt="" />
                    ) : (
                      <span className="order-line-thumb-ph">IMG</span>
                    )}
                  </div>
                  <div className="order-line-body">
                    <p className="order-line-name">{line.name}</p>
                    <p className="order-line-spec">수량 {line.quantity}개</p>
                  </div>
                  <p className="order-line-price">
                    {(line.price * line.quantity).toLocaleString()}원
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="order-detail-card">
            <h2 className="order-detail-card-title">배송 정보</h2>
            <dl className="order-dl">
              <div className="order-dl-row">
                <dt>받는 분</dt>
                <dd>{sa.name}</dd>
              </div>
              <div className="order-dl-row">
                <dt>연락처</dt>
                <dd>{sa.phone}</dd>
              </div>
              <div className="order-dl-row order-dl-row--block">
                <dt>주소</dt>
                <dd>{fullAddress}</dd>
              </div>
              {sa.memo ? (
                <div className="order-dl-row order-dl-row--block">
                  <dt>배송 메모</dt>
                  <dd>{sa.memo}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="order-detail-card">
            <h2 className="order-detail-card-title">결제 금액</h2>
            <div className="order-pay-rows">
              <div className="order-pay-row">
                <span>상품 금액</span>
                <span>{(pay.subtotal ?? 0).toLocaleString()}원</span>
              </div>
              <div className="order-pay-row">
                <span>배송비</span>
                <span>
                  {(pay.shippingFee ?? 0) === 0
                    ? "무료"
                    : `${(pay.shippingFee ?? 0).toLocaleString()}원`}
                </span>
              </div>
              <div className="order-pay-row">
                <span>할인 금액</span>
                <span>
                  −{(pay.discount ?? 0).toLocaleString()}원
                </span>
              </div>
              <div className="order-pay-row">
                <span>결제 수단</span>
                <span>{PAYMENT_LABEL[pay.method] || pay.method || "—"}</span>
              </div>
              <div className="order-pay-row order-pay-row--total">
                <span>최종 결제 금액</span>
                <span>{(pay.totalAmount ?? 0).toLocaleString()}원</span>
              </div>
            </div>
          </section>

          <section className="order-detail-card">
            <h2 className="order-detail-card-title">배송 현황</h2>
            <DeliveryTimeline />
          </section>
        </div>

        <nav className="order-result-footer-nav">
          <Link to="/orders" className="order-result-link">
            마이페이지에서 주문 확인
          </Link>
          <Link to="/" className="order-result-link order-result-link--primary">
            쇼핑 계속하기
          </Link>
          <Link to="/orders" className="order-result-link order-result-link--muted">
            주문 취소 요청
          </Link>
        </nav>
      </main>

      <Footer user={user} onLogout={logout} />
    </div>
  );
}

export default OrderSuccessPage;
