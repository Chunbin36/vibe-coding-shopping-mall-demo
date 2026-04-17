const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// GET /api/cart — 내 장바구니 조회
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId }).populate(
      "items.product",
      "sku name price image category artist"
    );

    if (!cart) {
      return res.json({ items: [] });
    }

    return res.json(cart);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/cart — 장바구니에 상품 추가 (이미 있으면 수량 증가)
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "상품 ID는 필수입니다." });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "유효하지 않은 상품 ID입니다." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    let cart = await Cart.findOne({ user: req.user.userId });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.userId,
        items: [{ product: productId, quantity: qty }],
      });
    } else {
      const existing = cart.items.find(
        (item) => item.product.toString() === productId
      );

      if (existing) {
        existing.quantity += qty;
      } else {
        cart.items.push({ product: productId, quantity: qty });
      }

      await cart.save();
    }

    const populated = await Cart.findById(cart._id).populate(
      "items.product",
      "sku name price image category artist"
    );

    return res.json({ message: "장바구니에 담았습니다.", cart: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/cart/:productId — 특정 상품 수량 변경
const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "유효하지 않은 상품 ID입니다." });
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      return res.status(400).json({ message: "수량은 1 이상이어야 합니다." });
    }

    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      return res.status(404).json({ message: "장바구니가 비어있습니다." });
    }

    const item = cart.items.find(
      (i) => i.product.toString() === productId
    );
    if (!item) {
      return res.status(404).json({ message: "장바구니에 해당 상품이 없습니다." });
    }

    item.quantity = qty;
    await cart.save();

    const populated = await Cart.findById(cart._id).populate(
      "items.product",
      "sku name price image category artist"
    );

    return res.json({ message: "수량이 변경되었습니다.", cart: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/cart/:productId — 특정 상품 장바구니에서 제거
const removeCartItem = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "유효하지 않은 상품 ID입니다." });
    }

    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      return res.status(404).json({ message: "장바구니가 비어있습니다." });
    }

    cart.items = cart.items.filter(
      (i) => i.product.toString() !== productId
    );
    await cart.save();

    const populated = await Cart.findById(cart._id).populate(
      "items.product",
      "sku name price image category artist"
    );

    return res.json({ message: "상품이 제거되었습니다.", cart: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/cart — 장바구니 전체 비우기
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      return res.json({ message: "장바구니가 이미 비어있습니다.", items: [] });
    }

    cart.items = [];
    await cart.save();

    return res.json({ message: "장바구니를 비웠습니다.", items: [] });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
