// ─────────────────────────────────────────────
// models/Doctor.js  —  The Doctor "shape"
// ─────────────────────────────────────────────
//
// Doctors are added by the admin (reception staff).
// Patients can see the list of doctors and book with them.
// ─────────────────────────────────────────────

const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true
  },

  // The doctor's medical specialty.
  // "enum" means only these exact values are accepted — nothing else.
  specialization: {
    type: String,
    required: true,
    enum: ["Dentist", "Surgeon", "Cardiologist", "Dermatologist", "General Physician"]
  },

  // An array of days the doctor is available.
  // Example: ["Monday", "Wednesday", "Friday"]
  availableDays: {
    type: [String], // array of strings
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  },

  email: {
    type: String,
    required: true,
    lowercase: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Doctor", doctorSchema);
