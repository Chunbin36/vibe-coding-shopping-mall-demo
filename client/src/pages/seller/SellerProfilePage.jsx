import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import SellerSidebar from "../../components/SellerSidebar";
import { API_BASE_URL } from "../../config/api";

const today = new Date()
  .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
  .replace(/\. /g, ".")
  .replace(/\.$/, "");

function SellerProfilePage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [form, setForm] = useState({ name: "", nickname: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    if (user.user_type !== "seller") { navigate("/", { replace: true }); }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        nickname: user.nickname || "",
        address: user.address || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("작가명은 필수입니다.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "저장에 실패했습니다.");

      // 로컬스토리지 유저 정보 업데이트
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, ...form }));

      setSuccess("프로필이 저장되었습니다.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || user.user_type !== "seller") return null;

  const initial = form.name ? form.name[0] : "S";

  return (
    <div className="seller-layout">
      <SellerSidebar user={user} activeKey="profile" onLogout={logout} />

      <div className="seller-main">
        <div className="seller-topbar">
          <span className="seller-topbar-title">Artist Profile</span>
          <div className="seller-topbar-right">
            <span className="seller-topbar-date">{today}</span>
          </div>
        </div>

        <div className="seller-content">
          <div className="seller-page-head">
            <h1>Profile</h1>
            <p>갤러리에 노출되는 작가 정보를 관리하세요</p>
          </div>

          <form className="seller-profile-layout" onSubmit={handleSubmit}>
            {/* 왼쪽 */}
            <div>
              <div className="seller-section">
                <div className="seller-section-title">기본 정보</div>

                <div className="seller-fgroup">
                  <label className="seller-flabel">이메일</label>
                  <input className="seller-finput" value={user.email} disabled />
                </div>

                <div className="seller-fgroup">
                  <label className="seller-flabel">작가명 (활동명) *</label>
                  <input
                    className="seller-finput"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="활동명을 입력하세요"
                  />
                </div>

                <div className="seller-fgroup">
                  <label className="seller-flabel">닉네임 · 활동 분야</label>
                  <input
                    className="seller-finput"
                    name="nickname"
                    value={form.nickname}
                    onChange={handleChange}
                    placeholder="예) 도예작가"
                  />
                </div>

                <div className="seller-fgroup">
                  <label className="seller-flabel">활동 지역 · 주소</label>
                  <input
                    className="seller-finput"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="예) 서울특별시"
                  />
                </div>
              </div>
            </div>

            {/* 오른쪽 */}
            <div>
              <div className="seller-section">
                <div className="seller-section-title">프로필</div>
                <div className="seller-profile-avatar-wrap">
                  <div className="seller-profile-avatar">{initial}</div>
                  <div className="seller-profile-name">{form.name || "작가"}</div>
                  <div className="seller-profile-role">{form.nickname || "셀러"}</div>
                </div>
              </div>

              <div className="seller-section">
                <div className="seller-section-title">계정 정보</div>
                <div className="seller-info-row">
                  <span className="seller-info-label">권한</span>
                  <span className="seller-info-val">Seller (작가)</span>
                </div>
                <div className="seller-info-row">
                  <span className="seller-info-label">이메일</span>
                  <span className="seller-info-val">{user.email}</span>
                </div>
              </div>

              {error && <p className="message error" style={{ marginBottom: 8 }}>{error}</p>}
              {success && <p className="message success" style={{ marginBottom: 8 }}>{success}</p>}

              <button type="submit" className="seller-save-btn" disabled={submitting}>
                {submitting ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SellerProfilePage;
