const express = require("express");
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/usersController");

const router = express.Router();

// CREATE: 사용자 생성 라우트
router.post("/", createUser);

// READ: 전체 사용자 목록 조회 라우트
router.get("/", getUsers);

// READ: 특정 사용자 1명 조회 라우트
router.get("/:id", getUserById);

// UPDATE: 특정 사용자 수정 라우트
router.put("/:id", updateUser);

// DELETE: 특정 사용자 삭제 라우트
router.delete("/:id", deleteUser);

module.exports = router;

//ss