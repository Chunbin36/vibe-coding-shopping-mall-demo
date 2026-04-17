import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { API_BASE_URL } from "../config/api";

const EDITOR_PICKS = [
  { id: 1, title: "Everyday Essentials", desc: "매일 함께하는 데일리 아이템" },
  { id: 2, title: "Gift Collection", desc: "소중한 사람에게 선물하세요" },
  { id: 3, title: "Travel Must-Haves", desc: "여행을 함께할 아이템 모음" },
];

function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_BASE_URL}/api/products?limit=8`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setProducts(data.products || []))
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="home-layout">
      <Navbar user={user} onLogout={logout} />

      {/* ── Hero Banner ── */}
      <section className="hero">
        <div className="hero-inner">
          <p className="hero-sub">NEW COLLECTION</p>
          <h1 className="hero-title">Crafted with Care</h1>
          <p className="hero-desc">정성을 담아 만든 핸드메이드 가죽 컬렉션을 만나보세요.</p>
          <button type="button" className="hero-cta">SHOP NOW</button>
        </div>
      </section>

      {/* ── Products Grid ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">PRODUCTS</h2>
          <p className="section-desc">새롭게 선보이는 시즌 컬렉션</p>
        </div>
        <div className="product-grid">
          {products.map((p) => (
            <div key={p._id} className="product-card" onClick={() => navigate(`/products/${p._id}`)} style={{ cursor: "pointer" }}>
              <div className="product-thumb">
                {p.image && <img src={p.image} alt={p.name} className="product-thumb-img" />}
              </div>
              <p className="product-name">{p.name}</p>
              <p className="product-price">{p.price.toLocaleString()}원</p>
            </div>
          ))}
          {products.length === 0 && (
            <p className="product-empty">등록된 상품이 없습니다.</p>
          )}
        </div>
      </section>

      {/* ── Full-width Banner ── */}
      <section className="banner-full">
        <div className="banner-full-inner">
          <p className="banner-full-sub">HANDMADE LEATHER GOODS</p>
          <h2 className="banner-full-title">장인의 손끝에서<br />탄생한 가치</h2>
        </div>
      </section>

      {/* ── Editor's Pick ── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">EDITOR&apos;S PICK</h2>
          <p className="section-desc">에디터가 추천하는 컬렉션</p>
        </div>
        <div className="pick-grid">
          {EDITOR_PICKS.map((pick) => (
            <div key={pick.id} className="pick-card">
              <div className="pick-thumb" />
              <h3 className="pick-title">{pick.title}</h3>
              <p className="pick-desc">{pick.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Brand Story Banner ── */}
      <section className="brand-story">
        <div className="brand-story-inner">
          <h2 className="brand-story-title">OUR STORY</h2>
          <p className="brand-story-desc">
            VIBE CODING은 일상에 가치를 더하는 제품을 만듭니다.<br />
            하나하나 정성스럽게, 오래도록 함께할 수 있도록.
          </p>
          <button type="button" className="brand-story-cta">ABOUT US</button>
        </div>
      </section>

      <Footer user={user} onLogout={logout} />
    </div>
  );
}

export default HomePage;
