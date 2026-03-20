// =====================================================
// js/reception.js
// Powers the reception dashboard (reception.html)
// =====================================================
//
// WHAT THIS FILE DOES:
//   1. Auth guard — admin only, redirect others
//   2. Tab switching (Doctors tab / Appointments tab)
//   3. Add a new doctor (POST /api/doctors)
//   4. Load and display all doctors in a table
//   5. Delete a doctor (DELETE /api/doctors/:id)
//   6. Load and display all appointments (GET /api/admin/appointments)
//   7. Filter appointments by status
//   8. Update appointment status (PATCH /api/admin/appointments/:id)
//   9. Logout
// =====================================================




// ── Step 1: Auth guard ────────────────────────────────────
const token = localStorage.getItem("token");
const user  = JSON.parse(localStorage.getItem("user") || "null");

// If not logged in at all, go to login
if (!token || !user) {
  window.location.href = "login.html";
}

// If logged in but NOT an admin, go to the patient dashboard
if (user && user.role !== "admin") {
  alert("This page is for admin/reception staff only.");
  window.location.href = "dashboard.html";
}


// ── Helper: authenticated fetch ──────────────────────────
async function authFetch(path, options) {
  options = options || {};

  const response = await fetch(API + path, {
    method:  options.method  || "GET",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": "Bearer " + token
    },
    body: options.body || undefined
  });

  return response;
}


// ── Helper: format date ───────────────────────────────────
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    year:    "numeric",
    month:   "short",
    day:     "numeric"
  });
}

// ── Helper: status badge ──────────────────────────────────
function makeBadge(status) {
  return '<span class="badge badge-' + status + '">' + status + '</span>';
}

// ── Helper: truncate long text ────────────────────────────
function truncate(text, max) {
  if (!text) return "—";
  return text.length > max ? text.slice(0, max) + "…" : text;
}


// ── Step 2: Tab switching ─────────────────────────────────
//
// When a tab button is clicked:
//   - Add "active" class to the clicked button
//   - Remove "active" from all others
//   - Show the matching panel, hide others
//
// data-tab on the button matches the id="tab-{name}" on the panel

document.querySelectorAll(".tab-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {

    // Update buttons
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");

    // Show/hide panels
    const targetId = "tab-" + btn.dataset.tab;
    document.querySelectorAll(".tab-panel").forEach(function (panel) {
      if (panel.id === targetId) {
        panel.classList.remove("hidden");
        // Load data when switching to the appointments tab
        if (btn.dataset.tab === "appointments") {
          loadAppointments();
        }
      } else {
        panel.classList.add("hidden");
      }
    });

  });
});


// ── Step 3: Add a new doctor ─────────────────────────────
const addDoctorForm = document.getElementById("addDoctorForm");

addDoctorForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  // Read values
  const name           = document.getElementById("docName").value.trim();
  const specialization = document.getElementById("docSpecialization").value;
  const email          = document.getElementById("docEmail").value.trim();

  // Read which day checkboxes are ticked
  // querySelectorAll gets all checkboxes in #daysCheckboxes
  // We filter to those that are checked, then map to their value ("Monday" etc.)
  const checkedBoxes   = document.querySelectorAll("#daysCheckboxes input[type='checkbox']:checked");
  const availableDays  = Array.from(checkedBoxes).map(function (cb) { return cb.value; });

  // Clear previous errors
  document.getElementById("docNameError").textContent  = "";
  document.getElementById("docSpecError").textContent  = "";
  document.getElementById("docEmailError").textContent = "";
  document.getElementById("docDaysError").textContent  = "";
  document.getElementById("docName").classList.remove("is-error");
  document.getElementById("docSpecialization").classList.remove("is-error");
  document.getElementById("docEmail").classList.remove("is-error");

  // Validate
  let valid = true;

  if (name.length < 2) {
    document.getElementById("docNameError").textContent = "Name must be at least 2 characters.";
    document.getElementById("docName").classList.add("is-error");
    valid = false;
  }
  if (!specialization) {
    document.getElementById("docSpecError").textContent = "Please choose a specialization.";
    document.getElementById("docSpecialization").classList.add("is-error");
    valid = false;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    document.getElementById("docEmailError").textContent = "Please enter a valid email.";
    document.getElementById("docEmail").classList.add("is-error");
    valid = false;
  }
  if (availableDays.length === 0) {
    document.getElementById("docDaysError").textContent = "Tick at least one available day.";
    valid = false;
  }

  if (!valid) return;

  const btn = document.getElementById("addDoctorBtn");
  btn.disabled    = true;
  btn.textContent = "Adding…";

  // Hide previous message
  const msgEl = document.getElementById("addDoctorMessage");
  msgEl.className = "form-message hidden";

  try {
    const response = await authFetch("/doctors", {
      method: "POST",
      body:   JSON.stringify({ name, specialization, availableDays, email })
    });

    const data = await response.json();

    if (response.ok) {
      msgEl.textContent = "Doctor added successfully!";
      msgEl.className   = "form-message success";
      addDoctorForm.reset(); // clear the form
      // Untick all day checkboxes
      document.querySelectorAll("#daysCheckboxes input[type='checkbox']").forEach(function (cb) {
        cb.checked = false;
      });
      loadDoctors(); // refresh the table
    } else {
      msgEl.textContent = data.error || "Could not add doctor.";
      msgEl.className   = "form-message error";
    }

  } catch (err) {
    msgEl.textContent = "Cannot reach the server.";
    msgEl.className   = "form-message error";
  } finally {
    btn.disabled    = false;
    btn.textContent = "Add Doctor";
  }
});


