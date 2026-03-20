// ─────────────────────────────────────────────
// server.js  —  The main entry point
// ─────────────────────────────────────────────
//
// This file ties everything together.
// When you run "node server.js", this is what runs.
//
// Order of operations:
//   1. Load environment variables from .env
//   2. Connect to MongoDB
//   3. Create the Express app
//   4. Add middleware (security, body parsing)
//   5. Serve the frontend HTML files from /public
//   6. Register all API routes
//   7. Start listening for requests
// ─────────────────────────────────────────────

// Step 1 — Load .env FIRST, before anything else reads process.env
require("dotenv").config();

const express   = require("express");
const helmet    = require("helmet");
const path      = require("path");
const connectDB = require("./config/db");

// Import our route files
const authRoutes        = require("./routes/authRoutes");
const doctorRoutes      = require("./routes/doctorRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const adminRoutes       = require("./routes/adminRoutes");


// Step 2 — Connect to MongoDB
connectDB();


// Step 3 — Create the Express application
const app = express();


// ─────────────────────────────────────────────
// Step 4 — Middleware
// ─────────────────────────────────────────────

// helmet adds security headers to every response automatically
// (protects against common web attacks like XSS, clickjacking, etc.)
app.use(helmet({
  // We need to relax this one setting so our HTML pages can load Google Fonts
  contentSecurityPolicy: false
}));

// This lets Express read JSON bodies from requests
// (i.e. it makes req.body work for JSON data)
app.use(express.json());

// This lets Express read form-encoded bodies too
app.use(express.urlencoded({ extended: true }));


// ─────────────────────────────────────────────
// Step 5 — Serve frontend files from /public
// ─────────────────────────────────────────────
// express.static() serves files from a folder directly.
// Visiting http://localhost:5000/ will serve public/index.html
// Visiting http://localhost:5000/js/login.js will serve that file
// ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));


// ─────────────────────────────────────────────
// Step 6 — API Routes
// ─────────────────────────────────────────────
// Each group of routes is mounted at a base path.
// For example, everything in authRoutes is prefixed with /api
// So "POST /register" inside authRoutes becomes "POST /api/register"
// ─────────────────────────────────────────────
app.use("/api",             authRoutes);
app.use("/api/doctors",     doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin",       adminRoutes);


// Health check — a simple route to test if the server is running
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname,          // Temporary comment to force Git to detect change                       
   "public", "dashboard.html")  // Temporary comment to force Git to detect change
  );// Temporary comment to force Git to detect change
});// Temporary comment to force Git to detect change


// ─────────────────────────────────────────────
// 404 handler for unknown routes
// ─────────────────────────────────────────────
// This runs if NO route above matched the request
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});


// ─────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────
// If any route calls next(error), Express routes it here.
// This MUST have 4 parameters — that's how Express knows
// it's an error handler (not a regular middleware).
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "An unexpected error occurred." });
});


// ─────────────────────────────────────────────
// Step 7 — Start the server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🏥 Server running at http://localhost:${PORT}`);
  console.log(`📂 Frontend:    http://localhost:${PORT}/login.html`);
});
