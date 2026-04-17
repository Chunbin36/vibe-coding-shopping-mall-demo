import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import SellerSidebar from "../../components/SellerSidebar";
import { API_BASE_URL } from "../../config/api";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const CATEGORIES = [
  { value: "ceramic", label: "도자" },
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

const initialForm = {
  sku: "",
  name: "",
  artist: "",
  price: "",
  category: "ceramic",
  image: "",
  description: "",
};

function SellerProductNewPage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const widgetRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    if (user.user_type !== "seller") { navigate("/", { replace: true }); }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && !form.artist) {
      setForm((prev) => ({ ...prev, artist: user.name || "" }));
    }
  }, [user]);

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

    if (!form.sku.trim() || !form.name.trim() || !form.price || !form.image) {
      setError("SKU, 작품명, 가격, 이미지는 필수입니다.");
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
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, price }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "작품 등록에 실패했습니다.");
      setSuccess("작품이 등록되었습니다!");
      setForm({ ...initialForm, artist: user?.name || "" });
      setImagePreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || user.user_type !== "seller") return null;

  return (
    <div className="seller-layout">
      <SellerSidebar user={user} activeKey="new" onLogout={logout} />

      <div className="seller-main">
        <div className="seller-topbar">
          <span className="seller-topbar-title">New Work</span>
          <div className="seller-topbar-right">
            <span className="seller-topbar-date">{today}</span>
          </div>
        </div>

        <div className="seller-content">
          <div className="seller-page-head">
            <h1>New Work</h1>
            <p>새 작품을 등록하고 갤러리 승인을 요청하세요</p>
          </div>

          <div className="seller-pending-banner">
            <span className="seller-pending-icon">◎</span>
            <div className="seller-pending-txt">
              등록 후 갤러리 운영팀의 검토를 거쳐 메인 페이지에 게재됩니다.
            </div>
          </div>

          <form className="seller-reg-layout" onSubmit={handleSubmit}>
            {/* 왼쪽 */}
            <div>
              <div className="seller-section">
                <div className="seller-section-title">기본 정보</div>

                <div className="seller-fgroup">
                  <label className="seller-flabel">작품명 *</label>
                  <input
                    className="seller-finput"
                    name="name"
                    placeholder="작품 제목을 입력하세요"
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="seller-fgroup">
                  <label className="seller-flabel">작가명</label>
                  <input
                    className="seller-finput"
                    name="artist"
                    placeholder="작가 이름"
                    value={form.artist}
                    onChange={handleChange}
                  />
                </div>

                <div className="seller-fgroup">
                  <label className="seller-flabel">SKU (상품코드) *</label>
                  <input
                    className="seller-finput"
                    name="sku"
                    placeholder="예) CRM-001"
                    value={form.sku}
                    onChange={handleChange}
                  />
                </div>

                <div className="seller-two-field">
                  <div className="seller-fgroup">
                    <label className="seller-flabel">카테고리</label>
                    <select
                      className="seller-fselect"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="seller-fgroup">
                    <label className="seller-flabel">판매가 (원) *</label>
                    <input
                      className="seller-finput"
                      name="price"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.price}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="seller-section">
                <div className="seller-section-title">작품 설명</div>
                <textarea
                  className="seller-ftextarea"
                  name="description"
                  rows={5}
                  placeholder="작품에 대한 소개와 스토리를 입력하세요"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* 오른쪽 */}
            <div>
              <div className="seller-section">
                <div className="seller-section-title">작품 사진</div>
                <div
                  className="seller-img-upload-area"
                  onClick={!imagePreview ? openWidget : undefined}
                  role={!imagePreview ? "button" : undefined}
                  tabIndex={!imagePreview ? 0 : undefined}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="미리보기" className="seller-img-preview" />
                  ) : (
                    <div className="seller-img-placeholder">
                      <div className="seller-img-plus">+</div>
                      <p>{uploading ? "업로드 중..." : "이미지 업로드"}</p>
                      <p className="seller-img-hint">JPG, PNG · 최대 10MB</p>
                    </div>
                  )}
                </div>
                {imagePreview && (
                  <button type="button" className="seller-img-remove" onClick={removeImage}>
                    이미지 제거
                  </button>
                )}
              </div>

              <div className="seller-submit-row">
                {error && <p className="message error">{error}</p>}
                {success && <p className="message success">{success}</p>}
                <button type="submit" className="seller-save-btn" disabled={submitting}>
                  {submitting ? "등록 중..." : "등록 완료"}
                </button>
                <button
                  type="button"
                  className="seller-draft-btn"
                  onClick={() => navigate("/seller/products")}
                >
                  취소
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SellerProductNewPage;
