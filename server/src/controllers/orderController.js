const mongoose = require("mongoose");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const User = require("../models/User");
const { verifyPortOneV2Payment } = require("../utils/portoneVerify");

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** query: month | 3months | year | all */
function buildCreatedAtFromPeriod(period) {
  if (!period || period === "all") return null;
  const start = new Date();
  if (period === "month") start.setMonth(start.getMonth() - 1);
  else if (period === "3months") start.setMonth(start.getMonth() - 3);
  else if (period === "year") start.setFullYear(start.getFullYear() - 1);
  else return null;
  return { $gte: start };
}

function mapPortOneError(err) {
  const code = err?.code;
  switch (code) {
    case "PORTONE_CONFIG":
      return { status: 503, message: err.message };
    case "PORTONE_NOT_PAID":
    case "PORTONE_AMOUNT_MISMATCH":
    case "PORTONE_TX_MISMATCH":
    case "PORTONE_ID_MISMATCH":
    case "PORTONE_STORE_MISMATCH":
    case "PORTONE_INVALID":
    case "PORTONE_AMOUNT":
    case "PORTONE_INPUT":
      return { status: 400, message: err.message };
    case "PORTONE_AUTH":
    case "PORTONE_FETCH":
      return { status: 502, message: err.message };
    default:
      return null;
  }
}

const VALID_STATUSES = [
  "pending", "paid", "preparing", "shipping",
  "delivered", "cancelled", "refunded",
];

/** 카드 | 무통장입금 | 카카오페이 | 네이버페이 */
const VALID_PAYMENT_METHODS = [
  "card",
  "bank_transfer",
  "kakao_pay",
  "naver_pay",
];

