// Form validation utilities

// Validate email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate password strength
function isStrongPassword(password) {
    // At least 8 characters, 1 number, 1 special character
    const re = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return re.test(password);
}

// Validate phone number
function isValidPhone(phone) {
    const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return re.test(phone);
}

// Validate required field
function isRequired(value) {
    return value && value.trim().length > 0;
}

// Validate minimum length
function minLength(value, length) {
    return value && value.length >= length;
}

// Validate maximum length
function maxLength(value, length) {
    return value && value.length <= length;
}

// Validate date range
function isValidDateRange(startDate, endDate) {
    if (!startDate || !endDate) return true;
    return new Date(startDate) <= new Date(endDate);
}

// Validate future date
function isFutureDate(date) {
    return new Date(date) > new Date();
}

// Validate URL
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Export validators
window.isValidEmail = isValidEmail;
window.isStrongPassword = isStrongPassword;
window.isValidPhone = isValidPhone;
window.isRequired = isRequired;
window.minLength = minLength;
window.maxLength = maxLength;
window.isValidDateRange = isValidDateRange;
window.isFutureDate = isFutureDate;
window.isValidUrl = isValidUrl;
