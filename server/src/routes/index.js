const express = require("express");
const usersRouter = require("./users");
const authRouter = require("./auth");
const productsRouter = require("./products");
const cartRouter = require("./cart");
const orderRouter = require("./order");

const router = express.Router();

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/products", productsRouter);
router.use("/cart", cartRouter);
router.use("/orders", orderRouter);

// 헬스체크/기본 확인용 엔드포인트 — GET /api
router.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

module.exports = router;
