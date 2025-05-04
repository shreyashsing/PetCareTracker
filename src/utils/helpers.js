"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUUID = generateUUID;
exports.formatDate = formatDate;
exports.calculateAge = calculateAge;
exports.truncateText = truncateText;
exports.convertWeight = convertWeight;
exports.getInitials = getInitials;
/**
 * Generates a UUID v4 (random) string
 * @returns UUID string
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
/**
 * Format a date to a readable string
 * @param date Date to format
 * @param includeTime Whether to include the time
 * @returns Formatted date string
 */
function formatDate(date, includeTime) {
    if (includeTime === void 0) { includeTime = false; }
    if (!date)
        return '';
    var options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return new Date(date).toLocaleDateString('en-US', options);
}
/**
 * Calculate age from birth date
 * @param birthDate Birth date
 * @returns Age as a string (e.g., "2y 3m")
 */
function calculateAge(birthDate) {
    if (!birthDate)
        return '';
    var now = new Date();
    var birth = new Date(birthDate);
    var years = now.getFullYear() - birth.getFullYear();
    var months = now.getMonth() - birth.getMonth();
    // Adjust years and months if birth month hasn't occurred yet this year
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
        years--;
        months += 12;
    }
    // Handle edge case for current month but day hasn't occurred yet
    if (months === 0 && now.getDate() < birth.getDate()) {
        months = 11;
        years--;
    }
    // Format the result
    var result = '';
    if (years > 0) {
        result += "".concat(years, "y");
        if (months > 0) {
            result += " ".concat(months, "m");
        }
    }
    else {
        if (months > 0) {
            result += "".concat(months, "m");
        }
        else {
            // Calculate days for very young pets
            var days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
            result += "".concat(days, "d");
        }
    }
    return result;
}
/**
 * Truncate text to a specified length
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text with ellipsis if needed
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength)
        return text || '';
    return "".concat(text.substring(0, maxLength), "...");
}
/**
 * Convert a weight from one unit to another
 * @param weight Weight value
 * @param fromUnit Original unit ('kg' or 'lb')
 * @param toUnit Target unit ('kg' or 'lb')
 * @returns Converted weight
 */
function convertWeight(weight, fromUnit, toUnit) {
    if (fromUnit === toUnit)
        return weight;
    if (fromUnit === 'kg' && toUnit === 'lb') {
        return weight * 2.20462;
    }
    else {
        return weight / 2.20462;
    }
}
/**
 * Get the initials from a name
 * @param name Full name
 * @returns Initials (e.g., "JD" from "John Doe")
 */
function getInitials(name) {
    if (!name)
        return '';
    return name
        .split(' ')
        .map(function (part) { return part.charAt(0); })
        .join('')
        .toUpperCase();
}
