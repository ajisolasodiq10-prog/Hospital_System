// ─────────────────────────────────────────────
// config/db.js  —  Connect to MongoDB
// ─────────────────────────────────────────────
//
// This file does one thing: connect our app to MongoDB.
// We call connectDB() once when the server starts.
//
// mongoose is the library that talks to MongoDB for us.
// Think of it as a translator between JavaScript and MongoDB.
// ─────────────────────────────────────────────

const mongoose = require("mongoose");

async function connectDB() {
  try {
    // mongoose.connect() opens the connection.
    // process.env.MONGO_URI reads the value from your .env file.
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ Connected to MongoDB");
  } catch (error) {
    // If the connection fails, print the reason and stop the server.
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1); // 1 means "stopped because of an error"
  }
}

module.exports = connectDB;
