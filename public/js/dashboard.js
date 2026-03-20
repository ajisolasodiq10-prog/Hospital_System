// =====================================================
// js/dashboard.js
// Powers the patient dashboard (dashboard.html)
// =====================================================
//
// WHAT THIS FILE DOES:
//   1. Auth guard — send non-logged-in users to login
//   2. Fill in "Welcome, [name]" at the top
//   3. Load doctors into the dropdown
//   4. Book an appointment (POST /api/appointments)
//   5. Load the patient's appointments into two tables
//      - Upcoming: scheduled appointments from today onwards
//      - Past: completed, cancelled, or old appointments
//   6. Cancel an appointment (DELETE /api/appointments/:id)
//   7. Logout button
//
// KEY CONCEPT — Authorization header:
//   Protected API routes require us to prove who we are.
//   We do this by sending the JWT in a request header:
//     Authorization: Bearer eyJhbGci...
//   The backend reads this header and checks if the token is valid.
// =====================================================




// ── Step 1: Auth guard ────────────────────────────────────
//
// Every protected page should start with this.
// We check localStorage for the token and user info.
// If they're missing, the user isn't logged in — redirect them.

const token = localStorage.getItem("token");
const user  = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
  // Not logged in — send them to the login page
  window.location.href = "login.html";
}


// ── Helper: authenticated fetch ──────────────────────────
//
// All our API calls need the JWT in the Authorization header.
// This helper adds it automatically so we don't repeat ourselves.
//
// Usage: await authFetch("/doctors")
//        await authFetch("/appointments", { method: "POST", body: ... })

async function authFetch(path, options) {
  options = options || {};

  const response = await fetch(API + path, {
    method:  options.method  || "GET",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": "Bearer " + token   // <-- the JWT goes here
    },
    body: options.body || undefined
  });

  return response;
}


// ── Helper: format a date for display ────────────────────
// Turns "2025-06-16T00:00:00.000Z" into "Mon, Jun 16, 2025"
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    year:    "numeric",
    month:   "short",
    day:     "numeric"
  });
}


// ── Helper: is this appointment upcoming or past? ─────────
// We compare the appointment date to today (ignoring time).
function isUpcoming(dateString) {
  const appointmentDate = new Date(dateString);
  appointmentDate.setHours(0, 0, 0, 0); // strip time

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return appointmentDate >= today;
}


// ── Helper: build a coloured status badge ────────────────
function makeBadge(status) {
  return '<span class="badge badge-' + status + '">' + status + '</span>';
}


// ── Helper: show/hide the booking message ────────────────
function showBookingMessage(text, type) {
  const el = document.getElementById("bookingMessage");
  el.textContent = text;
  el.className   = "form-message " + type;
}

function hideBookingMessage() {
  document.getElementById("bookingMessage").className = "form-message hidden";
}


// ── Step 2: Fill in the welcome message ──────────────────
function initPage() {
  // Show "Welcome, Jane" using the first name
  const firstName = user.name.split(" ")[0];
  document.getElementById("welcomeMsg").textContent = "Welcome, " + firstName;

  // Set the minimum date on the date picker to today
  // so patients can't accidentally pick a past date
  const today = new Date().toISOString().split("T")[0]; // "2025-06-16"
  document.getElementById("dateInput").min = today;
}


// ── Step 3: Load doctors into the dropdown ───────────────
async function loadDoctors() {
  const select = document.getElementById("doctorSelect");

  try {
    const response = await authFetch("/doctors");
    const data     = await response.json();

    if (!response.ok) {
      select.innerHTML = '<option value="">Could not load doctors</option>';
      return;
    }

    // Clear the "Loading…" option and add a real placeholder
    select.innerHTML = '<option value="">— Choose a doctor —</option>';

    // Add one <option> per doctor
    data.doctors.forEach(function (doctor) {
      const option       = document.createElement("option");
      option.value       = doctor._id; // the MongoDB ID we'll send to the server
      option.textContent =
        doctor.name + " — " + doctor.specialization +
        " (available: " + doctor.availableDays.join(", ") + ")";
      select.appendChild(option);
    });

  } catch (err) {
    select.innerHTML = '<option value="">Error loading doctors</option>';
  }
}


// ── Step 4: Book an appointment ──────────────────────────
const bookingForm = document.getElementById("bookingForm");

bookingForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  hideBookingMessage();

  // Read form values
  const doctorId = document.getElementById("doctorSelect").value;
  const date     = document.getElementById("dateInput").value;
  const timeSlot = document.getElementById("timeSlot").value;
  const reason   = document.getElementById("reason").value.trim();

  // Clear previous field errors
  document.getElementById("doctorError").textContent = "";
  document.getElementById("dateError").textContent   = "";
  document.getElementById("slotError").textContent   = "";
  document.getElementById("reasonError").textContent = "";

  // Client-side validation
  let valid = true;

  if (!doctorId) {
    document.getElementById("doctorError").textContent = "Please choose a doctor.";
    valid = false;
  }
  if (!date) {
    document.getElementById("dateError").textContent = "Please pick a date.";
    valid = false;
  }
  if (!timeSlot) {
    document.getElementById("slotError").textContent = "Please choose a time slot.";
    valid = false;
  }
  if (reason.length < 5) {
    document.getElementById("reasonError").textContent = "Please describe your reason (at least 5 characters).";
    valid = false;
  }

  if (!valid) return;

  const bookBtn = document.getElementById("bookBtn");
  bookBtn.disabled    = true;
  bookBtn.textContent = "Booking…";

  try {
    const response = await authFetch("/appointments", {
      method: "POST",
      body: JSON.stringify({ doctorId, date, timeSlot, reason })
    });

    const data = await response.json();

    if (response.ok) {
      showBookingMessage("Appointment booked successfully!", "success");
      bookingForm.reset(); // clear the form fields
      loadAppointments();  // refresh the tables below
    } else {
      showBookingMessage(data.error || "Could not book appointment.", "error");
    }

  } catch (err) {
    showBookingMessage("Cannot reach the server.", "error");
  } finally {
    bookBtn.disabled    = false;
    bookBtn.textContent = "Book Appointment";
  }
});


