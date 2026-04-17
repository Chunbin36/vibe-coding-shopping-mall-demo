const mongoose = require("mongoose");

const DEFAULT_LOCAL_URI = "mongodb://127.0.0.1:27017/shopping_mall";

const connectDB = async () => {
  const atlasUri = process.env.MongoDB_ATLAS_URI?.trim();
  const mongoUri =
    atlasUri ||
    process.env.MONGO_URI?.trim() ||
    DEFAULT_LOCAL_URI;

  await mongoose.connect(mongoUri);

  const source = atlasUri
    ? "MongoDB Atlas (MongoDB_ATLAS_URI)"
    : process.env.MONGO_URI?.trim()
      ? "MONGO_URI (로컬/커스텀)"
      : "기본 로컬 주소";
  console.log(`MongoDB connected (${source})`);
};

module.exports = connectDB;
