import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PortOne, {
  EasyPayProvider,
  PaymentCurrency,
  PaymentPayMethod,
} from "@portone/browser-sdk/v2";
import useAuth from "../hooks/useAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_BASE_URL = "http://localhost:5000";

/** Vite `import.meta.env` 값 — 앞뒤 공백·감싼 따옴표 제거 */
function readEnvTrimmed(value) {
  if (typeof value !== "string") return "";
  let s = value.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * 포트원 고객사(스토어) 식별코드 — 관리자 콘솔 우측 상단 Store ID (`requestPayment`의 `storeId`)
 * 채널 키와 같은 스토어에서 발급된 값이어야 합니다.
 */
const PORTONE_STORE_ID =
  readEnvTrimmed(import.meta.env.VITE_PORTONE_STORE_ID) ||
  "store-ec030c2d-5fa7-47f9-9c09-cc5e65a5b0ce";

/**
 * 포트원 V2 — 연동 정보 → 채널 → 채널 상세의 "채널 키" (PG/쇼핑몰 ID 등 다른 값 아님)
 * https://admin.portone.io/integration-v2/manage/channel
 */
const PORTONE_CHANNEL_KEY = readEnvTrimmed(
  import.meta.env.VITE_PORTONE_CHANNEL_KEY
);

const SHIPPING_FEE = 3000;
const FREE_SHIPPING_MIN = 50000;

const PAYMENT_OPTIONS = [
  { value: "card", label: "신용카드" },
  { value: "kakao_pay", label: "카카오페이" },
  { value: "naver_pay", label: "네이버페이" },
  { value: "bank_transfer", label: "무통장 입금" },
];

const CATEGORY_KO = {
  ceramic: "도자",
  wood: "목공예",
  glass: "유리",
  brass: "금속",
  leather: "가죽",
  fiber: "섬유",
};

const MEMO_OPTIONS = [
  { value: "", label: "배송 메모를 선택해 주세요 (선택)" },
  { value: "배송 전에 미리 연락 바랍니다.", label: "배송 전에 미리 연락 바랍니다." },
  { value: "부재 시 문 앞에 놓아주세요.", label: "부재 시 문 앞에 놓아주세요." },
  { value: "부재 시 경비실에 맡겨주세요.", label: "부재 시 경비실에 맡겨주세요." },
  { value: "택배함에 넣어주세요.", label: "택배함에 넣어주세요." },
];

const CARD_ISSUERS = [
  { value: "", label: "카드사 선택" },
  { value: "shinhan", label: "신한카드" },
  { value: "kb", label: "KB국민카드" },
  { value: "hyundai", label: "현대카드" },
  { value: "samsung", label: "삼성카드" },
];

const INSTALLMENT_OPTIONS = [
  { value: "0", label: "일시불" },
  { value: "2", label: "2개월" },
  { value: "3", label: "3개월" },
  { value: "6", label: "6개월" },
  { value: "12", label: "12개월" },
];

/** 가상계좌 입금 만료 — 7일 후 자정 근처 (문자열 dueDate) */
function virtualAccountDueDate() {
  const due = new Date();
  due.setDate(due.getDate() + 7);
  const z = (n) => String(n).padStart(2, "0");
  return `${due.getFullYear()}-${z(due.getMonth() + 1)}-${z(due.getDate())} 23:59:59`;
}

function truncateUtf8Bytes(str, maxBytes) {
  const enc = new TextEncoder();
  let out = "";
  for (const ch of str) {
    const next = out + ch;
    if (enc.encode(next).length > maxBytes) break;
    out = next;
  }
  return out || str.slice(0, 1);
}

/** KG이니시스(INIStdPay) 등 PG `oid`는 보통 40자 이내 — 포트원 `paymentId`가 그대로 전달됨 */
const PG_ORDER_ID_MAX_LEN = 40;

function createPgSafePaymentId() {
  const t = Date.now();
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  const id = `p${t}${rand}`;
  return id.length <= PG_ORDER_ID_MAX_LEN ? id : id.slice(0, PG_ORDER_ID_MAX_LEN);
}

function buildOrderName(cart) {
  if (!cart?.length) return "주문";
  const first = cart[0]?.product?.name?.trim() || "상품";
  if (cart.length === 1) return truncateUtf8Bytes(first, 128);
  const suffix = ` 외 ${cart.length - 1}건`;
  return truncateUtf8Bytes(first + suffix, 128);
}

/** UI 결제수단 → V2 `requestPayment`에 맞는 필드 조합 */
function buildPortOneV2Request({
  paymentId,
  orderName,
  totalAmount,
  origin,
  paymentMethodUi,
  recipientName,
  phone,
  userEmail,
  addressLine1,
  addressLine2,
  zipCode,
}) {
  const customer = {
    fullName: recipientName,
    phoneNumber: phone,
    email: userEmail || "iamport@siot.do",
    zipcode: zipCode || undefined,
    address: {
      addressLine1: addressLine1 || " ",
      addressLine2: addressLine2 || "",
    },
  };

  const base = {
    storeId: PORTONE_STORE_ID,
    channelKey: PORTONE_CHANNEL_KEY,
    paymentId,
    orderName,
    totalAmount,
    currency: PaymentCurrency.KRW,
    payMethod: PaymentPayMethod.CARD,
    customer,
    redirectUrl: `${origin}/order`,
  };

  switch (paymentMethodUi) {
    case "bank_transfer":
      return {
        ...base,
        payMethod: PaymentPayMethod.VIRTUAL_ACCOUNT,
        virtualAccount: {
          accountExpiry: { dueDate: virtualAccountDueDate() },
        },
      };
    case "kakao_pay":
      return {
        ...base,
        payMethod: PaymentPayMethod.EASY_PAY,
        easyPay: { easyPayProvider: EasyPayProvider.KAKAOPAY },
      };
    case "naver_pay":
      return {
        ...base,
        payMethod: PaymentPayMethod.EASY_PAY,
        easyPay: { easyPayProvider: EasyPayProvider.NAVERPAY },
      };
    case "card":
    default:
      return { ...base, payMethod: PaymentPayMethod.CARD };
  }
}

function OrderPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [memo, setMemo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardIssuer, setCardIssuer] = useState("");
  const [installment, setInstallment] = useState("0");
  const [agreePurchase, setAgreePurchase] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const token = localStorage.getItem("token");

  const setAgreeAll = (checked) => {
    setAgreePurchase(checked);
    setAgreePrivacy(checked);
    setAgreeMarketing(checked);
  };

  const allAgreeChecked = agreePurchase && agreePrivacy && agreeMarketing;

  const fetchCart = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCart(data.items || []))
      .catch(() => setCart([]))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    fetchCart();
  }, [user, authLoading, navigate, fetchCart]);

  useEffect(() => {
    if (!user) return;
    setRecipientName((prev) => prev || user.name || "");
    setAddress((prev) => prev || user.address || "");
  }, [user]);

  const subtotal = cart.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );
  const shipping =
    subtotal >= FREE_SHIPPING_MIN || subtotal === 0 ? 0 : SHIPPING_FEE;
  const discount = 0;
  const total = subtotal + shipping - discount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!recipientName.trim() || !phone.trim() || !address.trim()) {
      setError("받는 분 이름, 연락처, 주소는 필수입니다.");
      return;
    }

    if (!agreePurchase || !agreePrivacy) {
      setError("필수 약관에 동의해 주세요.");
      return;
    }

    if (total <= 0) {
      setError("결제할 금액이 없습니다.");
      return;
    }

    if (!PORTONE_CHANNEL_KEY) {
      setError(
        "포트원 V2 채널 키가 없습니다. client/.env에 VITE_PORTONE_CHANNEL_KEY=채널키UUID 형태로 넣은 뒤, 저장하고 개발 서버(npm run dev)를 재시작하세요. (콘솔: admin.portone.io → 연동 정보 → 채널)"
      );
      return;
    }

    setSubmitting(true);

    const paymentId = createPgSafePaymentId();
    const orderName = `주문명:${buildOrderName(cart)}`;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";

    const request = buildPortOneV2Request({
      paymentId,
      orderName,
      totalAmount: total,
      origin,
      paymentMethodUi: paymentMethod,
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      userEmail: (user?.email || "").trim(),
      addressLine1: address.trim(),
      addressLine2: addressDetail.trim(),
      zipCode: zipCode.trim(),
    });

    try {
      const rsp = await PortOne.requestPayment(request);

      if (rsp == null) {
        navigate("/order/fail", {
          replace: true,
          state: { message: "결제가 취소되었거나 창이 닫혔습니다." },
        });
        return;
      }

      if (rsp.code != null && rsp.code !== "") {
        const failMsg =
          rsp.message || rsp.pgMessage || "결제에 실패했습니다.";
        if (/channelKey|RECORD_NOT_FOUND|채널 정보/i.test(failMsg)) {
          navigate("/order/fail", {
            replace: true,
            state: {
              message:
                "포트원 채널을 찾지 못했습니다. 연동 정보 → 채널에서 채널 키와 Store ID를 client/.env에 맞춘 뒤 개발 서버를 재시작하세요.",
            },
          });
        } else {
          navigate("/order/fail", { replace: true, state: { message: failMsg } });
        }
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shippingAddress: {
            name: recipientName.trim(),
            phone: phone.trim(),
            zipCode: zipCode.trim(),
            address: address.trim(),
            addressDetail: addressDetail.trim(),
            memo: memo.trim(),
          },
          paymentMethod,
          portone: {
            version: "v2",
            paymentId: rsp.paymentId,
            txId: rsp.txId,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        navigate("/order/fail", {
          replace: true,
          state: {
            message:
              data.message ||
              `주문 저장에 실패했습니다. 결제는 완료되었을 수 있습니다. paymentId: ${rsp.paymentId}`,
          },
        });
        return;
      }

      navigate("/order/success", {
        replace: true,
        state: { order: data.order },
      });
    } catch (err) {
      const raw = err?.message || String(err);
      if (/channelKey|RECORD_NOT_FOUND|채널 정보/i.test(raw)) {
        navigate("/order/fail", {
          replace: true,
          state: {
            message:
              "포트원 채널을 찾지 못했습니다. 연동 정보 → 채널에서 채널 키와 Store ID를 client/.env에 맞춘 뒤 개발 서버를 재시작하세요.",
          },
        });
      } else {
        navigate("/order/fail", {
          replace: true,
          state: { message: raw || "결제 처리 중 오류가 발생했습니다." },
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) return null;

  if (!loading && cart.length === 0) {
    return (
      <div className="home-layout checkout-gallery-page">
        <Navbar user={user} onLogout={logout} />
        <div className="checkout-gallery-inner">
          <p className="checkout-gal-empty">장바구니가 비어 있습니다.</p>
          <Link to="/cart" className="checkout-gal-back-link">
            ← 장바구니로
          </Link>
        </div>
        <Footer user={user} onLogout={logout} />
      </div>
    );
  }

  return (
    <div className="home-layout checkout-gallery-page">
      <Navbar user={user} onLogout={logout} />

      <div className="checkout-gallery">
        <div className="checkout-gallery-inner">
          <div className="order-stepper checkout-gal-stepper" aria-label="주문 진행 단계">
            <div className="order-step order-step--done">
              <span className="order-step-icon">✓</span>
              <span className="order-step-label">장바구니</span>
            </div>
            <span className="order-step-line" />
            <div className="order-step order-step--active">
              <span className="order-step-num">2</span>
              <span className="order-step-label">주문 / 결제</span>
            </div>
            <span className="order-step-line" />
            <div className="order-step order-step--future">
              <span className="order-step-num">3</span>
              <span className="order-step-label">주문 완료</span>
            </div>
          </div>

          <nav className="checkout-gal-breadcrumb" aria-label="경로">
            <Link to="/">홈</Link>
            <span className="checkout-gal-bc-sep">/</span>
            <Link to="/cart">장바구니</Link>
            <span className="checkout-gal-bc-sep">/</span>
            <span>주문/결제</span>
          </nav>

          <h1 className="checkout-gal-page-title">ORDER</h1>

          {loading ? (
            <p className="checkout-gal-empty">불러오는 중...</p>
          ) : (
            <form className="checkout-gal-form" onSubmit={handleSubmit}>
              <section className="checkout-gal-panel">
                <h2 className="checkout-gal-panel-title">주문 상품</h2>
                <ul className="checkout-gal-items">
                  {cart.map((item) => {
                    const p = item.product;
                    const cat =
                      CATEGORY_KO[p?.category] || p?.category || "작품";
                    const artistLine = [p?.artist?.trim(), cat]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li key={p._id} className="checkout-gal-line">
                        <div className="checkout-gal-thumb">
                          {p.image ? (
                            <img src={p.image} alt="" />
                          ) : (
                            <span className="checkout-gal-thumb-ph" />
                          )}
                        </div>
                        <div className="checkout-gal-line-body">
                          <p className="checkout-gal-line-meta">{artistLine}</p>
                          <p className="checkout-gal-line-name">{p.name}</p>
                          <p className="checkout-gal-line-spec">
                            수량 {item.quantity}점
                          </p>
                        </div>
                        <p className="checkout-gal-line-price">
                          {(p.price * item.quantity).toLocaleString()}원
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="checkout-gal-panel">
                <h2 className="checkout-gal-panel-title">배송 정보</h2>
                <div className="checkout-gal-field-row">
                  <div className="checkout-gal-field">
                    <label className="checkout-gal-label" htmlFor="co-recv">
                      받는 분
                    </label>
                    <input
                      id="co-recv"
                      className="checkout-gal-input"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="이름"
                      autoComplete="name"
                    />
                  </div>
                  <div className="checkout-gal-field">
                    <label className="checkout-gal-label" htmlFor="co-phone">
                      연락처
                    </label>
                    <input
                      id="co-phone"
                      className="checkout-gal-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <div className="checkout-gal-field">
                  <label className="checkout-gal-label" htmlFor="co-zip">
                    주소
                  </label>
                  <div className="checkout-gal-zip-row">
                    <input
                      id="co-zip"
                      className="checkout-gal-input checkout-gal-input--zip"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="우편번호"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      className="checkout-gal-zip-btn"
                      onClick={() =>
                        window.alert(
                          "주소 검색은 다음 단계에서 연동할 수 있습니다. 우편번호와 주소를 직접 입력해 주세요."
                        )
                      }
                    >
                      주소 검색
                    </button>
                  </div>
                </div>
                <div className="checkout-gal-field">
                  <label className="checkout-gal-label sr-only" htmlFor="co-addr">
                    기본 주소
                  </label>
                  <input
                    id="co-addr"
                    className="checkout-gal-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="기본 주소"
                    autoComplete="street-address"
                  />
                </div>
                <div className="checkout-gal-field">
                  <label className="checkout-gal-label sr-only" htmlFor="co-addr2">
                    상세 주소
                  </label>
                  <input
                    id="co-addr2"
                    className="checkout-gal-input"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="상세 주소 입력"
                  />
                </div>
                <div className="checkout-gal-field">
                  <label className="checkout-gal-label" htmlFor="co-memo">
                    배송 메모
                  </label>
                  <select
                    id="co-memo"
                    className="checkout-gal-select"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  >
                    {MEMO_OPTIONS.map((o) => (
                      <option key={o.value || "memo-empty"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="checkout-gal-panel">
                <h2 className="checkout-gal-panel-title">결제 수단</h2>
                <div className="checkout-gal-pay-grid">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`checkout-gal-pay${paymentMethod === opt.value ? " checkout-gal-pay--on" : ""}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={opt.value}
                        checked={paymentMethod === opt.value}
                        onChange={() => setPaymentMethod(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {paymentMethod === "card" && (
                  <div className="checkout-gal-card-row">
                    <select
                      className="checkout-gal-select checkout-gal-select--grow"
                      value={cardIssuer}
                      onChange={(e) => setCardIssuer(e.target.value)}
                      aria-label="카드사"
                    >
                      {CARD_ISSUERS.map((o) => (
                        <option key={o.value || "x"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="checkout-gal-select checkout-gal-select--grow"
                      value={installment}
                      onChange={(e) => setInstallment(e.target.value)}
                      aria-label="할부"
                    >
                      {INSTALLMENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </section>

              <section className="checkout-gal-panel checkout-gal-panel--summary">
                <h2 className="checkout-gal-panel-title">결제 금액</h2>
                <div className="checkout-gal-sum-rows">
                  <div className="checkout-gal-sum-row">
                    <span>상품 금액</span>
                    <span>{subtotal.toLocaleString()}원</span>
                  </div>
                  <div className="checkout-gal-sum-row">
                    <span>배송비</span>
                    <span>
                      {shipping === 0
                        ? "0원"
                        : `${shipping.toLocaleString()}원`}
                    </span>
                  </div>
                  <div className="checkout-gal-sum-row checkout-gal-sum-row--muted">
                    <span>할인</span>
                    <span>
                      {discount === 0 ? "−0원" : `−${discount.toLocaleString()}원`}
                    </span>
                  </div>
                  <div className="checkout-gal-sum-row checkout-gal-sum-total">
                    <span>최종 결제 금액</span>
                    <span>{total.toLocaleString()}원</span>
                  </div>
                </div>
              </section>

              <section className="checkout-gal-panel checkout-gal-panel--terms">
                <label className="checkout-gal-check checkout-gal-check--all">
                  <input
                    type="checkbox"
                    checked={allAgreeChecked}
                    onChange={(e) => setAgreeAll(e.target.checked)}
                  />
                  전체 동의
                </label>
                <label className="checkout-gal-check">
                  <input
                    type="checkbox"
                    checked={agreePurchase}
                    onChange={(e) => setAgreePurchase(e.target.checked)}
                  />
                  구매 조건 및 결제 진행 동의 (필수)
                </label>
                <label className="checkout-gal-check">
                  <input
                    type="checkbox"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                  />
                  개인정보 수집·이용 동의 (필수)
                </label>
                <label className="checkout-gal-check">
                  <input
                    type="checkbox"
                    checked={agreeMarketing}
                    onChange={(e) => setAgreeMarketing(e.target.checked)}
                  />
                  마케팅 정보 수신 동의 (선택)
                </label>
              </section>

              {error && (
                <p className="message error checkout-gal-error">{error}</p>
              )}

              <button
                type="submit"
                className="checkout-gal-submit"
                disabled={submitting}
              >
                {submitting
                  ? "처리 중..."
                  : `${total.toLocaleString()}원 결제하기`}
              </button>

              <Link to="/cart" className="checkout-gal-back-link">
                ← 장바구니로 돌아가기
              </Link>
            </form>
          )}
        </div>
      </div>

      <Footer user={user} onLogout={logout} />
    </div>
  );
}

export default OrderPage;
