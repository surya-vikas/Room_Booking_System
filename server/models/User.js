const mongoose = require("mongoose");

const ROLE_PRIORITY_MAP = {
  student: 1,
  club: 2,
  department: 3,
  admin: 4,
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "club", "department", "admin"],
      required: true,
    },
    priority: {
      type: Number,
      required: true,
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre("validate", function setPriority() {
  if (this.role) {
    this.priority = ROLE_PRIORITY_MAP[this.role];
  }
});

const User = mongoose.model("User", userSchema);

module.exports = {
  User,
  ROLE_PRIORITY_MAP,
};
