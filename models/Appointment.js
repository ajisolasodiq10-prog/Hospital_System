// ─────────────────────────────────────────────
// models/Appointment.js  —  The Appointment "shape"
// ─────────────────────────────────────────────
//
// An appointment links a Patient to a Doctor
// at a specific date and time slot.
//
// patientId and doctorId are special fields called "references".
// Instead of copying all the patient/doctor details into every
// appointment, we just store their ID and MongoDB can look them
// up later. This is called "population" (joining in SQL world).
// ─────────────────────────────────────────────

const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({

  // Which patient booked this?
  // ObjectId is MongoDB's unique ID type.
  // ref: "Patient" tells Mongoose which collection to look in when populating.
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true
  },

  // Which doctor is this with?
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  // The time slot chosen. Only these exact values are allowed.
  timeSlot: {
    type: String,
    required: true,
    enum: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30","12:00","12:30","1:00","1:30", "14:00", "14:30", "15:00"]
  },

  reason: {
    type: String,
    required: true
  },

  // Where this appointment is in its lifecycle.
  status: {
    type: String,
    enum: ["scheduled", "completed", "cancelled", "no-show"],
    default: "scheduled"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});


// ─────────────────────────────────────────────
// Compound unique index — prevents double booking
// ─────────────────────────────────────────────
// This says: the combination of (doctorId + date + timeSlot)
// must be unique in the database. Two patients can't book
// the same doctor at the same time on the same day.
// ─────────────────────────────────────────────
appointmentSchema.index(
  { doctorId: 1, date: 1, timeSlot: 1 },
  { unique: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
