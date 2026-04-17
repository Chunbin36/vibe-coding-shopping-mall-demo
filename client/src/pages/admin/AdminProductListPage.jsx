import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import AdminSidebar from "../../components/AdminSidebar";
import { API_BASE_URL } from "../../config/api";

const PAGE_LIMIT = 5;

const CATEGORY_MAP = {
  ceramic: "도자",
  wood: "목공예",
  glass: "유리",
  brass: "금속",
  leather: "가죽",
  fiber: "섬유",
};

const CATEGORY_ICONS = {
  ceramic: "◎",
  wood: "◇",
  glass: "□",
  brass: "○",
  leather: "◆",
  fiber: "◈",
};

const APPROVAL_LABEL = {
  pending:  { text: "승인 대기", className: "apl-status-pending" },
  approved: { text: "승인 완료", className: "apl-status-approved" },
  rejected: { text: "반려",     className: "apl-status-rejected" },
};

const today = new Date()
  .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
  .replace(/\. /g, ".")
  .replace(/\.$/, "");

function AdminProductListPage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    if (user.user_type !== "admin") { navigate("/", { replace: true }); }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (loading || !user) return;

    const controller = new AbortController();
    setFetching(true);

    const params = new URLSearchParams();
    params.set("page", page);
    params.set("limit", PAGE_LIMIT);
    if (categoryFilter) params.set("category", categoryFilter);
    if (approvalFilter) params.set("approvalStatus", approvalFilter);

    fetch(`${API_BASE_URL}/api/products?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("상품 목록을 불러올 수 없습니다.");
        return res.json();
      })
      .then((data) => {
        setProducts(data.products);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setFetching(false));

    return () => controller.abort();
  }, [loading, user, categoryFilter, approvalFilter, page]);

  const handleApproval = async (id, action) => {
    setActioningId(id);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/products/${id}/${action}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "처리에 실패했습니다.");
      setProducts((prev) =>
        prev.map((p) =>
          p._id === id ? { ...p, approvalStatus: data.product.approvalStatus } : p
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
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

  if (loading || !user || user.user_type !== "admin") return null;

  const formatPrice = (n) => n.toLocaleString("ko-KR") + "원";
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const pendingCount = products.filter((p) => p.approvalStatus === "pending").length;

  return (
    <div className="admin-layout">
      <AdminSidebar user={user} activeKey="products" onLogout={logout} />

      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-header-title">PRODUCT MANAGEMENT</h1>
          <div className="admin-header-right">
            <span className="admin-header-date">{today}</span>
          </div>
        </header>

        <div className="apl-title-row">
          <div>
            <h2 className="admin-section-title">PRODUCTS</h2>
            <p className="admin-section-desc">
              등록된 상품 {totalCount}점
              {pendingCount > 0 && (
                <span className="apl-pending-badge">승인 대기 {pendingCount}건</span>
              )}
            </p>
          </div>
          <button
            type="button"
            className="admin-new-product-btn"
            onClick={() => navigate("/admin/products/new")}
          >
            + 새 상품 등록하기
          </button>
        </div>

        <div className="apl-filters">
          <select
            className="apl-filter-select"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="">전체 카테고리</option>
            {Object.entries(CATEGORY_MAP).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select
            className="apl-filter-select"
            value={approvalFilter}
            onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }}
          >
            <option value="">전체 상태</option>
            <option value="pending">승인 대기</option>
            <option value="approved">승인 완료</option>
            <option value="rejected">반려</option>
          </select>
        </div>

        {error && <p className="message error" style={{ marginBottom: 12 }}>{error}</p>}

        <div className="apl-table-wrap">
          <table className="apl-table">
            <thead>
              <tr>
                <th></th>
                <th>상품명</th>
                <th>카테고리</th>
                <th>가격</th>
                <th>승인 상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr><td colSpan={6} className="apl-empty">불러오는 중...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="apl-empty">등록된 상품이 없습니다.</td></tr>
              ) : (
                products.map((p) => {
                  const approval = APPROVAL_LABEL[p.approvalStatus] || APPROVAL_LABEL.approved;
                  const isActioning = actioningId === p._id;
                  return (
                    <tr key={p._id}>
                      <td className="apl-td-icon">
                        <span className="apl-icon">{CATEGORY_ICONS[p.category] || "◎"}</span>
                      </td>
                      <td className="apl-td-name">
                        <p className="apl-product-name">{p.name}</p>
                        <p className="apl-product-sku">{p.sku}</p>
                        {p.seller && (
                          <p className="apl-product-seller">셀러 등록</p>
                        )}
                      </td>
                      <td className="apl-td-cat">{CATEGORY_MAP[p.category] || p.category}</td>
                      <td className="apl-td-price">{formatPrice(p.price)}</td>
                      <td className="apl-td-approval">
                        <span className={`apl-status-badge ${approval.className}`}>
                          {approval.text}
                        </span>
                        {p.approvalStatus === "pending" && (
                          <div className="apl-approval-actions">
                            <button
                              type="button"
                              className="apl-approve-btn"
                              disabled={isActioning}
                              onClick={() => handleApproval(p._id, "approve")}
                            >
                              승인
                            </button>
                            <button
                              type="button"
                              className="apl-reject-btn"
                              disabled={isActioning}
                              onClick={() => handleApproval(p._id, "reject")}
                            >
                              반려
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="apl-td-actions">
                        <button
                          type="button"
                          className="apl-action-btn edit"
                          onClick={() => navigate(`/admin/products/${p._id}/edit`)}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="apl-action-btn delete"
                          onClick={() => handleDelete(p._id)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="apl-pagination">
            <button
              type="button"
              className="apl-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                className={`apl-page-btn${n === page ? " active" : ""}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="apl-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminProductListPage;
