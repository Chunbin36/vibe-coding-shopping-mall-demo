import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import SellerSidebar from "../../components/SellerSidebar";
import { API_BASE_URL } from "../../config/api";

const PAGE_LIMIT = 8;

const CATEGORY_MAP = { ceramic: "도자", wood: "목공예", glass: "유리", brass: "금속", leather: "가죽", fiber: "섬유" };
const CATEGORY_ICONS = { ceramic: "◎", wood: "◇", glass: "□", brass: "○", leather: "◆", fiber: "◈" };

const APPROVAL_LABEL = {
  pending:  { text: "승인 대기", className: "ps-pending" },
  approved: { text: "승인 완료", className: "ps-approved" },
  rejected: { text: "반려",     className: "ps-reject" },
};

const today = new Date()
  .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
  .replace(/\. /g, ".")
  .replace(/\.$/, "");

function SellerProductListPage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    if (user.user_type !== "seller") { navigate("/", { replace: true }); }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (loading || !user || user.user_type !== "seller") return;

    const controller = new AbortController();
    setFetching(true);

    const token = localStorage.getItem("token");
    const params = new URLSearchParams({ page, limit: PAGE_LIMIT });
    fetch(`${API_BASE_URL}/api/products/my?${params}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error("목록을 불러올 수 없습니다."); return r.json(); })
      .then((data) => {
        setProducts(data.products || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => setFetching(false));

    return () => controller.abort();
  }, [loading, user, page]);

  const handleDelete = async (id) => {
    if (!window.confirm("작품을 삭제하시겠습니까?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("삭제에 실패했습니다.");
      setProducts((prev) => prev.filter((p) => p._id !== id));
      setTotalCount((prev) => prev - 1);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading || !user || user.user_type !== "seller") return null;

  return (
    <div className="seller-layout">
      <SellerSidebar user={user} activeKey="products" onLogout={logout} />

      <div className="seller-main">
        <div className="seller-topbar">
          <span className="seller-topbar-title">My Works</span>
          <div className="seller-topbar-right">
            <span className="seller-topbar-date">{today}</span>
          </div>
        </div>

        <div className="seller-content">
          <div className="seller-page-head-row">
            <div>
              <h1 className="seller-page-h1">My Works</h1>
              <p className="seller-page-sub">등록된 작품 {totalCount}점</p>
            </div>
            <button
              type="button"
              className="seller-new-btn"
              onClick={() => navigate("/seller/products/new")}
            >
              + 새 작품 등록
            </button>
          </div>

          {error && <p className="message error">{error}</p>}

          <div className="seller-works-table-wrap">
            <table className="seller-works-table">
              <thead>
                <tr>
                  <th></th>
                  <th>작품명</th>
                  <th>카테고리</th>
                  <th>가격</th>
                  <th>상태</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {fetching ? (
                  <tr><td colSpan={6} className="seller-td-empty">불러오는 중...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={6} className="seller-td-empty">등록된 작품이 없습니다.</td></tr>
                ) : (
                  products.map((p) => (
                    <tr key={p._id}>
                      <td className="seller-td-icon">
                        <span className="seller-prod-icon">{CATEGORY_ICONS[p.category] || "◎"}</span>
                      </td>
                      <td className="seller-td-name">
                        <p className="seller-works-name">{p.name}</p>
                        <p className="seller-works-sku">{p.sku}</p>
                      </td>
                      <td>{CATEGORY_MAP[p.category] || p.category}</td>
                      <td>{p.price.toLocaleString("ko-KR")}원</td>
                      <td>
                        {(() => {
                          const a = APPROVAL_LABEL[p.approvalStatus] || APPROVAL_LABEL.approved;
                          return <span className={`seller-status-badge ${a.className}`}>{a.text}</span>;
                        })()}
                      </td>
                      <td className="seller-td-actions">
                        <button
                          type="button"
                          className="seller-action-btn delete"
                          onClick={() => handleDelete(p._id)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="seller-pagination">
              <button
                type="button"
                className="seller-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`seller-page-btn${n === page ? " active" : ""}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="seller-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SellerProductListPage;
