// ─────────────────────────────────────────────
// routes/authRoutes.js  —  Register & Login
// ─────────────────────────────────────────────
//
// These two routes are PUBLIC — no login required.
//
//   POST /api/register   — create a new patient account
//   POST /api/login      — log in and receive a JWT token
//
// What is a JWT (JSON Web Token)?
// It's a small piece of text the server gives you after login.
// You send it back with every future request to prove who you are.
// It's like a wristband at an event — show it at each door.
// ─────────────────────────────────────────────

const express     = require("express");
const router      = express.Router();
const jwt         = require("jsonwebtoken");
const rateLimit   = require("express-rate-limit");
const Patient     = require("../models/Patient");


// ─────────────────────────────────────────────
// Rate limiter — slow down brute force attacks
// ─────────────────────────────────────────────
// If someone tries to guess passwords by sending
// hundreds of login requests, this blocks them after 10 tries.
// ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 attempts per window
  message: { error: "Too many attempts. Wait 15 minutes and try again." }
});


// ─────────────────────────────────────────────
// Helper: makeToken
// ─────────────────────────────────────────────
// Creates a JWT that contains the user's ID and role.
// jwt.sign(payload, secret, options)
//   payload  — the data we want to store inside the token
//   secret   — a private key used to sign and verify the token
//   expiresIn — how long until the token stops working
// ─────────────────────────────────────────────
function makeToken(patient) {
  return jwt.sign(
    { id: patient._id, role: patient.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}


// ─────────────────────────────────────────────
// POST /api/register
// ─────────────────────────────────────────────
router.post("/register", authLimiter, async (req, res) => {

  // Pull the fields out of the request body
  const { name, email, phone, password } = req.body;

  // ── Basic validation ───────────────────────
  // Check that nothing is missing before touching the database
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ error: "Name must be at least 2 characters." });
  }

  // Simple email check — must contain @ and a dot after it
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  // Phone must be digits only, 10–15 characters long
  if (!/^\d{10,15}$/.test(phone)) {
    return res.status(400).json({ error: "Phone must be 10–15 digits, numbers only." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    // Check if this email is already registered
    const existing = await Patient.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    // Create the new patient.
    // The password gets hashed automatically by the "pre save" hook in Patient.js
    const patient = await Patient.create({ name, email, phone, password });

    // Return success — don't send back the password (even hashed)
    res.status(201).json({
      message: "Account created successfully! You can now log in.",
      user: {
        id:    patient._id,
        name:  patient.name,
        email: patient.email,
        phone: patient.phone
      }
    });

  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});


// ─────────────────────────────────────────────
// POST /api/login
// ─────────────────────────────────────────────
router.post("/login", authLimiter, async (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Find the patient by email
    // We need the password field for comparison — it's excluded by default
    const patient = await Patient.findOne({ email: email.toLowerCase() });

    if (!patient) {
      // Don't say "email not found" — that would tell attackers which emails exist
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    // Compare what the user typed with the stored hash
    const passwordMatches = await patient.checkPassword(password);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    // Passwords match — create a token for this patient
    const token = makeToken(patient);

    res.status(200).json({
      message: "Logged in successfully!",
      token,   // the frontend stores this and sends it with future requests
      user: {
        id:    patient._id,
        name:  patient.name,
        email: patient.email,
        phone: patient.phone,
        role:  patient.role
      }
    });

  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});


module.exports = router;
