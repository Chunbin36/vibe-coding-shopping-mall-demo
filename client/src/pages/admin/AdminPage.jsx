import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import AdminSidebar from "../../components/AdminSidebar";

const STATS = [
  { label: "총 매출", value: "4,820", unit: "만원", change: "↑ 12% 지난 달 대비", positive: true },
  { label: "신규 주문", value: "38", unit: "", change: "↑ 5건 어제 대비", positive: true },
  { label: "등록 상품", value: "214", unit: "", change: "이번 주 +6건", positive: true },
  { label: "활동 판매자", value: "47", unit: "", change: "↑ 신규 3명", positive: true },
];

const RECENT_ORDERS = [
  { id: "#2024", product: "청자 달항아리", amount: "320,000", status: "신규", statusClass: "new" },
  { id: "#2023", product: "린넨 태피스트리", amount: "185,000", status: "배송중", statusClass: "shipping" },
  { id: "#2022", product: "옻칠 목함", amount: "540,000", status: "완료", statusClass: "done" },
  { id: "#2021", product: "유리 화병 세트", amount: "96,000", status: "취소", statusClass: "cancel" },
  { id: "#2020", product: "황동 촛대", amount: "210,000", status: "신규", statusClass: "new" },
];

const POPULAR_PRODUCTS = [
  { icon: "◎", name: "청자 달항아리", seller: "김유진 · 도자 · 조회 482", price: "320,000원" },
  { icon: "◆", name: "린넨 태피스트리", seller: "이서연 · 직물 · 조회 371", price: "185,000원" },
  { icon: "◇", name: "옻칠 목함", seller: "박준호 · 목공예 · 조회 298", price: "540,000원" },
  { icon: "○", name: "황동 촛대", seller: "최민아 · 금속 · 조회 261", price: "210,000원" },
  { icon: "□", name: "유리 화병 세트", seller: "문다은 · 유리 · 조회 198", price: "96,000원" },
];

const WEEKLY_CHART = [
  { day: "월", value: 40 },
  { day: "화", value: 55 },
  { day: "수", value: 45 },
  { day: "목", value: 60 },
  { day: "금", value: 70 },
  { day: "토", value: 90 },
  { day: "일", value: 50 },
];

const today = new Date().toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).replace(/\. /g, ".").replace(/\.$/, "");

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    if (user.user_type !== "admin") { navigate("/", { replace: true }); }
  }, [user, loading, navigate]);

  if (loading || !user || user.user_type !== "admin") return null;

  return (
    <div className="admin-layout">
      <AdminSidebar user={user} activeKey="dashboard" onLogout={logout} />

      {/* ── Main Content ── */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <h1 className="admin-header-title">DASHBOARD</h1>
          <div className="admin-header-right">
            <span className="admin-header-date">{today}</span>
            <button type="button" className="admin-header-noti" aria-label="알림">
              🔔
            </button>
          </div>
        </header>

        {/* Overview */}
        <section className="admin-overview">
          <div className="admin-overview-top">
            <div>
              <h2 className="admin-section-title">OVERVIEW</h2>
              <p className="admin-section-desc">오늘의 현황을 확인하세요</p>
            </div>
            <button
              type="button"
              className="admin-new-product-btn"
              onClick={() => navigate("/admin/products/new")}
            >
              + 새 상품 등록
            </button>
          </div>

          <div className="admin-stats">
            {STATS.map((s) => (
              <div key={s.label} className="admin-stat-card">
                <p className="admin-stat-label">{s.label}</p>
                <p className="admin-stat-value">
                  {s.value}
                  {s.unit && <span className="admin-stat-unit"> {s.unit}</span>}
                </p>
                <p className={`admin-stat-change${s.positive ? " positive" : ""}`}>
                  {s.change}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Tables Row */}
        <div className="admin-tables-row">
          {/* Recent Orders */}
          <section className="admin-table-card">
            <div className="admin-table-header">
              <h3>최근 주문</h3>
              <button type="button" className="admin-table-link">전체 보기 →</button>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>주문번호</th>
                  <th>작품</th>
                  <th>금액</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_ORDERS.map((o) => (
                  <tr key={o.id}>
                    <td className="admin-td-id">{o.id}</td>
                    <td>{o.product}</td>
                    <td>{o.amount}</td>
                    <td>
                      <span className={`admin-status ${o.statusClass}`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Popular Products */}
          <section className="admin-table-card">
            <div className="admin-table-header">
              <h3>인기 상품</h3>
              <button type="button" className="admin-table-link">전체 보기 →</button>
            </div>
            <div className="admin-popular-list">
              {POPULAR_PRODUCTS.map((p) => (
                <div key={p.name} className="admin-popular-item">
                  <span className="admin-popular-icon">{p.icon}</span>
                  <div className="admin-popular-info">
                    <p className="admin-popular-name">{p.name}</p>
                    <p className="admin-popular-seller">{p.seller}</p>
                  </div>
                  <span className="admin-popular-price">{p.price}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Weekly Chart */}
        <section className="admin-chart-card">
          <div className="admin-table-header">
            <h3>주간 매출 추이</h3>
            <span className="admin-chart-legend">이번 주</span>
          </div>
          <div className="admin-chart">
            {WEEKLY_CHART.map((d) => (
              <div key={d.day} className="admin-chart-col">
                <div className="admin-chart-bar-wrap">
                  <div
                    className={`admin-chart-bar${d.value >= 80 ? " highlight" : ""}`}
                    style={{ height: `${d.value}%` }}
                  />
                </div>
                <span className="admin-chart-day">{d.day}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminPage;
