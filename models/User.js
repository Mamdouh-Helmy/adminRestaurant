const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: "" },
  address: { type: String, default: "" },
  phone: { type: String, default: "" },
  age: { type: Number, default: null },
  profileImage: { type: String, default: "https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671142.jpg" },
  logo: { type: String, default: "" },
});

// منع إعادة تشفير كلمة المرور إذا كانت مشفرة بالفعل
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const isHashed = this.password.startsWith("$2a$10$");
  if (isHashed) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
