// ─────────────────────────────────────────────
// routes/adminRoutes.js  —  Reception Dashboard
// ─────────────────────────────────────────────
//
// These routes are for hospital admin/reception staff.
// Both protect AND adminOnly middleware are required.
//
//   GET   /api/admin/appointments      — see ALL appointments
//   PATCH /api/admin/appointments/:id  — update appointment status
// ─────────────────────────────────────────────

const express                = require("express");
const router                 = express.Router();
const Appointment            = require("../models/Appointment");
const { protect, adminOnly } = require("../middleware/authMiddleware");


// ─────────────────────────────────────────────
// GET /api/admin/appointments  —  All appointments
// ─────────────────────────────────────────────
// Optional filter: ?status=scheduled
// ─────────────────────────────────────────────
router.get("/appointments", protect, adminOnly, async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const appointments = await Appointment
      .find(filter)
      .populate("patientId", "name email phone") // join patient details
      .populate("doctorId",  "name specialization") // join doctor details
      .sort({ date: -1 }); // -1 = descending (most recent first)

    res.status(200).json({
      count: appointments.length,
      appointments
    });

  } catch (error) {
    console.error("Admin get appointments error:", error.message);
    res.status(500).json({ error: "Could not load appointments." });
  }
});


// ─────────────────────────────────────────────
// PATCH /api/admin/appointments/:id
// ─────────────────────────────────────────────
// PATCH means "partially update" — we're only changing the status field.
// (PUT would mean replacing the whole document.)
// ─────────────────────────────────────────────
router.patch("/appointments/:id", protect, adminOnly, async (req, res) => {

  const { status } = req.body;
  const validStatuses = ["scheduled", "completed", "cancelled", "no-show"];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Status must be one of: ${validStatuses.join(", ")}`
    });
  }

  try {
    // findByIdAndUpdate finds the document, updates it, and returns it.
    // { new: true } means "return the updated version, not the old one"
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("patientId", "name email phone")
      .populate("doctorId",  "name specialization");

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found." });
    }

    res.status(200).json({
      message: `Status updated to "${status}".`,
      appointment
    });

  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid appointment ID." });
    }
    console.error("Admin update status error:", error.message);
    res.status(500).json({ error: "Could not update appointment." });
  }
});


module.exports = router;