// ── Step 4: Load all doctors ──────────────────────────────
async function loadDoctors() {
  const tbody = document.getElementById("doctorTableBody");
  tbody.innerHTML = '<tr><td colspan="5" class="table-loading">Loading…</td></tr>';

  try {
    const response = await authFetch("/doctors");
    const data     = await response.json();

    if (!response.ok) throw new Error(data.error);

    if (data.doctors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No doctors yet. Add one above.</td></tr>';
      return;
    }

    tbody.innerHTML = data.doctors.map(function (doc) {
      return (
        "<tr>" +
          "<td><strong>" + doc.name + "</strong></td>" +
          "<td>" + doc.specialization + "</td>" +
          "<td>" + doc.availableDays.join(", ") + "</td>" +
          "<td>" + doc.email + "</td>" +
          "<td>" +
            '<button class="btn btn-danger" onclick="deleteDoctor(\'' + doc._id + '\', \'' + doc.name + '\', this)">' +
              "Delete" +
            "</button>" +
          "</td>" +
        "</tr>"
      );
    }).join("");

  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-loading">Could not load doctors.</td></tr>';
  }
}


// ── Step 5: Delete a doctor ───────────────────────────────
window.deleteDoctor = async function (id, name, btnEl) {
  const confirmed = window.confirm("Delete " + name + "? This cannot be undone.");
  if (!confirmed) return;

  btnEl.disabled    = true;
  btnEl.textContent = "…";

  try {
    const response = await authFetch("/doctors/" + id, { method: "DELETE" });
    const data     = await response.json();

    if (response.ok) {
      if (data.warning) alert("Warning: " + data.warning);
      loadDoctors();
    } else {
      alert(data.error || "Could not delete doctor.");
      btnEl.disabled    = false;
      btnEl.textContent = "Delete";
    }

  } catch (err) {
    alert("Cannot reach the server.");
    btnEl.disabled    = false;
    btnEl.textContent = "Delete";
  }
};


// ── Step 6 + 7: Load appointments with optional filter ───
async function loadAppointments() {
  const tbody  = document.getElementById("apptTableBody");
  const status = document.getElementById("statusFilter").value;

  tbody.innerHTML = '<tr><td colspan="8" class="table-loading">Loading…</td></tr>';

  // Build query string: "" or "?status=scheduled"
  const query = status ? "?status=" + status : "";

  try {
    const response = await authFetch("/admin/appointments" + query);
    const data     = await response.json();

    if (!response.ok) throw new Error(data.error);

    if (data.appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No appointments found.</td></tr>';
      return;
    }

    tbody.innerHTML = data.appointments.map(function (a) {
      // Build a <select> for updating the status inline
      const statuses = ["scheduled", "completed", "cancelled", "no-show"];
      const options  = statuses.map(function (s) {
        return '<option value="' + s + '"' + (a.status === s ? " selected" : "") + ">" + s + "</option>";
      }).join("");

      return (
        "<tr>" +
          "<td>" +
            "<strong>" + (a.patientId ? a.patientId.name : "—") + "</strong>" +
            '<br><span class="text-muted text-small">' + (a.patientId ? a.patientId.phone : "") + "</span>" +
          "</td>" +
          "<td>" + (a.doctorId ? a.doctorId.name : "—") + "</td>" +
          "<td>" + (a.doctorId ? a.doctorId.specialization : "—") + "</td>" +
          "<td>" + formatDate(a.date) + "</td>" +
          "<td>" + a.timeSlot + "</td>" +
          "<td>" + truncate(a.reason, 35) + "</td>" +
          "<td>" + makeBadge(a.status) + "</td>" +
          "<td>" +
            // The onchange calls updateStatus() when a new option is chosen
            '<select class="status-select" onchange="updateStatus(\'' + a._id + '\', this)">' +
              options +
            "</select>" +
          "</td>" +
        "</tr>"
      );
    }).join("");

  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-loading">Could not load appointments.</td></tr>';
  }
}


// ── Step 8: Update appointment status ────────────────────
//
// Called from the <select> dropdown in the appointments table.
// id      — the appointment's MongoDB _id
// selectEl — the <select> element that changed
//
window.updateStatus = async function (id, selectEl) {
  const newStatus = selectEl.value;

  // Disable the dropdown while we wait for the server
  selectEl.disabled = true;

  try {
    const response = await authFetch("/admin/appointments/" + id, {
      method: "PATCH",
      body:   JSON.stringify({ status: newStatus })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Could not update status.");
      loadAppointments(); // reload to reset the dropdown
    }
    // On success we don't need to do anything — the dropdown already shows the new value

  } catch (err) {
    alert("Cannot reach the server.");
    loadAppointments();
  } finally {
    selectEl.disabled = false;
  }
};


// ── Filter dropdown: reload when changed ─────────────────
document.getElementById("statusFilter").addEventListener("change", loadAppointments);


// ── Welcome message ───────────────────────────────────────
if (user) {
  document.getElementById("welcomeMsg").textContent = user.name;
}


// ── Logout ────────────────────────────────────────────────
document.getElementById("logoutBtn").addEventListener("click", function () {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
});


// ── Run on page load ──────────────────────────────────────
loadDoctors();
