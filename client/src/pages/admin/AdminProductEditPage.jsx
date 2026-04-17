import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import AdminSidebar from "../../components/AdminSidebar";

const API_BASE_URL = "http://localhost:5000";
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const CATEGORIES = [
  { value: "ceramic", label: "도자기" },
  { value: "wood", label: "목공예" },
  { value: "glass", label: "유리" },
  { value: "brass", label: "금속" },
  { value: "leather", label: "가죽" },
  { value: "fiber", label: "섬유" },
];

const today = new Date()
  .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
  .replace(/\. /g, ".")
  .replace(/\.$/, "");

function AdminProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const widgetRef = useRef(null);

  const [form, setForm] = useState({
    sku: "", name: "", artist: "", price: "", category: "ceramic", image: "", description: "",
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    if (user.user_type !== "admin") { navigate("/", { replace: true }); }
  }, [user, loading, navigate]);

  // 기존 상품 데이터 불러오기
  useEffect(() => {
    if (loading || !user || user.user_type !== "admin") return;

    fetch(`${API_BASE_URL}/api/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("상품을 불러올 수 없습니다.");
        return res.json();
      })
      .then((product) => {
        setForm({
          sku: product.sku || "",
          name: product.name || "",
          artist: product.artist || "",
          price: product.price ?? "",
          category: product.category || "ceramic",
          image: product.image || "",
          description: product.description || "",
        });
        if (product.image) setImagePreview(product.image);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingProduct(false));
  }, [loading, user, id]);

  // Cloudinary 위젯
  useEffect(() => {
    if (!window.cloudinary) return;
    widgetRef.current = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ["local", "url", "camera"],
        multiple: false,
        maxFiles: 1,
        maxFileSize: 10_000_000,
        resourceType: "image",
        clientAllowedFormats: ["jpg", "jpeg", "png", "gif", "webp"],
        cropping: false,
        showAdvancedOptions: false,
        styles: {
          palette: {
            window: "#FFFFFF", windowBorder: "#d5d0cb", tabIcon: "#3a3530",
            menuIcons: "#3a3530", textDark: "#1a1a1a", textLight: "#FFFFFF",
            link: "#3a3530", action: "#3a3530", inactiveTabIcon: "#999",
            error: "#c44", inProgress: "#3a3530", complete: "#5a7a5a", sourceBg: "#f5f0eb",
          },
        },
      },
      (err, result) => {
        if (err) { setError("이미지 업로드 중 오류가 발생했습니다."); setUploading(false); return; }
        if (result.event === "success") {
          const url = result.info.secure_url;
          setImagePreview(url);
          setForm((prev) => ({ ...prev, image: url }));
          setUploading(false);
        }
        if (result.event === "close") setUploading(false);
      }
    );
    return () => widgetRef.current?.destroy();
  }, []);

  const openWidget = useCallback(() => {
    setError("");
    setUploading(true);
    widgetRef.current?.open();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const removeImage = () => {
    setImagePreview(null);
    setForm((prev) => ({ ...prev, image: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.price || !form.image) {
      setError("상품명, 가격, 이미지는 필수입니다.");
      return;
    }

    const price = Number(form.price);
    if (Number.isNaN(price) || price < 0) {
      setError("가격은 0 이상의 숫자여야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, price }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "수정에 실패했습니다.");

      setSuccess("상품이 수정되었습니다.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || user.user_type !== "admin") return null;

  return (
    <div className="admin-layout">
      <AdminSidebar user={user} activeKey="products" onLogout={logout} />

      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-header-title">EDIT PRODUCT</h1>
          <div className="admin-header-right">
            <span className="admin-header-date">{today}</span>
          </div>
        </header>

        <button
          type="button"
          className="apn-back"
          onClick={() => navigate("/admin/products")}
        >
          ← 목록으로 돌아가기
        </button>

        <div className="apn-title-row">
          <h2 className="admin-section-title">EDIT PRODUCT</h2>
          <p className="admin-section-desc">상품 정보를 수정합니다</p>
        </div>

        {loadingProduct ? (
          <p style={{ padding: "2rem", color: "#999" }}>불러오는 중...</p>
        ) : (
          <form className="apn-grid" onSubmit={handleSubmit}>
            {/* ── Left: 이미지 ── */}
            <div className="apn-col">
              <section className="apn-card">
                <h3 className="apn-card-title">상품 이미지</h3>

                <div
                  className="apn-upload-area"
                  onClick={!imagePreview ? openWidget : undefined}
                  role={!imagePreview ? "button" : undefined}
                  tabIndex={!imagePreview ? 0 : undefined}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="미리보기" className="apn-upload-preview" />
                  ) : (
                    <div className="apn-upload-placeholder">
                      <span className="apn-upload-icon">+</span>
                      <p>{uploading ? "업로드 중..." : "이미지 업로드"}</p>
                      <p className="apn-upload-hint">JPG, PNG · 최대 10MB</p>
                    </div>
                  )}
                </div>

                {imagePreview && (
                  <div className="apn-thumb-row">
                    <div className="apn-thumb">
                      <img src={imagePreview} alt="썸네일" />
                      <button type="button" className="apn-thumb-remove" onClick={removeImage}>×</button>
                    </div>
                    <button type="button" className="apn-thumb-add" onClick={openWidget}>+</button>
                  </div>
                )}
              </section>
            </div>

            {/* ── Right: 기본 정보 ── */}
            <div className="apn-col">
              <section className="apn-card">
                <h3 className="apn-card-title">기본 정보</h3>

                <label className="apn-label">상품명 *</label>
                <input
                  className="apn-input"
                  name="name"
                  placeholder="상품 이름을 입력하세요"
                  value={form.name}
                  onChange={handleChange}
                />

                <label className="apn-label">작가명</label>
                <input
                  className="apn-input"
                  name="artist"
                  placeholder="작가 이름을 입력하세요"
                  value={form.artist}
                  onChange={handleChange}
                />

                <label className="apn-label">SKU (상품코드)</label>
                <input
                  className="apn-input"
                  name="sku"
                  placeholder="예) CRM-001"
                  value={form.sku}
                  onChange={handleChange}
                />

                <div className="apn-row-2">
                  <div>
                    <label className="apn-label">카테고리</label>
                    <select
                      className="apn-select"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="apn-label">판매가 (원) *</label>
                    <input
                      className="apn-input"
                      name="price"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.price}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <label className="apn-label">상품 설명</label>
                <textarea
                  className="apn-textarea"
                  name="description"
                  rows={4}
                  placeholder="상품에 대한 설명을 입력하세요"
                  value={form.description}
                  onChange={handleChange}
                />
              </section>
            </div>

            {/* ── Bottom Actions ── */}
            <div className="apn-actions">
              {error && <p className="message error">{error}</p>}
              {success && <p className="message success">{success}</p>}
              <div className="apn-actions-right">
                <button
                  type="button"
                  className="apn-btn-secondary"
                  onClick={() => navigate("/admin/products")}
                >
                  취소
                </button>
                <button type="submit" className="apn-btn-primary" disabled={submitting}>
                  {submitting ? "저장 중..." : "저장하기"}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default AdminProductEditPage;
