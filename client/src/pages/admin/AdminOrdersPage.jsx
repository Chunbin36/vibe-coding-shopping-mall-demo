import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import AdminSidebar from "../../components/AdminSidebar";

const API_BASE_URL = "http://localhost:5000";
const PAGE_LIMIT = 10;

const PAYMENT_LABEL = {
  card: "신용카드",
  bank_transfer: "실시간 이체",
  kakao_pay: "카카오페이",
  naver_pay: "네이버페이",
};

const STATUS_LABEL = {
  pending: "결제 대기",
  paid: "결제완료",
  preparing: "상품 준비",
  shipping: "배송중",
  delivered: "배송완료",
  cancelled: "취소",
  refunded: "환불 완료",
};

const today = new Date()
  .toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  .replace(/\. /g, ".")
  .replace(/\.$/, "");

function formatOrderDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\. /g, ".")
    .replace(/\.$/, "");
}

/** @param {number} current 1-based @param {number} total */
function getPageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const win = new Set([1, total]);
  for (let p = current - 2; p <= current + 2; p++) {
    if (p >= 1 && p <= total) win.add(p);
  }
  return [...win].sort((a, b) => a - b);
}

function summarizeItems(items) {
  if (!items?.length) return "—";
  const first = items[0].name || "상품";
  if (items.length === 1) return first;
  return `${first} 외 ${items.length - 1}점`;
}

function buildOrdersCsv(rows) {
  const header = [
    "주문번호",
    "구매자",
    "작품",
    "결제금액",
    "결제수단",
    "주문일",
    "상태",
  ];
  const lines = [header.join(",")];
  for (const o of rows) {
    const buyer = o.user?.name || o.user?.email || "";
    const amt =
      o.status === "refunded"
        ? "환불 완료"
        : `${(o.payment?.totalAmount ?? 0).toLocaleString()}원`;
    lines.push(
      [
        o.orderNumber || o._id,
        `"${String(buyer).replace(/"/g, '""')}"`,
        `"${summarizeItems(o.items).replace(/"/g, '""')}"`,
        amt,
        PAYMENT_LABEL[o.payment?.method] || o.payment?.method || "",
        formatOrderDate(o.createdAt),
        STATUS_LABEL[o.status] || o.status,
      ].join(",")
    );
  }
  return "\uFEFF" + lines.join("\n");
}

const PERIOD_OPTIONS = [
  { value: "month", label: "최근 1개월" },
  { value: "3months", label: "최근 3개월" },
  { value: "year", label: "최근 1년" },
  { value: "all", label: "전체 기간" },
];

const STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "pending", label: "결제 대기" },
  { value: "paid", label: "결제완료" },
  { value: "preparing", label: "상품 준비" },
  { value: "shipping", label: "배송중" },
  { value: "delivered", label: "배송완료" },
  { value: "cancelled", label: "취소" },
  { value: "refunded", label: "환불" },
  { value: "cancel_return", label: "취소/반품" },
];

/** Order 모델 enum과 동일 — 관리자 상태 변경용 */
const EDITABLE_STATUS_ORDER = [
  "pending",
  "paid",
  "preparing",
  "shipping",
  "delivered",
  "cancelled",
  "refunded",
];

