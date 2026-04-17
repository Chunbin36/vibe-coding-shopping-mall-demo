const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const indexRouter = require("./routes");

const app = express();
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

// CORS 허용 (프론트엔드와 API 통신용)
app.use(
  cors({
    origin(origin, callback) {
      // Postman/서버-서버 요청처럼 Origin 헤더가 없는 경우 허용
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
// 요청 로그 출력
app.use(morgan("dev"));
// JSON 요청 본문 파싱
app.use(express.json());

// /api 하위 라우트 연결 (헬스체크 + /api/users 등)
app.use("/api", indexRouter);

module.exports = app;
