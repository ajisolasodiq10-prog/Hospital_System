// =====================================================
// js/registerPatient.js
// Handles the registration form on register.html
// =====================================================
//
// WHAT THIS FILE DOES, STEP BY STEP:
//   1. Wait for the user to click "Create Account"
//   2. Read the values they typed into the form
//   3. Check the values are valid (before hitting the server)
//   4. Send the data to the backend with fetch()
//   5. Show a success message and redirect, OR show an error
//
// KEY CONCEPT — fetch():
//   fetch() sends an HTTP request from the browser to the server.
//   It returns a Promise, so we use "await" to wait for the reply.
// =====================================================

// The base URL of our backend API.
// Change this if your backend runs on a different port.



// ── Get references to the HTML elements we'll interact with ──
// document.getElementById() finds an element by its id="..." attribute.

const form          = document.getElementById("registerForm");
const nameInput     = document.getElementById("name");
const emailInput    = document.getElementById("email");
const phoneInput    = document.getElementById("phone");
const passwordInput = document.getElementById("password");
const submitBtn     = document.getElementById("submitBtn");
const formMessage   = document.getElementById("formMessage");


// ── Helper: show a message box below the form ──
// type is either "success" or "error"
function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = "form-message " + type; // applies CSS colour
  // (removing the "hidden" class makes it visible)
}

function hideMessage() {
  formMessage.className = "form-message hidden";
}


// ── Helper: mark a field red and show its error text ──
function showFieldError(inputEl, errorId, message) {
  inputEl.classList.add("is-error");                        // red border
  document.getElementById(errorId).textContent = message;  // error text below
}

// ── Helper: clear a field's error state ──
function clearFieldError(inputEl, errorId) {
  inputEl.classList.remove("is-error");
  document.getElementById(errorId).textContent = "";
}

// ── Clear all field errors at once ──
function clearAllErrors() {
  clearFieldError(nameInput,     "nameError");
  clearFieldError(emailInput,    "emailError");
  clearFieldError(phoneInput,    "phoneError");
  clearFieldError(passwordInput, "passwordError");
  hideMessage();
}


// ── Validate the form values ──
// Returns true if everything is fine, false if something is wrong.
// We check here so we don't waste a server request on obvious mistakes.
function validateForm(name, email, phone, password) {

  let allValid = true; // we'll set this to false if any check fails

  if (name.trim().length < 2) {
    showFieldError(nameInput, "nameError", "Name must be at least 2 characters.");
    allValid = false;
  }

  // A simple email check: must have something @ something . something
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    showFieldError(emailInput, "emailError", "Please enter a valid email address.");
    allValid = false;
  }

  // Phone: digits only, 10 to 15 characters
  if (!/^\d{10,15}$/.test(phone)) {
    showFieldError(phoneInput, "phoneError", "Phone must be 10–15 digits (numbers only).");
    allValid = false;
  }

  if (password.length < 6) {
    showFieldError(passwordInput, "passwordError", "Password must be at least 6 characters.");
    allValid = false;
  }

  return allValid;
}


// ── Listen for the form submission ──
// "submit" fires when the user clicks the button OR presses Enter.
// e.preventDefault() stops the browser's default behaviour
// (which would reload the page — we don't want that).
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  // Step 1 — clear any previous errors
  clearAllErrors();

  // Step 2 — read the current values
  const name     = nameInput.value.trim();
  const email    = emailInput.value.trim();
  const phone    = phoneInput.value.trim();
  const password = passwordInput.value; // don't trim passwords!

  // Step 3 — run client-side validation
  const isValid = validateForm(name, email, phone, password);
  if (!isValid) return; // stop here if something is wrong

  // Step 4 — disable the button and show a loading state
  submitBtn.disabled     = true;
  submitBtn.textContent  = "Creating account…";

  try {
    // Step 5 — send the data to the server
    //
    // fetch(url, options) makes an HTTP request.
    //   method: "POST"              — we are sending data (not just reading)
    //   headers: Content-Type JSON  — tells the server to expect JSON
    //   body: JSON.stringify(...)   — converts our JS object to a JSON string
    //
    const response = await fetch(API + "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password })
    });

    // Step 6 — parse the JSON the server sent back
    const data = await response.json();

    // Step 7 — check if it worked
    // response.ok is true for 2xx status codes (200, 201, etc.)
    if (response.ok) {
      showMessage("Account created! Taking you to login…", "success");
      // Wait 1.5 seconds then redirect so the user can read the message
      setTimeout(function () {
        window.location.href = "login.html";
      }, 1500);
    } else {
      // The server returned an error — show it to the user
      showMessage(data.error || "Registration failed. Please try again.", "error");
    }

  } catch (err) {
    // This block runs if the server is unreachable (e.g. not started yet)
    showMessage("Cannot reach the server. Make sure it is running on port 5000.", "error");
  } finally {
    // "finally" always runs, whether it succeeded or failed
    submitBtn.disabled    = false;
    submitBtn.textContent = "Create Account";
  }
});


// ── Clear a field's error as soon as the user starts typing ──
// This gives instant feedback that they've fixed the problem.
nameInput.addEventListener("input",     function () { clearFieldError(nameInput,     "nameError"); });
emailInput.addEventListener("input",    function () { clearFieldError(emailInput,    "emailError"); });
phoneInput.addEventListener("input",    function () { clearFieldError(phoneInput,    "phoneError"); });
passwordInput.addEventListener("input", function () { clearFieldError(passwordInput, "passwordError"); });