function AdminOrdersPage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const token = localStorage.getItem("token");

  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    all: 0,
    pending: 0,
    preparing: 0,
    shipping: 0,
    cancelReturn: 0,
  });
  const [kpiActive, setKpiActive] = useState("all");

  const [period, setPeriod] = useState("month");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [listRefresh, setListRefresh] = useState(0);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [statusChangeError, setStatusChangeError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.user_type !== "admin") {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  const fetchStats = useCallback(() => {
    if (!token) return;
    const params = new URLSearchParams();
    params.set("period", period);
    fetch(`${API_BASE_URL}/api/orders/admin/stats?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, [token, period]);

  useEffect(() => {
    if (loading || !user || user.user_type !== "admin") return;
    fetchStats();
  }, [loading, user, fetchStats]);

  useEffect(() => {
    if (loading || !user || user.user_type !== "admin") return;
    if (!token) return;

    const controller = new AbortController();
    setFetching(true);
    setError("");

    const params = new URLSearchParams();
    params.set("page", page);
    params.set("limit", PAGE_LIMIT);
    params.set("period", period);
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());

    fetch(`${API_BASE_URL}/api/orders/all?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (res.status === 403) throw new Error("권한이 없습니다.");
        if (!res.ok) throw new Error("주문 목록을 불러올 수 없습니다.");
        return res.json();
      })
      .then((data) => {
        setOrders(data.orders || []);
        setTotalCount(data.totalCount ?? 0);
        setTotalPages(data.totalPages ?? 1);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setFetching(false));

    return () => controller.abort();
  }, [loading, user, token, page, period, statusFilter, search, listRefresh]);

  const changeOrderStatus = async (orderId, newStatus) => {
    if (!token) return;
    setUpdatingStatusId(orderId);
    setStatusChangeError("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "상태를 변경할 수 없습니다.");
      }
      setListRefresh((n) => n + 1);
      fetchStats();
    } catch (err) {
      setStatusChangeError(err.message || "상태 변경에 실패했습니다.");
      setListRefresh((n) => n + 1);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const applySearch = (e) => {
    e?.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleKpiClick = (key, statusValue) => {
    setKpiActive(key);
    setStatusFilter(statusValue);
    setPage(1);
  };

  const handleStatusDropdown = (e) => {
    const v = e.target.value;
    setStatusFilter(v);
    setKpiActive(
      v === ""
        ? "all"
        : v === "pending"
          ? "pending"
          : v === "preparing"
            ? "preparing"
            : v === "shipping"
              ? "shipping"
              : v === "cancel_return"
                ? "cancel"
                : "custom"
    );
    setPage(1);
  };

  const handleExportCsv = () => {
    const blob = new Blob([buildOrdersCsv(orders)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePeriodChange = (e) => {
    setPeriod(e.target.value);
    setPage(1);
  };

  if (loading || !user || user.user_type !== "admin") return null;

  const periodSub =
    period === "month"
      ? "이번 달"
      : period === "3months"
        ? "최근 3개월"
        : period === "year"
          ? "최근 1년"
          : "전체";

  return (
    <div className="admin-layout">
      <AdminSidebar user={user} activeKey="orders" onLogout={logout} />

      <main className="admin-main admin-orders-main">
        <header className="admin-orders-header">
          <h1 className="admin-orders-header-label">ORDER MANAGEMENT</h1>
          <span className="admin-header-date">{today}</span>
        </header>

        <section className="admin-orders-hero">
          <h2 className="admin-orders-title">ORDERS</h2>
          <p className="admin-orders-sub">
            전체 주문 {stats.all.toLocaleString()}건
            <span className="admin-orders-sub-muted"> · {periodSub} 기준</span>
          </p>
        </section>

        <div className="admin-orders-kpi-row">
          <button
            type="button"
            className={`admin-orders-kpi${kpiActive === "all" ? " admin-orders-kpi--active" : ""}`}
            onClick={() => handleKpiClick("all", "")}
          >
            <span className="admin-orders-kpi-label">전체</span>
            <span className="admin-orders-kpi-value">{stats.all}</span>
            <span className="admin-orders-kpi-hint">{periodSub}</span>
          </button>
          <button
            type="button"
            className={`admin-orders-kpi${kpiActive === "pending" ? " admin-orders-kpi--active" : ""}`}
            onClick={() => handleKpiClick("pending", "pending")}
          >
            <span className="admin-orders-kpi-label">신규</span>
            <span className="admin-orders-kpi-value">{stats.pending}</span>
            <span className="admin-orders-kpi-hint">처리 대기</span>
          </button>
          <button
            type="button"
            className={`admin-orders-kpi${kpiActive === "preparing" ? " admin-orders-kpi--active" : ""}`}
            onClick={() => handleKpiClick("preparing", "preparing")}
          >
            <span className="admin-orders-kpi-label">준비 중</span>
            <span className="admin-orders-kpi-value">{stats.preparing}</span>
            <span className="admin-orders-kpi-hint">포장·발송 준비</span>
          </button>
          <button
            type="button"
            className={`admin-orders-kpi${kpiActive === "shipping" ? " admin-orders-kpi--active" : ""}`}
            onClick={() => handleKpiClick("shipping", "shipping")}
          >
            <span className="admin-orders-kpi-label">배송 중</span>
            <span className="admin-orders-kpi-value">{stats.shipping}</span>
            <span className="admin-orders-kpi-hint">배송 추적 중</span>
          </button>
          <button
            type="button"
            className={`admin-orders-kpi${kpiActive === "cancel" ? " admin-orders-kpi--active" : ""}`}
            onClick={() => handleKpiClick("cancel", "cancel_return")}
          >
            <span className="admin-orders-kpi-label">취소/반품</span>
            <span className="admin-orders-kpi-value">{stats.cancelReturn}</span>
            <span className="admin-orders-kpi-hint">취소·환불</span>
          </button>
        </div>

        <form className="admin-orders-search" onSubmit={applySearch}>
          <input
            type="search"
            className="admin-orders-search-input"
            placeholder="주문번호, 구매자명으로 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>

        <div className="admin-orders-filters">
          <select
            className="admin-orders-select"
            value={statusFilter}
            onChange={handleStatusDropdown}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="admin-orders-select"
            value={period}
            onChange={handlePeriodChange}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-orders-table-wrap">
          <div className="admin-orders-toolbar">
            <button
              type="button"
              className="admin-orders-csv"
              onClick={handleExportCsv}
            >
              CSV 내보내기
            </button>
          </div>

          {error && <p className="message error admin-orders-error">{error}</p>}
          {statusChangeError && (
            <p className="message error admin-orders-error">{statusChangeError}</p>
          )}

          <div className="admin-orders-table-card">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th className="admin-orders-th-check">
                    <span className="sr-only">선택</span>
                  </th>
                  <th>주문번호</th>
                  <th>구매자</th>
                  <th>작품</th>
                  <th>결제 금액</th>
                  <th>결제 수단</th>
                  <th>주문일</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {fetching ? (
                  <tr>
                    <td colSpan={8} className="admin-orders-td-empty">
                      불러오는 중...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="admin-orders-td-empty">
                      주문이 없습니다.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o._id}>
                      <td>
                        <input type="checkbox" disabled aria-label="선택" />
                      </td>
                      <td className="admin-orders-td-id">
                        #{o.orderNumber || o._id}
                      </td>
                      <td>
                        <span>{o.user?.name || "—"}</span>
                        {o.user?.email && (
                          <span style={{ display: "block", fontSize: "0.75rem", color: "#888" }}>
                            {o.user.email}
                          </span>
                        )}
                      </td>
                      <td className="admin-orders-td-product">
                        {summarizeItems(o.items)}
                      </td>
                      <td>
                        {o.status === "refunded" ? (
                          <span className="admin-orders-refund">환불 완료</span>
                        ) : (
                          `${(o.payment?.totalAmount ?? 0).toLocaleString()}원`
                        )}
                      </td>
                      <td>
                        {PAYMENT_LABEL[o.payment?.method] ||
                          o.payment?.method ||
                          "—"}
                      </td>
                      <td>{formatOrderDate(o.createdAt)}</td>
                      <td className="admin-orders-td-status">
                        <select
                          className="admin-orders-status-select"
                          value={o.status}
                          disabled={fetching || updatingStatusId === o._id}
                          aria-label={`주문 ${o.orderNumber || o._id} 상태`}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (next === o.status) return;
                            changeOrderStatus(o._id, next);
                          }}
                        >
                          {EDITABLE_STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABEL[s] || s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="admin-orders-pagination" aria-label="페이지">
              <button
                type="button"
                className="admin-orders-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {getPageWindow(page, totalPages).map((n, idx, arr) => {
                const prev = arr[idx - 1];
                const showGap = idx > 0 && n - prev > 1;
                return (
                  <span key={`${n}-${idx}`} className="admin-orders-page-nums">
                    {showGap && (
                      <span className="admin-orders-page-ellipsis" aria-hidden>
                        …
                      </span>
                    )}
                    <button
                      type="button"
                      className={`admin-orders-page-num${n === page ? " admin-orders-page-num--on" : ""}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                className="admin-orders-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </nav>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminOrdersPage;
