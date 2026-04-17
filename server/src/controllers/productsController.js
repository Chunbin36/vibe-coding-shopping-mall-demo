const mongoose = require("mongoose");

const Product = require("../models/Product");

const VALID_CATEGORIES = ["ceramic", "wood", "glass", "brass", "leather", "fiber"];

// CREATE
const createProduct = async (req, res) => {
  try {
    const { sku, name, price, category, artist, image, description } = req.body;

    if (!sku || !name || price == null || !image) {
      return res.status(400).json({
        message: "SKU, 상품이름, 가격, 이미지는 필수입니다.",
      });
    }

    if (typeof price !== "number" || price < 0) {
      return res.status(400).json({
        message: "가격은 0 이상의 숫자여야 합니다.",
      });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: `카테고리는 ${VALID_CATEGORIES.join(", ")} 중 하나여야 합니다.`,
      });
    }

    const existing = await Product.findOne({ sku: sku.trim() });
    if (existing) {
      return res.status(409).json({ message: "이미 존재하는 SKU입니다." });
    }

    const isSeller = req.user?.user_type === "seller";

    const product = await Product.create({
      sku,
      name,
      price,
      category,
      artist,
      image,
      description,
      seller: req.user?.userId || null,
      approvalStatus: isSeller ? "pending" : "approved",
    });

    return res.status(201).json({ message: "상품이 등록되었습니다.", product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "이미 존재하는 SKU입니다." });
    }
    return res.status(400).json({ message: error.message });
  }
};

// READ: 전체 상품 목록 (최신순, 페이지네이션)
const getProducts = async (req, res) => {
  try {
    const { category, approvalStatus } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 5, 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (category && VALID_CATEGORIES.includes(category)) {
      filter.category = category;
    }
    if (approvalStatus && ["pending", "approved", "rejected"].includes(approvalStatus)) {
      filter.approvalStatus = approvalStatus;
    }

    const [products, totalCount] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      products,
      page,
      limit,
      totalCount,
      totalPages,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// READ: 단일 상품 조회
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "유효하지 않은 상품 ID입니다." });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    return res.json(product);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// UPDATE
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "유효하지 않은 상품 ID입니다." });
    }

    if (req.body.price != null && (typeof req.body.price !== "number" || req.body.price < 0)) {
      return res.status(400).json({ message: "가격은 0 이상의 숫자여야 합니다." });
    }

    if (req.body.category && !VALID_CATEGORIES.includes(req.body.category)) {
      return res.status(400).json({
        message: `카테고리는 ${VALID_CATEGORIES.join(", ")} 중 하나여야 합니다.`,
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    return res.json({ message: "상품이 수정되었습니다.", product: updatedProduct });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "이미 존재하는 SKU입니다." });
    }
    return res.status(400).json({ message: error.message });
  }
};

// DELETE
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "유효하지 않은 상품 ID입니다." });
    }

    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    return res.json({ message: "상품이 삭제되었습니다." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// UPDATE: 상품 승인 (admin)
const approveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "유효하지 않은 상품 ID입니다." });
    }
    if (req.user?.user_type !== "admin") {
      return res.status(403).json({ message: "관리자만 승인할 수 있습니다." });
    }
    const product = await Product.findByIdAndUpdate(
      id,
      { approvalStatus: "approved" },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    return res.json({ message: "승인되었습니다.", product });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// UPDATE: 상품 반려 (admin)
const rejectProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "유효하지 않은 상품 ID입니다." });
    }
    if (req.user?.user_type !== "admin") {
      return res.status(403).json({ message: "관리자만 반려할 수 있습니다." });
    }
    const product = await Product.findByIdAndUpdate(
      id,
      { approvalStatus: "rejected" },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    return res.json({ message: "반려되었습니다.", product });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// READ: 로그인한 셀러 본인 상품만 조회
const getMyProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 8, 1);
    const skip = (page - 1) * limit;

    const filter = { seller: req.user.userId };

    const [products, totalCount] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    return res.json({
      products,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMyProducts,
  approveProduct,
  rejectProduct,
};
