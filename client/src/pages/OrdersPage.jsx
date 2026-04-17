import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { API_BASE_URL } from "../config/api";

const PAYMENT_LABEL = {
  card: "신용카드",
  bank_transfer: "무통장입금",
  kakao_pay: "카카오페이",
  naver_pay: "네이버페이",
};

const FILTER_TABS = [
  { id: "all", label: "전체", match: () => true },
  {
    id: "paid",
    label: "결제완료",
    match: (s) => s === "paid" || s === "preparing",
  },
  { id: "shipping", label: "배송중", match: (s) => s === "shipping" },
  { id: "delivered", label: "배송완료", match: (s) => s === "delivered" },
  {
    id: "cancel",
    label: "취소/반품",
    match: (s) => s === "cancelled" || s === "refunded",
  },
];

function statusBadgeClass(status) {
  if (status === "shipping") return "orders-status orders-status--ship";
  if (status === "delivered") return "orders-status orders-status--done";
  if (status === "cancelled" || status === "refunded") {
    return "orders-status orders-status--cancel";
  }
  return "orders-status";
}

function statusLabel(status) {
  const map = {
    pending: "결제 대기",
    paid: "결제완료",
    preparing: "상품 준비",
    shipping: "배송중",
    delivered: "배송완료",
    cancelled: "취소완료",
    refunded: "환불 완료",
  };
  return map[status] || status;
}

function formatOrderDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

const PAGE_SIZE = 4;

function MypageSidebar({ user, active }) {
  const initial = (user?.name || user?.email || "?").trim().charAt(0) || "?";
  const tier =
    user?.user_type === "admin"
      ? "관리자"
      : user?.user_type === "seller"
        ? "판매 회원"
        : "일반 회원";

  const items = [
    { to: "/orders", label: "주문 내역", key: "orders" },
    { to: "/", label: "위시리스트", key: "wish", disabled: true },
    { to: "/mypage", label: "회원 정보", key: "info", disabled: true },
    { to: "/", label: "배송지 관리", key: "addr", disabled: true },
    { to: "/", label: "최근 본 작품", key: "recent", disabled: true },
  ];

  return (
    <aside className="mypage-sidebar">
      <div className="mypage-profile">
        <div className="mypage-avatar" aria-hidden>
          {initial}
        </div>
        <p className="mypage-name">{user?.name || "회원"}</p>
        <p className="mypage-tier">{tier}</p>
      </div>
      <nav className="mypage-nav" aria-label="마이페이지 메뉴">
        <ul>
          {items.map((item) => (
            <li key={item.key}>
              {item.disabled ? (
                <span className="mypage-nav-link mypage-nav-link--disabled">
                  <span className="mypage-nav-line" />
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className={`mypage-nav-link${active === item.key ? " mypage-nav-link--active" : ""}`}
                >
                  <span className="mypage-nav-line" />
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function OrdersPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterId, setFilterId] = useState("all");
  const [page, setPage] = useState(1);

  const token = localStorage.getItem("token");

  const fetchOrders = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    fetch(`${API_BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          navigate("/login", { replace: true });
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setOrders(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("주문 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    fetchOrders();
  }, [user, authLoading, navigate, fetchOrders]);

  const tabDef = FILTER_TABS.find((t) => t.id === filterId) || FILTER_TABS[0];

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => tabDef.match(o.status));
  }, [orders, tabDef]);

  useEffect(() => {
    setPage(1);
  }, [filterId]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / PAGE_SIZE)
  );

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages);
  const pagedOrders = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, safePage]);

  if (authLoading || !user) return null;

  return (
    <div className="home-layout mypage-layout orders-gallery-page">
      <Navbar user={user} onLogout={logout} />

      <div className="mypage-shell">
        <MypageSidebar user={user} active="orders" />

        <main className="mypage-main">
          <nav className="checkout-gal-breadcrumb" aria-label="경로">
            <Link to="/">홈</Link>
            <span className="checkout-gal-bc-sep">/</span>
            <span>주문 내역</span>
          </nav>

          <header className="mypage-main-head">
            <h1 className="mypage-orders-title">ORDERS</h1>
            <p className="mypage-orders-summary">
              총 {filteredOrders.length}건의 주문 내역
            </p>
          </header>

          <div className="orders-filter-tabs" role="tablist">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filterId === tab.id}
                className={`orders-filter-tab${filterId === tab.id ? " orders-filter-tab--active" : ""}`}
                onClick={() => setFilterId(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <p className="message error orders-list-error">{error}</p>
          )}

          {loading ? (
            <p className="orders-empty">불러오는 중...</p>
          ) : pagedOrders.length === 0 ? (
            <p className="orders-empty">해당하는 주문 내역이 없습니다.</p>
          ) : (
            <ul className="orders-card-list">
              {pagedOrders.map((order) => (
                <li key={order._id} className="orders-card">
                  <div className="orders-card-head">
                    <div className="orders-card-meta">
                      <span className="orders-card-date">
                        {formatOrderDate(order.createdAt)}
                      </span>
                      <span className="orders-card-no">
                        #{order.orderNumber || order._id}
                      </span>
                    </div>
                    <span className={statusBadgeClass(order.status)}>
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <ul className="orders-card-items">
                    {(order.items || []).map((line, idx) => (
                      <li
                        key={`${order._id}-${line.product}-${idx}`}
                        className="orders-card-line"
                      >
                        <div className="orders-card-thumb">
                          {line.image ? (
                            <img src={line.image} alt="" />
                          ) : (
                            <span className="orders-card-thumb-ph" />
                          )}
                        </div>
                        <div className="orders-card-body">
                          <p className="orders-card-pname">{line.name}</p>
                          <p className="orders-card-spec">
                            {(line.price ?? 0).toLocaleString()}원 · 수량{" "}
                            {line.quantity}개
                          </p>
                        </div>
                        <div className="orders-card-price-block">
                          <span className="orders-card-price">
                            {(line.price * line.quantity).toLocaleString()}원
                          </span>
                          <span className="orders-card-qty">{line.quantity}점</span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="orders-card-foot">
                    <p className="orders-card-total">
                      총 {(order.payment?.totalAmount ?? 0).toLocaleString()}원 ·{" "}
                      {PAYMENT_LABEL[order.payment?.method] ||
                        order.payment?.method ||
                        "—"}
                    </p>
                    <div className="orders-card-actions">
                      {order.status === "cancelled" ||
                      order.status === "refunded" ? (
                        <span className="orders-card-refund-note">
                          {order.status === "refunded"
                            ? "환불 완료"
                            : "취소됨"}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="orders-btn orders-btn--ghost"
                            onClick={() => {
                              window.alert(
                                "배송 조회는 택배사 연동 후 제공됩니다."
                              );
                            }}
                          >
                            배송조회
                          </button>
                          {order.status === "delivered" && (
                            <button
                              type="button"
                              className="orders-btn orders-btn--ghost"
                              onClick={() => {
                                window.alert("리뷰 작성은 준비 중입니다.");
                              }}
                            >
                              리뷰작성
                            </button>
                          )}
                        </>
                      )}
                      <Link
                        to={`/orders/${order._id}`}
                        className="orders-btn orders-btn--ghost"
                      >
                        주문상세
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <nav className="orders-pagination" aria-label="페이지">
              <button
                type="button"
                className="orders-page-btn"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`orders-page-num${n === safePage ? " orders-page-num--active" : ""}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="orders-page-btn"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </nav>
          )}
        </main>
      </div>

      <Footer user={user} onLogout={logout} />
    </div>
  );
}

export default OrdersPage;
