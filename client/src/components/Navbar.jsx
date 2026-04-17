import { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const CATEGORIES = ["ALL", "NEW", "BEST", "BAG", "WALLET", "ACC"];

function Navbar({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const isAdmin = user?.user_type === "admin";
  const isSeller = user?.user_type === "seller";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <nav className="nav">
        <button
          type="button"
          className="nav-hamburger"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="메뉴 열기"
        >
          <span /><span /><span />
        </button>

        <Link to="/" className="nav-logo">VIBE CODING</Link>

        <div className="nav-right">
          {user ? (
            <div className="nav-user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="nav-greeting-btn"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <svg className="nav-user-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="nav-greeting-text">
                  <strong>{user.name}</strong>님 환영합니다 ▾
                </span>
              </button>
              {userMenuOpen && (
                <div className="nav-dropdown">
                  <Link to="/orders" className="nav-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    주문내역
                  </Link>
                  <Link to="/mypage" className="nav-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    회원정보
                  </Link>
                  <button type="button" className="nav-dropdown-item" onClick={() => { setUserMenuOpen(false); onLogout(); }}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-text-btn">로그인</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="nav-text-btn nav-admin-btn">관리자</Link>
          )}
          {isSeller && (
            <Link to="/seller" className="nav-text-btn nav-seller-btn">셀러 페이지</Link>
          )}
          <Link to="/cart" className="nav-icon-btn" aria-label="장바구니">
            🛒
          </Link>
        </div>
      </nav>

      {menuOpen && (
        <div className="mobile-menu">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="category-bar">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className="category-btn">{c}</button>
        ))}
      </div>
    </>
  );
}

export default memo(Navbar);
