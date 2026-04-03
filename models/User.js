const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  apiKey: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});

// Generate a unique API key on creation
userSchema.pre("save", function (next) {
  if (!this.apiKey) {
    this.apiKey = "mash_" + crypto.randomBytes(24).toString("hex");
  }
  next();
});

// Simple password hashing (use bcrypt in production)
userSchema.statics.hashPassword = function (password) {
  return crypto.createHash("sha256").update(password).digest("hex");
};

userSchema.methods.verifyPassword = function (password) {
  return this.passwordHash === crypto.createHash("sha256").update(password).digest("hex");
};

module.exports = mongoose.model("User", userSchema);