// ── Step 5: Load and display appointments ────────────────
async function loadAppointments() {

  // Set both table bodies to "Loading…" while we wait
  document.getElementById("upcomingBody").innerHTML =
    '<tr><td colspan="7" class="table-loading">Loading…</td></tr>';
  document.getElementById("pastBody").innerHTML =
    '<tr><td colspan="6" class="table-loading">Loading…</td></tr>';

  try {
    const response = await authFetch("/appointments");
    const data     = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    const all = data.appointments || [];

    // Split into upcoming and past
    const upcoming = all.filter(function (a) {
      // Upcoming = scheduled status AND date is today or later
      return a.status === "scheduled" && isUpcoming(a.date);
    });

    const past = all.filter(function (a) {
      // Past = everything else
      return a.status !== "scheduled" || !isUpcoming(a.date);
    });

    renderUpcoming(upcoming);
    renderPast(past);

  } catch (err) {
    document.getElementById("upcomingBody").innerHTML =
      '<tr><td colspan="7" class="table-loading">Could not load appointments.</td></tr>';
    document.getElementById("pastBody").innerHTML =
      '<tr><td colspan="6" class="table-loading">Could not load appointments.</td></tr>';
  }
}


// Render the upcoming appointments table
function renderUpcoming(list) {
  const tbody = document.getElementById("upcomingBody");

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No upcoming appointments. Book one above!</td></tr>';
    return;
  }

  // Build one table row per appointment
  // appointment.doctorId is populated by the server so it's an object: { name, specialization }
  tbody.innerHTML = list.map(function (a) {
    return (
      "<tr>" +
        "<td><strong>" + (a.doctorId.name || "—") + "</strong></td>" +
        "<td>" + (a.doctorId.specialization || "—") + "</td>" +
        "<td>" + formatDate(a.date) + "</td>" +
        "<td>" + a.timeSlot + "</td>" +
        "<td>" + truncate(a.reason, 40) + "</td>" +
        "<td>" + makeBadge(a.status) + "</td>" +
        "<td>" +
          // The onclick calls cancelAppointment() defined below
          // We pass the appointment ID and a reference to this button
          '<button class="btn btn-danger" onclick="cancelAppointment(\'' + a._id + '\', this)">' +
            "Cancel" +
          "</button>" +
        "</td>" +
      "</tr>"
    );
  }).join("");
}


// Render the past appointments table (read-only — no Cancel button)
function renderPast(list) {
  const tbody = document.getElementById("pastBody");

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No past appointments yet.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(function (a) {
    return (
      "<tr>" +
        "<td><strong>" + (a.doctorId.name || "—") + "</strong></td>" +
        "<td>" + (a.doctorId.specialization || "—") + "</td>" +
        "<td>" + formatDate(a.date) + "</td>" +
        "<td>" + a.timeSlot + "</td>" +
        "<td>" + truncate(a.reason, 40) + "</td>" +
        "<td>" + makeBadge(a.status) + "</td>" +
      "</tr>"
    );
  }).join("");
}


// Truncate long text so it doesn't overflow the table
function truncate(text, maxLength) {
  if (!text) return "—";
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
}


// ── Step 6: Cancel an appointment ────────────────────────
//
// This function is called from the Cancel button in the table row.
// We make it global (window.cancelAppointment) so the onclick=""
// attribute in the HTML string above can find it.
//
// id     — the appointment's MongoDB _id
// btnEl  — the button element, so we can disable it while waiting
//
window.cancelAppointment = async function (id, btnEl) {

  // Ask for confirmation before cancelling
  const confirmed = window.confirm("Are you sure you want to cancel this appointment?");
  if (!confirmed) return;

  btnEl.disabled    = true;
  btnEl.textContent = "…";

  try {
    // DELETE /api/appointments/:id
    const response = await authFetch("/appointments/" + id, { method: "DELETE" });
    const data     = await response.json();

    if (response.ok) {
      loadAppointments(); // reload tables to show updated status
    } else {
      alert(data.error || "Could not cancel appointment.");
      btnEl.disabled    = false;
      btnEl.textContent = "Cancel";
    }

  } catch (err) {
    alert("Cannot reach the server.");
    btnEl.disabled    = false;
    btnEl.textContent = "Cancel";
  }
};


// ── Logout ────────────────────────────────────────────────
document.getElementById("logoutBtn").addEventListener("click", function () {
  // Remove everything from localStorage and send to login
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
});


// ── Run everything on page load ───────────────────────────
initPage();
loadDoctors();
loadAppointments();
