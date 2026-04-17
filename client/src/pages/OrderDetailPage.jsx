import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_BASE_URL = "http://localhost:5000";

const PAYMENT_LABEL = {
  card: "신용·체크카드",
  bank_transfer: "무통장입금",
  kakao_pay: "카카오페이",
  naver_pay: "네이버페이",
};

const ORDER_STATUS_LABEL = {
  pending: "결제 대기",
  paid: "결제완료",
  preparing: "상품 준비",
  shipping: "배송중",
  delivered: "배송완료",
  cancelled: "취소",
  refunded: "환불 완료",
};

function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!token || !id) return;

    setLoading(true);
    setError("");
    fetch(`${API_BASE_URL}/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          navigate("/login", { replace: true });
          return null;
        }
        if (res.status === 404) {
          setError("주문을 찾을 수 없습니다.");
          return null;
        }
        if (!res.ok) {
          setError("주문을 불러오지 못했습니다.");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setOrder(data);
      })
      .catch(() => setError("주문을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate, token, id]);

  if (authLoading || !user) return null;

  const sa = order?.shippingAddress || {};
  const pay = order?.payment || {};
  const items = order?.items || [];
  const orderNo = order?.orderNumber || order?._id;

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

      <main className="order-result-main mypage-order-detail">
        <p className="order-detail-back">
          <Link to="/orders">← 주문 목록</Link>
        </p>

        {loading ? (
          <p className="orders-empty">불러오는 중...</p>
        ) : error ? (
          <p className="message error">{error}</p>
        ) : !order ? null : (
          <>
            <h1 className="order-detail-page-title">주문 상세</h1>
            <p className="order-detail-page-no">주문번호 #{orderNo}</p>
            <p className="order-detail-status-row">
              <span className="order-detail-status-label">주문 상태</span>
              <span
                className={`order-detail-status-badge order-detail-status-badge--${order.status}`}
              >
                {ORDER_STATUS_LABEL[order.status] || order.status}
              </span>
            </p>

            <div className="order-result-sections">
              <section className="order-detail-card">
                <h2 className="order-detail-card-title">주문 상품</h2>
                <ul className="order-line-list">
                  {items.map((line, idx) => (
                    <li
                      key={line.product?._id || line.product || idx}
                      className="order-line-item"
                    >
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
                <h2 className="order-detail-card-title">결제</h2>
                <div className="order-pay-rows">
                  <div className="order-pay-row order-pay-row--total">
                    <span>최종 결제 금액</span>
                    <span>{(pay.totalAmount ?? 0).toLocaleString()}원</span>
                  </div>
                  <div className="order-pay-row">
                    <span>결제 수단</span>
                    <span>
                      {PAYMENT_LABEL[pay.method] || pay.method || "—"}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      <Footer user={user} onLogout={logout} />
    </div>
  );
}

export default OrderDetailPage;
