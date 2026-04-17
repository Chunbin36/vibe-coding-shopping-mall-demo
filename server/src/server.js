require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

// 환경변수에 PORT가 없으면 5000 포트 사용
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 서버 실행 전에 DB 연결 먼저 수행
    await connectDB();
    // DB 연결 성공 후 HTTP 서버 시작
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    // 초기화 실패 시 에러 로그 후 프로세스 종료
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

// 서버 부트스트랩 실행
startServer();
