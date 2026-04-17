import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { API_BASE_URL } from "../config/api";
const SHIPPING_FEE = 3000;
const FREE_SHIPPING_MIN = 50000;

function CartPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [coupon, setCoupon] = useState("");

  const token = localStorage.getItem("token");

  const fetchCart = useCallback(() => {
    if (!token) return;
    setLoading(true);

    fetch(`${API_BASE_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const items = data.items || [];
        setCart(items);
        setSelected(new Set(items.map((i) => i.product._id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    fetchCart();
  }, [user, authLoading, navigate, fetchCart]);

  const updateQty = async (productId, quantity) => {
    await fetch(`${API_BASE_URL}/api/cart/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quantity }),
    });
    fetchCart();
  };

  const removeItem = async (productId) => {
    await fetch(`${API_BASE_URL}/api/cart/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchCart();
  };

  const removeSelected = async () => {
    const ids = [...selected];
    await Promise.all(
      ids.map((id) =>
        fetch(`${API_BASE_URL}/api/cart/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );
    fetchCart();
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === cart.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(cart.map((i) => i.product._id)));
    }
  };

  const selectedItems = cart.filter((i) => selected.has(i.product._id));
  const subtotal = selectedItems.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );
  const shipping = subtotal >= FREE_SHIPPING_MIN || subtotal === 0 ? 0 : SHIPPING_FEE;
  const discount = 0;
  const total = subtotal + shipping - discount;

  if (authLoading || !user) return null;

  return (
    <div className="home-layout">
      <Navbar user={user} onLogout={logout} />

      <div className="cart-container">
        <nav className="pd-breadcrumb">
          <Link to="/">홈</Link>
          <span>/</span>
          <span>장바구니</span>
        </nav>

        <h1 className="cart-title">CART</h1>
        <p className="cart-count">총 {cart.length}점</p>

        {loading ? (
          <p className="cart-empty">불러오는 중...</p>
        ) : cart.length === 0 ? (
          <div className="cart-empty">
            <p>장바구니가 비어있습니다.</p>
            <Link to="/" className="cart-continue">← 쇼핑 계속하기</Link>
          </div>
        ) : (
          <>
            {/* Select All + Delete */}
            <div className="cart-toolbar">
              <label className="cart-check-label">
                <input
                  type="checkbox"
                  checked={selected.size === cart.length}
                  onChange={toggleAll}
                />
                전체 선택
              </label>
              <button type="button" className="cart-delete-btn" onClick={removeSelected}>
                선택 삭제
              </button>
            </div>

            {/* Items */}
            <div className="cart-items">
              {cart.map((item) => {
                const p = item.product;
                return (
                  <div key={p._id} className="cart-item">
                    <input
                      type="checkbox"
                      checked={selected.has(p._id)}
                      onChange={() => toggleSelect(p._id)}
                      className="cart-item-check"
                    />
                    <div
                      className="cart-item-thumb"
                      onClick={() => navigate(`/products/${p._id}`)}
                    >
                      {p.image && <img src={p.image} alt={p.name} />}
                    </div>
                    <div className="cart-item-info" onClick={() => navigate(`/products/${p._id}`)}>
                      <p className="cart-item-artist">{p.artist || "작가 미상"}</p>
                      <p className="cart-item-name">{p.name}</p>
                    </div>
                    <div className="cart-item-qty">
                      <button
                        type="button"
                        disabled={item.quantity <= 1}
                        onClick={() => updateQty(p._id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(p._id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <p className="cart-item-price">
                      {(p.price * item.quantity).toLocaleString()}원
                    </p>
                    <button
                      type="button"
                      className="cart-item-remove"
                      onClick={() => removeItem(p._id)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="cart-summary">
              <h3 className="cart-summary-title">ORDER SUMMARY</h3>

              <div className="cart-summary-row">
                <span>상품 금액</span>
                <span>{subtotal.toLocaleString()}원</span>
              </div>
              <div className="cart-summary-row">
                <span>배송비</span>
                <span>{shipping === 0 ? "무료" : `${shipping.toLocaleString()}원`}</span>
              </div>
              <div className="cart-summary-row discount">
                <span>할인</span>
                <span>{discount === 0 ? "−0원" : `−${discount.toLocaleString()}원`}</span>
              </div>
              <div className="cart-summary-row total">
                <span>총 결제 금액</span>
                <span>{total.toLocaleString()}원</span>
              </div>

              <div className="cart-coupon">
                <input
                  type="text"
                  placeholder="쿠폰 코드 입력"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  className="cart-coupon-input"
                />
                <button type="button" className="cart-coupon-btn">적용</button>
              </div>

              <button
                type="button"
                className="cart-order-btn"
                onClick={() => navigate("/order")}
              >
                주문하기
              </button>

              <ul className="cart-notices">
                <li>5만원 이상 구매 시 배송비 무료</li>
                <li>안전 포장으로 발송합니다</li>
                <li>결제 후 취소는 마이페이지에서 가능합니다</li>
              </ul>

              <Link to="/" className="cart-continue">← 쇼핑 계속하기</Link>
            </div>
          </>
        )}
      </div>

      <Footer user={user} onLogout={logout} />
    </div>
  );
}

export default CartPage;
