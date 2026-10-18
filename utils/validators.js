// Shared validation rules for the auth endpoints.
// Keep these in sync with trello/src/lib/validation.js

// name@domain.tld - no leading/trailing/double dots in the name, a real
// domain with at least one dot, and a 2+ letter extension
const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)[A-Za-z0-9._%+-]{1,64}(?<!\.)@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

// Letters (any language), spaces, dots, apostrophes and hyphens
const NAME_REGEX = /^\p{L}[\p{L}\p{M} .'-]*$/u;

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;

// Each function returns an error message, or null when the value is fine

const validateEmail = (email) => {
  if (!email) return "Email is required";
  if (email.length > 254) return "Email is too long";
  if (!EMAIL_REGEX.test(email)) {
    return "Enter a valid email address (e.g. name@example.com)";
  }
  return null;
};

const validateName = (name) => {
  if (!name) return "Full name is required";
  if (name.length < 3) return "Name must be at least 3 characters";
  if (name.length > 50) return "Name must be 50 characters or fewer";
  if (!NAME_REGEX.test(name)) {
    return "Name can only contain letters, spaces, . ' and -";
  }
  return null;
};

const validatePassword = (password) => {
  if (!password) return "Password is required";
  if (password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters`;
  }
  if (password.length > PASSWORD_MAX) {
    return `Password must be ${PASSWORD_MAX} characters or fewer`;
  }
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
  if (!/\d/.test(password)) return "Password must include a number";
  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "Password must include a special character (e.g. @, #, $, !)";
  }
  if (!/^\S+$/.test(password)) return "Password cannot contain spaces";
  return null;
};

module.exports = { validateEmail, validateName, validatePassword };
