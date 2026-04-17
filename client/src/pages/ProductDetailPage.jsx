import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_BASE_URL = "http://localhost:5000";

const CATEGORY_KR = {
  ceramic: "도자",
  wood: "목공예",
  glass: "유리",
  brass: "금속",
  leather: "가죽",
  fiber: "섬유",
};

function ProductDetailPage() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [priceRevealed, setPriceRevealed] = useState(false);
  const [cartAdding, setCartAdding] = useState(false);
  const [cartMsg, setCartMsg] = useState("");
  const [openSections, setOpenSections] = useState({
    intro: true,
    info: false,
    shipping: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(`${API_BASE_URL}/api/products/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("상품을 찾을 수 없습니다.");
        return res.json();
      })
      .then((data) => setProduct(data))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCartMsg("로그인이 필요합니다.");
      return;
    }

    setCartAdding(true);
    setCartMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: product._id, quantity: 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "장바구니 추가에 실패했습니다.");
      setCartMsg("장바구니에 담았습니다!");
    } catch (err) {
      setCartMsg(err.message);
    } finally {
      setCartAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="home-layout">
        <Navbar user={user} onLogout={logout} />
        <div className="pd-loading">불러오는 중...</div>
        <Footer user={user} onLogout={logout} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="home-layout">
        <Navbar user={user} onLogout={logout} />
        <div className="pd-loading">{error || "상품을 찾을 수 없습니다."}</div>
        <Footer user={user} onLogout={logout} />
      </div>
    );
  }

  const categoryKr = CATEGORY_KR[product.category] || product.category;

  return (
    <div className="home-layout">
      <Navbar user={user} onLogout={logout} />

      <div className="pd-container">
        {/* Breadcrumb */}
        <nav className="pd-breadcrumb">
          <Link to="/">홈</Link>
          <span>/</span>
          <span>{categoryKr}</span>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="pd-grid">
          {/* ── Left: Image ── */}
          <div className="pd-gallery">
            <div className="pd-main-image">
              <img src={product.image} alt={product.name} />
            </div>
          </div>

          {/* ── Right: Info ── */}
          <div className="pd-info">
            <p className="pd-sku">NO. {product.sku} · {categoryKr}</p>
            <h1 className="pd-name">{product.name}</h1>
            <p className="pd-year">
              {new Date(product.createdAt).getFullYear()}년 등록
            </p>

            {/* Artist */}
            {product.artist && (
              <div className="pd-artist">
                <div className="pd-artist-avatar">
                  {product.artist.charAt(0)}
                </div>
                <div>
                  <p className="pd-artist-name">{product.artist}</p>
                  <p className="pd-artist-desc">{categoryKr} 작가</p>
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="pd-tags">
              <span className="pd-tag">{categoryKr}</span>
            </div>

            {/* Accordion: 작품 소개 */}
            <div className="pd-accordion">
              <button
                type="button"
                className="pd-accordion-header"
                onClick={() => toggleSection("intro")}
              >
                <span>작품 소개</span>
                <span className="pd-accordion-icon">{openSections.intro ? "×" : "+"}</span>
              </button>
              {openSections.intro && (
                <div className="pd-accordion-body">
                  {product.description || "상품 설명이 없습니다."}
                </div>
              )}
            </div>

            {/* Accordion: 작품 정보 */}
            <div className="pd-accordion">
              <button
                type="button"
                className="pd-accordion-header"
                onClick={() => toggleSection("info")}
              >
                <span>작품 정보</span>
                <span className="pd-accordion-icon">{openSections.info ? "×" : "+"}</span>
              </button>
              {openSections.info && (
                <div className="pd-accordion-body">
                  <table className="pd-spec-table">
                    <tbody>
                      <tr><td>SKU</td><td>{product.sku}</td></tr>
                      <tr><td>카테고리</td><td>{categoryKr}</td></tr>
                      {product.artist && <tr><td>작가</td><td>{product.artist}</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Accordion: 배송 / 반품 */}
            <div className="pd-accordion">
              <button
                type="button"
                className="pd-accordion-header"
                onClick={() => toggleSection("shipping")}
              >
                <span>배송 / 반품</span>
                <span className="pd-accordion-icon">{openSections.shipping ? "×" : "+"}</span>
              </button>
              {openSections.shipping && (
                <div className="pd-accordion-body">
                  개별 포장 · 5-7 영업일 이내 발송합니다.
                  수령 후 7일 이내 미개봉 상태에서만 반품 가능하며,
                  작품 특성상 단순 변심 반품은 불가합니다.
                </div>
              )}
            </div>

            {/* Price */}
            <div className="pd-price-card">
              <p className="pd-price-label">PRICE</p>
              {priceRevealed ? (
                <p className="pd-price-value">{product.price.toLocaleString()}원</p>
              ) : (
                <>
                  <p className="pd-price-hidden">🔒 작품을 클릭하면 가격이 공개됩니다</p>
                  <button
                    type="button"
                    className="pd-price-btn"
                    onClick={() => setPriceRevealed(true)}
                  >
                    가격 확인하기
                  </button>
                </>
              )}
            </div>

            {/* Cart + Like row */}
            <div className="pd-action-row">
              <button
                type="button"
                className="pd-cart-btn"
                onClick={handleAddToCart}
                disabled={cartAdding}
              >
                {cartAdding ? "담는 중..." : "장바구니에 담기"}
              </button>
              <button
                type="button"
                className={`pd-like-btn${liked ? " active" : ""}`}
                onClick={() => setLiked((v) => !v)}
              >
                {liked ? "♥" : "♡"}
              </button>
            </div>
            {cartMsg && (
              <p className={`pd-cart-msg${cartMsg.includes("담았") ? " success" : ""}`}>
                {cartMsg}
              </p>
            )}

            {/* Contact artist */}
            <button type="button" className="pd-contact-btn">
              작가에게 문의하기
            </button>

            {/* Share */}
            <div className="pd-share">
              <span className="pd-share-label">Share</span>
              <div className="pd-share-btns">
                <button type="button" className="pd-share-btn" onClick={handleCopyLink}>링크 복사</button>
                <button type="button" className="pd-share-btn">카카오</button>
                <button type="button" className="pd-share-btn">인스타그램</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer user={user} onLogout={logout} />
    </div>
  );
}

export default ProductDetailPage;
