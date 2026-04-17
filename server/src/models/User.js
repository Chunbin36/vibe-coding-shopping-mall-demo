const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const { Schema } = mongoose;
const SALT_ROUNDS = 10;

// 사용자(User) 컬렉션 구조 정의
const userSchema = new Schema(
  {
    // 이메일 (필수, 중복 불가)
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    // 이름 (필수)
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    // 닉네임 (선택)
    nickname: {
      type: String,
      trim: true,
    },
    // 비밀번호 (필수)
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    // 사용자 권한 타입 (필수, 기본값 customer)
    user_type: {
      type: String,
      required: [true, "User type is required"],
      enum: ["customer", "admin", "seller"],
      default: "customer",
    },
    // 주소 (선택)
    address: {
      type: String,
      trim: true,
    },
  },
  {
    // createdAt, updatedAt 자동 생성
    timestamps: true,
  }
);

// save/create 경로에서 비밀번호 평문 저장 방지
userSchema.pre("save", async function preSave() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// findByIdAndUpdate/findOneAndUpdate 경로에서도 비밀번호 해싱 보장
userSchema.pre("findOneAndUpdate", async function preFindOneAndUpdate() {
  const update = this.getUpdate();
  if (!update) return;

  const nextPassword =
    update.password ??
    (update.$set ? update.$set.password : undefined);

  if (!nextPassword) return;

  const hashed = await bcrypt.hash(nextPassword, SALT_ROUNDS);

  if (update.password) {
    update.password = hashed;
  }
  if (update.$set && update.$set.password) {
    update.$set.password = hashed;
  }
  this.setUpdate(update);
});

// User 모델 생성 및 내보내기
module.exports = mongoose.model("User", userSchema);
