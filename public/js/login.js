// =====================================================
// js/login.js
// Handles the login form on login.html
// =====================================================
//
// WHAT THIS FILE DOES:
//   1. Send email + password to POST /api/login
//   2. If login works, save the JWT token to localStorage
//   3. Redirect admin → reception.html, patient → dashboard.html
//
// KEY CONCEPT — localStorage:
//   localStorage is a small storage area in the browser.
//   Data saved here stays even if you close and reopen the tab.
//   We use it to store the JWT so every page can use it.
//
//   localStorage.setItem("key", value)  — save
//   localStorage.getItem("key")         — read
//   localStorage.removeItem("key")      — delete
// =====================================================



const form          = document.getElementById("loginForm");
const emailInput    = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn     = document.getElementById("submitBtn");
const formMessage   = document.getElementById("formMessage");


function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className   = "form-message " + type;
}

function hideMessage() {
  formMessage.className = "form-message hidden";
}

function showFieldError(inputEl, errorId, message) {
  inputEl.classList.add("is-error");
  document.getElementById(errorId).textContent = message;
}

function clearFieldError(inputEl, errorId) {
  inputEl.classList.remove("is-error");
  document.getElementById(errorId).textContent = "";
}


form.addEventListener("submit", async function (e) {
  e.preventDefault();
  hideMessage();
  clearFieldError(emailInput,    "emailError");
  clearFieldError(passwordInput, "passwordError");

  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  // Basic check — don't send empty fields
  let valid = true;
  if (!email) {
    showFieldError(emailInput, "emailError", "Email is required.");
    valid = false;
  }
  if (!password) {
    showFieldError(passwordInput, "passwordError", "Password is required.");
    valid = false;
  }
  if (!valid) return;

  submitBtn.disabled    = true;
  submitBtn.textContent = "Signing in…";

  try {
    const response = await fetch(API + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // ── Save the token and user info to localStorage ──
      //
      // data.token is the JWT string, e.g. "eyJhbGci..."
      // We'll send this with every future API request.
      //
      // data.user is an object like { id, name, email, role }
      // We JSON.stringify() it to save it as a string,
      // and JSON.parse() it when we read it back.
      localStorage.setItem("token", data.token);
      localStorage.setItem("user",  JSON.stringify(data.user));

      showMessage("Login successful! Redirecting…", "success");

      setTimeout(function () {
        // Admins go to the reception dashboard
        // Regular patients go to their own dashboard
        if (data.user.role === "admin") {
          window.location.href = "reception.html";
        } else {
          window.location.href = "dashboard.html";
        }
      }, 900);

    } else {
      showMessage(data.error || "Login failed. Please check your email and password.", "error");
    }

  } catch (err) {
    showMessage("Cannot reach the server. Make sure it is running on port 5000.", "error");
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = "Sign In";
  }
});


emailInput.addEventListener("input",    function () { clearFieldError(emailInput,    "emailError"); });
passwordInput.addEventListener("input", function () { clearFieldError(passwordInput, "passwordError"); });
