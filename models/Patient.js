// ─────────────────────────────────────────────
// models/Patient.js  —  The Patient "shape"
// ─────────────────────────────────────────────
//
// A Mongoose "model" tells MongoDB what a Patient
// document looks like — what fields it has, what
// type each field is, and any rules (like "required").
//
// Think of it like designing a paper form.
// Every patient that signs up fills in this form.
// ─────────────────────────────────────────────

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

// Step 1 — Define the shape (called a "schema")
const patientSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,  // can't be left blank
    trim: true        // removes extra spaces around the value
  },

  email: {
    type: String,
    required: true,
    unique: true,     // no two patients can share an email
    lowercase: true   // always saved as lowercase so "Jane@..." = "jane@..."
  },

  phone: {
    type: String,
    required: true
  },

  // We NEVER save the real password.
  // We save a "hash" — a scrambled version that can't be reversed.
  password: {
    type: String,
    required: true
  },

  // role tells us if this user is a normal patient or an admin.
  role: {
    type: String,
    enum: ["patient", "admin"], // only these two values are allowed
    default: "patient"          // new accounts are patients by default
  },

  createdAt: {
    type: Date,
    default: Date.now // automatically set to right now when created
  }

});


// ─────────────────────────────────────────────
// "pre save" hook
// ─────────────────────────────────────────────
// This runs automatically BEFORE a patient is saved to the database.
// If the password was changed, we hash it first.
//
// Why? Storing a plain password is dangerous.
// bcrypt turns "hello123" into something like "$2a$10$xJ..."
// Even if someone steals the database, they can't read the passwords.
// ─────────────────────────────────────────────
patientSchema.pre("save", async function (next) {

  // "this" = the patient document being saved
  // If the password hasn't changed, skip hashing and move on
  if (!this.isModified("password")) {
    return next();
  }

  // genSalt(10) creates a random "salt" — extra randomness added to the hash.
  // 10 is the "cost factor" — higher = more secure but slower. 10 is the sweet spot.
  const salt = await bcrypt.genSalt(10);

  // Hash the plain password using the salt
  this.password = await bcrypt.hash(this.password, salt);

  next(); // continue saving
});


// ─────────────────────────────────────────────
// Helper method: checkPassword
// ─────────────────────────────────────────────
// We call this during login to compare what the user typed
// with the stored hash. bcrypt.compare does the comparison safely.
// ─────────────────────────────────────────────
patientSchema.methods.checkPassword = async function (typedPassword) {
  return bcrypt.compare(typedPassword, this.password);
  // returns true if they match, false if they don't
};


// Step 2 — Create the model from the schema and export it
// "Patient" becomes the name of the MongoDB collection (stored as "patients")
module.exports = mongoose.model("Patient", patientSchema);
