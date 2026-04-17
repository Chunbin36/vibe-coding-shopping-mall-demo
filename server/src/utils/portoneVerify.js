/**
 * 포트원 REST API V2 — 서버에서 결제 단건 조회로 금액·상태 검증
 * https://developers.portone.io/api/rest-v2/payment
 */

const PORTONE_API_BASE =
  process.env.PORTONE_API_BASE?.trim() || "https://api.portone.io";

async function loginWithApiSecret() {
  const apiSecret = process.env.PORTONE_API_SECRET?.trim();
  if (!apiSecret) {
    const err = new Error(
      "서버에 PORTONE_API_SECRET이 설정되지 않았습니다. 포트원 콘솔 > 연동 정보 > API Secret"
    );
    err.code = "PORTONE_CONFIG";
    throw err;
  }

  const res = await fetch(`${PORTONE_API_BASE}/login/api-secret`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ apiSecret }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.message ||
      data.error?.message ||
      `포트원 API 로그인 실패 (${res.status})`;
    const err = new Error(msg);
    err.code = "PORTONE_AUTH";
    throw err;
  }
  if (!data.accessToken) {
    const err = new Error("포트원 accessToken 응답이 없습니다.");
    err.code = "PORTONE_AUTH";
    throw err;
  }
  return data.accessToken;
}

async function fetchPayment(paymentId, accessToken) {
  const url = `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.message ||
      data.error?.message ||
      `결제 조회 실패 (${res.status})`;
    const err = new Error(msg);
    err.code = "PORTONE_FETCH";
    err.status = res.status;
    throw err;
  }
  return data;
}

function unwrapPayment(body) {
  if (!body || typeof body !== "object") return null;
  return body.payment ?? body.result?.payment ?? body;
}

function extractTotalKrw(payment) {
  const total = payment?.amount?.total;
  if (typeof total === "number" && Number.isFinite(total)) return total;
  if (typeof payment?.totalAmount === "number" && Number.isFinite(payment.totalAmount)) {
    return payment.totalAmount;
  }
  return null;
}

/**
 * @param {object} params
 * @param {string} params.paymentId - 클라이언트 requestPayment paymentId
 * @param {string} [params.txId] - 응답 txId (있으면 transactionId 와 일치 검사)
 * @param {number} params.expectedTotalKrw - 서버가 장바구니로 계산한 결제 금액(원)
 */
async function verifyPortOneV2Payment({ paymentId, txId, expectedTotalKrw }) {
  if (!paymentId || typeof paymentId !== "string") {
    const err = new Error("paymentId가 없습니다.");
    err.code = "PORTONE_INPUT";
    throw err;
  }
  if (!Number.isFinite(expectedTotalKrw) || expectedTotalKrw < 0) {
    const err = new Error("유효하지 않은 결제 금액입니다.");
    err.code = "PORTONE_INPUT";
    throw err;
  }

  const accessToken = await loginWithApiSecret();
  const raw = await fetchPayment(paymentId, accessToken);
  const payment = unwrapPayment(raw);

  if (!payment || typeof payment !== "object") {
    const err = new Error("포트원 결제 응답이 비어 있습니다.");
    err.code = "PORTONE_INVALID";
    throw err;
  }

  const statusRaw = payment.status;
  const status = String(statusRaw ?? "").toUpperCase();
  if (status !== "PAID") {
    const err = new Error(
      `결제가 완료 상태가 아닙니다. (상태: ${statusRaw ?? "없음"})`
    );
    err.code = "PORTONE_NOT_PAID";
    throw err;
  }

  if (payment.id && payment.id !== paymentId) {
    const err = new Error("결제 건 ID가 요청과 일치하지 않습니다.");
    err.code = "PORTONE_ID_MISMATCH";
    throw err;
  }

  if (
    txId &&
    payment.transactionId &&
    String(payment.transactionId) !== String(txId)
  ) {
    const err = new Error("거래 ID(txId)가 포트원 응답과 일치하지 않습니다.");
    err.code = "PORTONE_TX_MISMATCH";
    throw err;
  }

  const paidTotal = extractTotalKrw(payment);
  if (paidTotal == null) {
    const err = new Error("포트원 결제 금액을 확인할 수 없습니다.");
    err.code = "PORTONE_AMOUNT";
    throw err;
  }

  if (paidTotal !== expectedTotalKrw) {
    const err = new Error(
      `결제 금액 불일치: 주문 계산 ${expectedTotalKrw}원, 포트원 ${paidTotal}원`
    );
    err.code = "PORTONE_AMOUNT_MISMATCH";
    throw err;
  }

  const storeId = process.env.PORTONE_STORE_ID?.trim();
  if (storeId && payment.storeId && payment.storeId !== storeId) {
    const err = new Error("포트원 스토어 ID가 서버 설정과 일치하지 않습니다.");
    err.code = "PORTONE_STORE_MISMATCH";
    throw err;
  }

  return { payment };
}

module.exports = {
  verifyPortOneV2Payment,
  PORTONE_API_BASE,
};
