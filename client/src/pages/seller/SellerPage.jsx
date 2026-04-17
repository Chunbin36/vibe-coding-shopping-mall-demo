import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import SellerSidebar from "../../components/SellerSidebar";

const API_BASE_URL = "http://localhost:5000";

const today = new Date()
  .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
  .replace(/\. /g, ".")
  .replace(/\.$/, "");

const CATEGORY_ICONS = { ceramic: "◎", wood: "◇", glass: "□", brass: "○", leather: "◆", fiber: "◈" };
const CATEGORY_MAP = { ceramic: "도자", wood: "목공예", glass: "유리", brass: "금속", leather: "가죽", fiber: "섬유" };

const NOTICES = [
  { title: "5월 봄 기획전 작가 모집 안내", date: "2026. 04. 10" },
  { title: "작품 사진 등록 가이드 업데이트", date: "2026. 04. 05" },
  { title: "정산 일정 안내 (4월)", date: "2026. 04. 01" },
];

function SellerPage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    if (user.user_type !== "seller") { navigate("/", { replace: true }); }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (loading || !user || user.user_type !== "seller") return;
    fetch(`${API_BASE_URL}/api/products?limit=4`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setTotalCount(data.totalCount || 0);
      })
      .catch(() => {});
  }, [loading, user]);

  if (loading || !user || user.user_type !== "seller") return null;

  return (
    <div className="seller-layout">
      <SellerSidebar user={user} activeKey="dashboard" onLogout={logout} />

      <div className="seller-main">
        <div className="seller-topbar">
          <span className="seller-topbar-title">Dashboard</span>
          <div className="seller-topbar-right">
            <span className="seller-topbar-date">{today}</span>
          </div>
        </div>

        <div className="seller-content">
          <div className="seller-page-head">
            <h1>Dashboard</h1>
            <p>안녕하세요, {user.name} 작가님</p>
          </div>

          <div className="seller-stat-grid">
            <div className="seller-stat-card">
              <div className="seller-stat-lbl">등록 작품</div>
              <div className="seller-stat-val">{totalCount}</div>
              <div className="seller-stat-sub">전체 등록 수</div>
            </div>
            <div className="seller-stat-card">
              <div className="seller-stat-lbl">이번 달 판매</div>
              <div className="seller-stat-val">—</div>
              <div className="seller-stat-sub">판매 내역 준비 중</div>
            </div>
            <div className="seller-stat-card">
              <div className="seller-stat-lbl">누적 조회</div>
              <div className="seller-stat-val">—</div>
              <div className="seller-stat-sub">조회 집계 준비 중</div>
            </div>
            <div className="seller-stat-card">
              <div className="seller-stat-lbl">정산 예정</div>
              <div className="seller-stat-val">—</div>
              <div className="seller-stat-sub">정산 내역 준비 중</div>
            </div>
          </div>

          <div className="seller-two-col">
            <div className="seller-panel">
              <div className="seller-panel-head">
                <span className="seller-panel-title">내 작품 현황</span>
                <button
                  type="button"
                  className="seller-panel-link"
                  onClick={() => navigate("/seller/products/new")}
                >
                  + 새 작품 등록
                </button>
              </div>
              {products.length === 0 ? (
                <p className="seller-empty">등록된 작품이 없습니다.</p>
              ) : (
                products.map((p) => (
                  <div key={p._id} className="seller-prod-row">
                    <div className="seller-prod-thumb">
                      {CATEGORY_ICONS[p.category] || "◎"}
                    </div>
                    <div className="seller-prod-name">{p.name}</div>
                    <span className="seller-prod-status ps-approved">등록 완료</span>
                  </div>
                ))
              )}
            </div>

            <div className="seller-panel">
              <div className="seller-panel-head">
                <span className="seller-panel-title">갤러리 공지</span>
              </div>
              {NOTICES.map((n) => (
                <div key={n.title} className="seller-notice-item">
                  <div className="seller-notice-title">{n.title}</div>
                  <div className="seller-notice-date">{n.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SellerPage;
