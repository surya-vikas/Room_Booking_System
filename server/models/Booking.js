const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    attendees: {
      type: Number,
      required: true,
      min: 1,
    },
    requiredFeatures: {
      type: [String],
      default: [],
    },
    bookingPurpose: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
    studentPhone: {
      type: String,
      trim: true,
      default: "",
    },
    departmentPhone: {
      type: String,
      trim: true,
      default: "",
    },
    priority: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "cancelled", "rejected"],
      default: "pending",
    },
    overrideReason: {
      type: String,
      trim: true,
      default: "",
    },
    overrideMetadata: {
      overrideBatchId: {
        type: String,
        trim: true,
        default: "",
      },
      overriddenByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      overriddenByRole: {
        type: String,
        enum: ["student", "club", "department", "admin"],
      },
      overriddenByPriority: {
        type: Number,
      },
      overridingRequestDate: {
        type: Date,
      },
      overridingStartTime: {
        type: String,
        trim: true,
      },
      overridingEndTime: {
        type: String,
        trim: true,
      },
      overriddenAt: {
        type: Date,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = {
  Booking,
};
