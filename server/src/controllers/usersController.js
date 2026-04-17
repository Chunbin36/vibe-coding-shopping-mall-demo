const mongoose = require("mongoose");

const User = require("../models/User");

// 이메일 형식 정규식 (도메인까지 포함한 유효한 형식만 허용)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 비밀번호 규칙: 최소 8자, 영문+숫자 조합
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;

// CREATE: 사용자 생성
const createUser = async (req, res) => {
  try {
    const { email, name, nickname, password, address, user_type } = req.body;

    // 1. 필수값 누락 검증
    if (!email || !name || !password) {
      return res.status(400).json({
        message: "이메일, 이름, 비밀번호는 필수입니다.",
      });
    }

    // 2. 공백만 입력한 경우 검증
    if (!email.trim() || !name.trim() || !password.trim()) {
      return res.status(400).json({
        message: "공백만 입력할 수 없습니다.",
      });
    }

    // 3. 이메일 형식 검증 (도메인 없는 주소 차단)
    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        message: "올바른 이메일 형식이 아닙니다. (예: example@domain.com)",
      });
    }

    // 4. 비밀번호 길이 검증
    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        message: `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
      });
    }
    // 5. 비밀번호 영문+숫자 조합 검증
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message: "비밀번호는 영문과 숫자를 모두 포함해야 합니다.",
      });
    }

    // 6. 이메일 중복 검증
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        message: "이미 사용 중인 이메일입니다.",
      });
    }

    // 7. 비밀번호는 User 모델 pre-save hook에서 자동 해싱
    const user = await User.create({
      email,
      name,
      nickname,
      password,
      address,
      user_type: user_type || "customer",
    });

    // 비밀번호를 제외한 정보만 응답
    return res.status(201).json({
      message: "회원가입이 완료되었습니다.",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        user_type: user.user_type,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    // MongoDB unique 제약 위반 (동시 요청 등 예외 케이스)
    if (error.code === 11000) {
      return res.status(409).json({ message: "이미 사용 중인 이메일입니다." });
    }
    return res.status(400).json({ message: error.message });
  }
};

// READ: 전체 사용자 목록 조회 (최신 생성순)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// READ: 특정 사용자 1명 조회
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // MongoDB ObjectId 형식인지 먼저 검증
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// UPDATE: 특정 사용자 정보 전체 수정
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // MongoDB ObjectId 형식인지 먼저 검증
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // new: true -> 수정된 최신 문서 반환
    // runValidators: true -> 스키마 유효성 검증 유지
    const updatedUser = await User.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(updatedUser);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// DELETE: 특정 사용자 삭제
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // MongoDB ObjectId 형식인지 먼저 검증
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
