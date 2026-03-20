// ─────────────────────────────────────────────
// routes/appointmentRoutes.js  —  Patient Appointments
// ─────────────────────────────────────────────
//
// All routes require a valid JWT (protect middleware).
// The patient's ID is read from the token — NOT from the
// request body. This means a patient can only ever book
// or cancel their OWN appointments.
//
//   POST   /api/appointments      — book a new appointment
//   GET    /api/appointments      — see my appointments
//   DELETE /api/appointments/:id  — cancel an appointment
// ─────────────────────────────────────────────

const express       = require("express");
const router        = express.Router();
const Appointment   = require("../models/Appointment");
const Doctor        = require("../models/Doctor");
const { protect }   = require("../middleware/authMiddleware");


// ─────────────────────────────────────────────
// Helper: get the day name from a date string
// ─────────────────────────────────────────────
// Example: "2025-06-16" → "Monday"
// We use this to check if the doctor works that day.
// ─────────────────────────────────────────────
function getDayName(dateString) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date(dateString).getDay()];
}


// ─────────────────────────────────────────────
// POST /api/appointments  —  Book an appointment
// ─────────────────────────────────────────────
router.post("/", protect, async (req, res) => {

  const { doctorId, date, timeSlot, reason } = req.body;

  // The patient's ID comes from the JWT token via req.user
  // This is set by the protect middleware
  const patientId = req.user._id;

  // ── Validate fields ────────────────────────
  if (!doctorId || !date || !timeSlot || !reason) {
    return res.status(400).json({ error: "doctorId, date, timeSlot, and reason are all required." });
  }

  if (reason.trim().length < 5) {
    return res.status(400).json({ error: "Please describe the reason for your visit (at least 5 characters)." });
  }

  const validSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00"];
  if (!validSlots.includes(timeSlot)) {
    return res.status(400).json({ error: "Invalid time slot. Choose from: " + validSlots.join(", ") });
  }

  try {
    // ── Check 1: Does this doctor exist? ──────
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found." });
    }

    // ── Check 2: Is the date today or in the future? ──
    // We compare just the date part (no time), at midnight
    const chosenDate = new Date(date);
    chosenDate.setHours(0, 0, 0, 0); // strip time → midnight

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (chosenDate < today) {
      return res.status(400).json({ error: "The appointment date must be today or a future date." });
    }

    // ── Check 3: Does the doctor work on this day? ────
    const dayName = getDayName(date);
    if (!doctor.availableDays.includes(dayName)) {
      return res.status(400).json({
        error: `Dr. ${doctor.name} does not work on ${dayName}. They are available on: ${doctor.availableDays.join(", ")}.`
      });
    }

    // ── Check 4: Is this slot already taken? ─────────
    // Look for another appointment with the same doctor, date, and time slot
    // that hasn't been cancelled (cancelled slots free up again)
    const alreadyBooked = await Appointment.findOne({
      doctorId,
      date: chosenDate,
      timeSlot,
      status: { $ne: "cancelled" } // $ne means "not equal to"
    });

    if (alreadyBooked) {
      return res.status(400).json({
        error: `The ${timeSlot} slot with Dr. ${doctor.name} on this date is already taken. Please choose a different time.`
      });
    }

    // ── All checks passed — create the appointment ────
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      date: chosenDate,
      timeSlot,
      reason,
      status: "scheduled"
    });

    // "populate" replaces the doctorId (just an ID) with the full doctor object
    await appointment.populate("doctorId", "name specialization");

    res.status(201).json({
      message: "Appointment booked successfully!",
      appointment
    });

  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid doctor ID format." });
    }
    // error code 11000 = duplicate key — the database index caught a double booking
    if (error.code === 11000) {
      return res.status(400).json({ error: "This slot is already taken. Please choose another time." });
    }
    console.error("Book appointment error:", error.message);
    res.status(500).json({ error: "Could not book appointment." });
  }
});


// ─────────────────────────────────────────────
// GET /api/appointments  —  My appointments
// ─────────────────────────────────────────────
// Optional filter: ?status=scheduled
// ─────────────────────────────────────────────
router.get("/", protect, async (req, res) => {

  const patientId = req.user._id;

  try {
    // Start with: find all appointments belonging to this patient
    const filter = { patientId };

    // If a status filter was passed in the URL, add it
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const appointments = await Appointment
      .find(filter)
      .populate("doctorId", "name specialization email") // join the doctor details
      .sort({ date: 1 }); // 1 = ascending, so upcoming appointments come first

    res.status(200).json({
      count: appointments.length,
      appointments
    });

  } catch (error) {
    console.error("Get appointments error:", error.message);
    res.status(500).json({ error: "Could not load appointments." });
  }
});


// ─────────────────────────────────────────────
// DELETE /api/appointments/:id  —  Cancel
// ─────────────────────────────────────────────
// We don't actually delete the record.
// We change the status to "cancelled" so there's
// a history of what happened.
// ─────────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {

  const patientId = req.user._id;

  try {
    // Find the appointment — it must belong to THIS patient
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patientId // this is ownership check — patients can't cancel others' appointments
    });

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found or it does not belong to you." });
    }

    // Can only cancel a "scheduled" appointment
    if (appointment.status !== "scheduled") {
      return res.status(400).json({
        error: `This appointment is already "${appointment.status}" and cannot be cancelled.`
      });
    }

    // Update the status
    appointment.status = "cancelled";
    await appointment.save();

    res.status(200).json({
      message: "Appointment cancelled.",
      appointment
    });

  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid appointment ID." });
    }
    console.error("Cancel appointment error:", error.message);
    res.status(500).json({ error: "Could not cancel appointment." });
  }
});


module.exports = router;
