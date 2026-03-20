// ─────────────────────────────────────────────
// routes/doctorRoutes.js  —  Doctor Management
// ─────────────────────────────────────────────
//
// All routes here require a valid JWT (protect middleware).
// Add/Delete routes also require admin role (adminOnly middleware).
//
//   GET    /api/doctors        — anyone logged in can list doctors
//   POST   /api/doctors        — admin only: add a doctor
//   DELETE /api/doctors/:id    — admin only: remove a doctor
// ─────────────────────────────────────────────

const express              = require("express");
const router               = express.Router();
const Doctor               = require("../models/Doctor");
const { protect, adminOnly } = require("../middleware/authMiddleware");


// ─────────────────────────────────────────────
// GET /api/doctors  —  List all doctors
// ─────────────────────────────────────────────
// Optional filter: /api/doctors?specialization=Dentist
// ─────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    // Build a filter object.
    // If ?specialization= is in the URL, add it to the filter.
    // Otherwise the filter is empty {}, which returns all doctors.
    const filter = {};
    if (req.query.specialization) {
      filter.specialization = req.query.specialization;
    }

    const doctors = await Doctor.find(filter);

    res.status(200).json({
      count: doctors.length,
      doctors
    });

  } catch (error) {
    console.error("Get doctors error:", error.message);
    res.status(500).json({ error: "Could not load doctors." });
  }
});


// ─────────────────────────────────────────────
// POST /api/doctors  —  Add a new doctor (admin only)
// ─────────────────────────────────────────────
router.post("/", protect, adminOnly, async (req, res) => {

  const { name, specialization, availableDays, email } = req.body;

  // Validate required fields
  if (!name || !specialization || !availableDays || !email) {
    return res.status(400).json({ error: "name, specialization, availableDays, and email are all required." });
  }

  if (!Array.isArray(availableDays) || availableDays.length === 0) {
    return res.status(400).json({ error: "availableDays must be an array with at least one day." });
  }

  try {
    const doctor = await Doctor.create({ name, specialization, availableDays, email });

    res.status(201).json({
      message: "Doctor added successfully.",
      doctor
    });

  } catch (error) {
    // Mongoose throws a ValidationError if a value isn't in the enum list
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    console.error("Add doctor error:", error.message);
    res.status(500).json({ error: "Could not add doctor." });
  }
});


// ─────────────────────────────────────────────
// DELETE /api/doctors/:id  —  Remove a doctor (admin only)
// ─────────────────────────────────────────────
// :id is a URL parameter — e.g. /api/doctors/64abc123
// It's available as req.params.id
// ─────────────────────────────────────────────
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);

    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found." });
    }

    res.status(200).json({ message: `Doctor "${doctor.name}" deleted.` });

  } catch (error) {
    // CastError happens when the :id isn't a valid MongoDB ObjectId format
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid doctor ID." });
    }
    console.error("Delete doctor error:", error.message);
    res.status(500).json({ error: "Could not delete doctor." });
  }
});


module.exports = router;
