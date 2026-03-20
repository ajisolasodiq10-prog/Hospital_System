// =====================================================
// seed/seedData.js  —  Load starter data into MongoDB
// =====================================================
//
// Run once with:  npm run seed
//
// Admin credentials are read from your .env file —
// nothing is hardcoded here.
//
// Add these three lines to your .env before running:
//   ADMIN_NAME=Admin User
//   ADMIN_EMAIL=admin@hospital.com
//   ADMIN_PASSWORD=yourStrongPassword
// =====================================================

require("dotenv").config();

const mongoose  = require("mongoose");
const Doctor    = require("../models/Doctor");
const Patient   = require("../models/Patient");
const connectDB = require("../config/db");

const doctors = [
  {
    name:           "Dr. Sarah Mitchell",
    specialization: "Cardiologist",
    availableDays:  ["Monday", "Wednesday", "Friday"],
    email:          "sarah.mitchell@hospital.com"
  },
  {
    name:           "Dr. James Okafor",
    specialization: "Dermatologist",
    availableDays:  ["Tuesday", "Thursday", "Saturday"],
    email:          "james.okafor@hospital.com"
  },
  {
    name:           "Dr. Priya Sharma",
    specialization: "General Physician",
    availableDays:  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    email:          "priya.sharma@hospital.com"
  },
  {
    name:           "Dr. Marcus Chen",
    specialization: "Dentist",
    availableDays:  ["Wednesday", "Thursday", "Friday"],
    email:          "marcus.chen@hospital.com"
  },
  {
    name:           "Dr. Elena Rodriguez",
    specialization: "Surgeon",
    availableDays:  ["Monday", "Tuesday", "Friday"],
    email:          "elena.rodriguez@hospital.com"
  }
];

async function seed() {

  // Read admin credentials from .env — not hardcoded anywhere
  const adminName     = process.env.ADMIN_NAME;
  const adminEmail    = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminName || !adminEmail || !adminPassword) {
    console.error("\n❌ Missing admin credentials in .env");
    console.error("   Add these three lines to your .env file:\n");
    console.error("   ADMIN_NAME=Admin User");
    console.error("   ADMIN_EMAIL=admin@hospital.com");
    console.error("   ADMIN_PASSWORD=yourStrongPassword\n");
    process.exit(1);
  }

  await connectDB();

  console.log("\nClearing old seed data...");
  await Doctor.deleteMany({});
  await Patient.deleteMany({ role: "admin" });

  console.log("Adding doctors...");
  await Doctor.insertMany(doctors);
  doctors.forEach(function (d) {
    console.log("  ✅ " + d.name + " — " + d.specialization);
  });

  console.log("\nCreating admin account...");
  await Patient.create({
    name:     adminName,
    email:    adminEmail,
    password: adminPassword,
    phone:    "0000000000",
    role:     "admin"
  });

  console.log("  ✅ Name:     " + adminName);
  console.log("  ✅ Email:    " + adminEmail);
  console.log("  ✅ Password: " + adminPassword);
  console.log("\n🎉 Done! Start the server with: npm run dev\n");

  process.exit(0);
}

seed().catch(function (err) {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
