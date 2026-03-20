// ─────────────────────────────────────────────
// middleware/authMiddleware.js
// ─────────────────────────────────────────────
//
// What is middleware?
// Middleware is a function that runs BETWEEN the request
// arriving and the route handler responding.
//
// Think of it like a security guard at a door.
// Before you enter a room (route), the guard checks
// your ID (JWT token). If it's valid, you get in.
// If not, you're turned away with a 401 error.
//
// We have two middleware functions here:
//   1. protect     — checks the JWT, attaches the user
//   2. adminOnly   — only lets admins through
// ─────────────────────────────────────────────

const jwt     = require("jsonwebtoken");
const Patient = require("../models/Patient");


// ─────────────────────────────────────────────
// protect — verify the JWT token
// ─────────────────────────────────────────────
// How to use it on a route:
//   router.get("/profile", protect, handlerFunction)
//
// The frontend sends the token in a header like this:
//   Authorization: Bearer eyJhbGci...
// ─────────────────────────────────────────────
async function protect(req, res, next) {

  // Step 1 — Look for the Authorization header
  const authHeader = req.headers.authorization;

  // The header looks like: "Bearer eyJhbGci..."
  // We check it starts with "Bearer " then grab the token part
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not logged in. Please provide a token." });
  }

  // Split "Bearer eyJhbGci..." into ["Bearer", "eyJhbGci..."]
  // and take index [1] — the actual token
  const token = authHeader.split(" ")[1];

  try {
    // Step 2 — Verify the token using our secret key
    // If the token was tampered with or expired, this throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded now contains what we put in when we created the token:
    // { id: "...", role: "...", iat: ..., exp: ... }

    // Step 3 — Find the patient in the database using the ID from the token
    // .select("-password") means "give me everything EXCEPT the password field"
    const patient = await Patient.findById(decoded.id).select("-password");

    if (!patient) {
      return res.status(401).json({ error: "Account not found." });
    }

    // Step 4 — Attach the patient to the request object
    // Now any route that uses this middleware can access req.user
    req.user = patient;

    // Step 5 — Call next() to move on to the actual route handler
    next();

  } catch (error) {
    // jwt.verify throws specific errors we can check
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid token. Please log in again." });
  }
}


// ─────────────────────────────────────────────
// adminOnly — only allow admin users
// ─────────────────────────────────────────────
// ALWAYS use this AFTER protect, because it
// relies on req.user being set by protect first.
//
// Usage:
//   router.post("/doctors", protect, adminOnly, handlerFunction)
// ─────────────────────────────────────────────
function adminOnly(req, res, next) {
  if (req.user && req.user.role === "admin") {
    return next(); // admin — let them through
  }
  return res.status(403).json({ error: "Admin access only." });
  // 403 = Forbidden (you're logged in but not allowed)
}


module.exports = { protect, adminOnly };
