const mongoose = require("mongoose");

const { Schema } = mongoose;

const productSchema = new Schema(
  {
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be a positive number"],
    },
    category: {
      type: String,
      enum: ["ceramic", "wood", "glass", "brass", "leather", "fiber"],
      default: "ceramic",
    },
    artist: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      required: [true, "Image is required"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);
