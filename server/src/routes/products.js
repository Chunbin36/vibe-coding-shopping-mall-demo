const express = require("express");
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMyProducts,
  approveProduct,
  rejectProduct,
} = require("../controllers/productsController");
const authenticate = require("../middlewares/auth");

const router = express.Router();

// 누구나 조회 가능
router.get("/", getProducts);
// 셀러 본인 상품만 조회 (인증 필요) — /:id 보다 먼저 등록
router.get("/my", authenticate, getMyProducts);
router.get("/:id", getProductById);

// 인증된 사용자만 생성/수정/삭제
router.post("/", authenticate, createProduct);
router.put("/:id/approve", authenticate, approveProduct);
router.put("/:id/reject", authenticate, rejectProduct);
router.put("/:id", authenticate, updateProduct);
router.delete("/:id", authenticate, deleteProduct);

module.exports = router;
