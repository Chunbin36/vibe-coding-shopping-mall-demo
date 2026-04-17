import { memo } from "react";
import { useNavigate } from "react-router-dom";

function Footer({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-col">
          <h4>VIBE CODING</h4>
          <p>일상에 가치를 더하는 쇼핑몰</p>
        </div>
        <div className="footer-col">
          <h4>SHOP</h4>
          <button type="button">New Arrivals</button>
          <button type="button">Best Sellers</button>
          <button type="button">All Products</button>
        </div>
        <div className="footer-col">
          <h4>SUPPORT</h4>
          <button type="button">공지사항</button>
          <button type="button">자주 묻는 질문</button>
          <button type="button">1:1 문의</button>
        </div>
        <div className="footer-col">
          <h4>ACCOUNT</h4>
          {user ? (
            <>
              <button type="button">마이페이지</button>
              <button type="button">주문조회</button>
              <button type="button" onClick={onLogout}>로그아웃</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => navigate("/login")}>로그인</button>
              <button type="button" onClick={() => navigate("/signup")}>회원가입</button>
            </>
          )}
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 VIBE CODING. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default memo(Footer);
