const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB Atlas Connected");
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Mongoose will retry automatically.");
    });

    mongoose.connection.on("error", (error) => {
      console.error("❌ MongoDB Connection Error:", error.message);
    });

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 10,
    });
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