// POST /api/orders — 장바구니 기반 주문 생성
const createOrder = async (req, res) => {
  try {
    const { shippingAddress: rawShipping, paymentMethod = "card", portone } =
      req.body;

    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        message: `결제 수단은 ${VALID_PAYMENT_METHODS.join(", ")} 중 하나여야 합니다.`,
      });
    }

    if (
      !rawShipping ||
      !rawShipping.name ||
      !rawShipping.phone ||
      !rawShipping.address
    ) {
      return res.status(400).json({
        message: "받는 사람 이름, 연락처, 주소는 필수입니다.",
      });
    }

    const shippingAddress = {
      name: String(rawShipping.name).trim(),
      phone: String(rawShipping.phone).trim(),
      zipCode: String(rawShipping.zipCode ?? "").trim(),
      address: String(rawShipping.address).trim(),
      addressDetail: String(rawShipping.addressDetail ?? "").trim(),
      memo: String(rawShipping.memo ?? "").trim(),
    };

    if (!portone || String(portone.version || "v2") !== "v2") {
      return res.status(400).json({
        message:
          "포트원 결제 검증 정보(portone.version, portone.paymentId)가 필요합니다.",
      });
    }

    const paymentId =
      typeof portone.paymentId === "string" ? portone.paymentId.trim() : "";
    if (!paymentId) {
      return res.status(400).json({
        message: "portone.paymentId가 없습니다.",
      });
    }

    const txId =
      portone.txId != null && portone.txId !== ""
        ? String(portone.txId).trim()
        : undefined;

    const cart = await Cart.findOne({ user: req.user.userId }).populate(
      "items.product"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "장바구니가 비어있습니다." });
    }

    const invalidItems = cart.items.filter(
      (item) =>
        !item.product ||
        typeof item.product.price !== "number" ||
        Number.isNaN(item.product.price)
    );
    if (invalidItems.length > 0) {
      return res.status(400).json({
        message:
          "장바구니에 삭제되었거나 가격 정보가 없는 상품이 있습니다. 장바구니로 돌아가 수정한 뒤 다시 시도해 주세요.",
      });
    }

    const items = cart.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.image || "",
    }));

    const subtotal = items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );
    const shippingFee = subtotal >= 50000 ? 0 : 3000;
    const discount = 0;
    const totalAmount = subtotal + shippingFee - discount;

    const existingByPayment = await Order.findOne({
      "payment.portonePaymentId": paymentId,
    }).lean();
    if (existingByPayment) {
      return res.status(409).json({
        message: "이미 해당 결제로 주문이 접수되었습니다.",
      });
    }

    try {
      await verifyPortOneV2Payment({
        paymentId,
        txId,
        expectedTotalKrw: totalAmount,
      });
    } catch (verifyErr) {
      const mapped = mapPortOneError(verifyErr);
      if (mapped) {
        return res.status(mapped.status).json({ message: mapped.message });
      }
      throw verifyErr;
    }

    const order = await Order.create({
      user: req.user.userId,
      items,
      shippingAddress,
      payment: {
        method: paymentMethod,
        subtotal,
        shippingFee,
        discount,
        totalAmount,
        portonePaymentId: paymentId,
        portoneTxId: txId || "",
      },
      status: "paid",
    });

    cart.items = [];
    await cart.save();

    return res.status(201).json({ message: "주문이 완료되었습니다.", order });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "동일한 결제 건으로 주문이 이미 등록되었거나 주문 번호가 겹쳤습니다. 다시 시도해 주세요.",
      });
    }
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/orders — 내 주문 목록 (최신순)
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId })
      .sort({ createdAt: -1 });

    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/:id — 단일 주문 상세
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "유효하지 않은 주문 ID입니다." });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    if (
      order.user.toString() !== req.user.userId &&
      req.user.user_type !== "admin"
    ) {
      return res.status(403).json({ message: "접근 권한이 없습니다." });
    }

    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/orders/:id/status — 주문 상태 변경 (관리자 전용)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "유효하지 않은 주문 ID입니다." });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `상태는 ${VALID_STATUSES.join(", ")} 중 하나여야 합니다.`,
      });
    }

    if (req.user.user_type !== "admin") {
      return res.status(403).json({ message: "관리자만 상태를 변경할 수 있습니다." });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    return res.json({ message: "주문 상태가 변경되었습니다.", order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/orders/:id — 주문 수정
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { shippingAddress, payment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "유효하지 않은 주문 ID입니다." });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    const isOwner = order.user.toString() === req.user.userId;
    const isAdmin = req.user.user_type === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "접근 권한이 없습니다." });
    }

    if (shippingAddress) {
      if (!isAdmin && order.status !== "pending") {
        return res.status(400).json({
          message: "배송지는 주문 접수(pending) 상태에서만 변경할 수 있습니다.",
        });
      }
      const cur = order.shippingAddress.toObject
        ? order.shippingAddress.toObject()
        : order.shippingAddress;
      order.shippingAddress = {
        name: shippingAddress.name ?? cur.name,
        phone: shippingAddress.phone ?? cur.phone,
        zipCode: shippingAddress.zipCode ?? cur.zipCode ?? "",
        address: shippingAddress.address ?? cur.address,
        addressDetail: shippingAddress.addressDetail ?? cur.addressDetail ?? "",
        memo: shippingAddress.memo ?? cur.memo ?? "",
      };
    }

    if (payment && isAdmin) {
      if (payment.method && VALID_PAYMENT_METHODS.includes(payment.method)) {
        order.payment.method = payment.method;
      }
      if (typeof payment.subtotal === "number") order.payment.subtotal = payment.subtotal;
      if (typeof payment.shippingFee === "number") order.payment.shippingFee = payment.shippingFee;
      if (typeof payment.discount === "number") order.payment.discount = payment.discount;
      if (typeof payment.totalAmount === "number") order.payment.totalAmount = payment.totalAmount;
    }

    await order.save();

    return res.json({ message: "주문이 수정되었습니다.", order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/orders/:id — 관리자: 삭제 / 구매자: pending일 때 취소(cancelled)
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "유효하지 않은 주문 ID입니다." });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    const isOwner = order.user.toString() === req.user.userId;
    const isAdmin = req.user.user_type === "admin";

    if (isAdmin) {
      await Order.findByIdAndDelete(id);
      return res.json({ message: "주문이 삭제되었습니다." });
    }

    if (!isOwner) {
      return res.status(403).json({ message: "접근 권한이 없습니다." });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        message: "주문 취소는 접수(pending) 상태에서만 가능합니다.",
      });
    }

    order.status = "cancelled";
    await order.save();

    return res.json({ message: "주문이 취소되었습니다.", order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/all — 전체 주문 목록 (관리자 전용)
const getAllOrders = async (req, res) => {
  try {
    if (req.user.user_type !== "admin") {
      return res.status(403).json({ message: "관리자만 접근할 수 있습니다." });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;

    const period = req.query.period || "all";
    const createdAtFilter = buildCreatedAtFromPeriod(period);
    const search =
      req.query.search && String(req.query.search).trim()
        ? String(req.query.search).trim()
        : "";

    const conditions = [];
    if (createdAtFilter) {
      conditions.push({ createdAt: createdAtFilter });
    }
    if (req.query.status === "cancel_return") {
      conditions.push({ status: { $in: ["cancelled", "refunded"] } });
    } else if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      conditions.push({ status: req.query.status });
    }
    if (search) {
      const q = escapeRegex(search);
      const userIds = await User.find({
        $or: [
          { name: new RegExp(q, "i") },
          { email: new RegExp(q, "i") },
        ],
      }).distinct("_id");
      const orConds = [{ orderNumber: new RegExp(q, "i") }];
      if (userIds.length) orConds.push({ user: { $in: userIds } });
      conditions.push({ $or: orConds });
    }

    const filter =
      conditions.length === 0
        ? {}
        : conditions.length === 1
          ? conditions[0]
          : { $and: conditions };

    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    return res.json({
      orders,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/admin/stats — 기간별 주문 건수 요약 (관리자)
const getAdminOrderStats = async (req, res) => {
  try {
    if (req.user.user_type !== "admin") {
      return res.status(403).json({ message: "관리자만 접근할 수 있습니다." });
    }

    const period = req.query.period || "month";
    const createdAtFilter = buildCreatedAtFromPeriod(period);
    const base = createdAtFilter ? { createdAt: createdAtFilter } : {};

    const [
      all,
      pending,
      preparing,
      shipping,
      cancelled,
      refunded,
    ] = await Promise.all([
      Order.countDocuments(base),
      Order.countDocuments({ ...base, status: "pending" }),
      Order.countDocuments({ ...base, status: "preparing" }),
      Order.countDocuments({ ...base, status: "shipping" }),
      Order.countDocuments({ ...base, status: "cancelled" }),
      Order.countDocuments({ ...base, status: "refunded" }),
    ]);

    return res.json({
      all,
      pending,
      preparing,
      shipping,
      cancelReturn: cancelled + refunded,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getAllOrders,
  getAdminOrderStats,
};
