const crypto = require("crypto");
const mongoose = require("mongoose");

const { Schema } = mongoose;

const orderItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: "" },
  },
  { _id: false }
);

const shippingAddressSchema = new Schema(
  {
    name: { type: String, required: [true, "받는 사람 이름은 필수입니다."] },
    phone: { type: String, required: [true, "연락처는 필수입니다."] },
    zipCode: { type: String, default: "" },
    address: { type: String, required: [true, "주소는 필수입니다."] },
    addressDetail: { type: String, default: "" },
    memo: { type: String, default: "" },
  },
  { _id: false }
);

const paymentSchema = new Schema(
  {
    // card: 카드 | bank_transfer: 무통장입금 | kakao_pay: 카카오페이 | naver_pay: 네이버페이
    method: {
      type: String,
      enum: ["card", "bank_transfer", "kakao_pay", "naver_pay"],
      default: "card",
    },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    /** 포트원 V2 `requestPayment`의 paymentId — 중복 주문 방지·추적용 */
    portonePaymentId: { type: String },
    portoneTxId: { type: String },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: [(v) => v.length > 0, "최소 1개의 상품이 필요합니다."],
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    payment: {
      type: paymentSchema,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "paid",
        "preparing",
        "shipping",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index(
  { "payment.portonePaymentId": 1 },
  { unique: true, sparse: true }
);

// Mongoose 9+: pre 훅에서 `next()` 콜백 제거됨 — 동기 훅이면 인자 없이 끝내면 됨
orderSchema.pre("save", function preSaveOrderNumber() {
  if (!this.orderNumber) {
    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("");
    const randomPart = crypto.randomBytes(4).toString("hex");
    this.orderNumber = `ORD-${datePart}-${randomPart}`;
  }
});

module.exports = mongoose.model("Order", orderSchema);
