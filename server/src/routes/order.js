const express = require("express");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getAllOrders,
  getAdminOrderStats,
} = require("../controllers/orderController");
const authenticate = require("../middlewares/auth");

const router = express.Router();

router.use(authenticate);

router.post("/", createOrder);
router.get("/", getMyOrders);
router.get("/all", getAllOrders);
router.get("/admin/stats", getAdminOrderStats);

router.put("/:id/status", updateOrderStatus);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);
router.get("/:id", getOrderById);

module.exports = router;
