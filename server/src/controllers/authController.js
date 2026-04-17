const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "이메일과 비밀번호를 모두 입력해주세요.",
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, user_type: user.user_type },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      message: "로그인에 성공했습니다.",
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        user_type: user.user_type,
        address: user.address,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

module.exports = { login, getMe };
