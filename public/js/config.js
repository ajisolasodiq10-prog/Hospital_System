// =====================================================
// js/config.js  —  Shared frontend configuration
// =====================================================
//
// Instead of hardcoding "http://localhost:5000/api"
// in every JS file, we define it ONCE here and every
// other JS file just uses the API variable.
//
// HOW THE URL IS BUILT:
//   window.location.origin gives us the current domain + port.
//   Examples:
//     In development:  "http://localhost:5000"
//     In production:   "https://yourhospital.com"
//
//   We add "/api" to get the base API URL.
//   This means the code works in any environment
//   without changing a single line.
// =====================================================

const API = window.location.origin + "/api";
