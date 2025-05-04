"use strict";
/**
 * Utility functions for date handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateForDisplay = exports.parseSupabaseDate = exports.formatDateForSupabase = void 0;
exports.calculateAge = calculateAge;
exports.formatYYYYMMDD = formatYYYYMMDD;
exports.formatHHMM = formatHHMM;
/**
 * Format a date for Supabase (ISO 8601 with timezone)
 * @param date The date to format
 * @returns ISO 8601 formatted date string with timezone
 */
var formatDateForSupabase = function (date) {
    if (!date)
        return '';
    if (!(date instanceof Date)) {
        try {
            date = new Date(date);
        }
        catch (e) {
            console.error('Invalid date provided to formatDateForSupabase:', date, e);
            return '';
        }
    }
    return date.toISOString();
};
exports.formatDateForSupabase = formatDateForSupabase;
/**
 * Parse a date string from Supabase to a Date object
 * @param dateString ISO 8601 date string
 * @returns Date object
 */
var parseSupabaseDate = function (dateString) {
    if (!dateString)
        return null;
    try {
        return new Date(dateString);
    }
    catch (e) {
        console.error('Error parsing date:', dateString, e);
        return null;
    }
};
exports.parseSupabaseDate = parseSupabaseDate;
/**
 * Format a date for display in the UI
 * @param date Date to format
 * @param includeTime Whether to include time
 * @returns Formatted date string
 */
var formatDateForDisplay = function (date, includeTime) {
    if (includeTime === void 0) { includeTime = false; }
    if (!date)
        return 'N/A';
    try {
        var dateObj = typeof date === 'string' ? new Date(date) : date;
        var options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return dateObj.toLocaleDateString(undefined, options);
    }
    catch (e) {
        console.error('Error formatting date for display:', date, e);
        return 'Invalid date';
    }
};
exports.formatDateForDisplay = formatDateForDisplay;
/**
 * Calculate age from birth date
 * Returns age in years, or months if less than 1 year
 */
function calculateAge(birthDate) {
    if (!birthDate)
        return 'Unknown';
    try {
        var birthDateObj = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
        if (isNaN(birthDateObj.getTime())) {
            return 'Invalid date';
        }
        var now = new Date();
        var diffTime = Math.abs(now.getTime() - birthDateObj.getTime());
        var diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
        if (diffYears < 1) {
            var diffMonths = Math.floor(diffYears * 12);
            return "".concat(diffMonths, " ").concat(diffMonths === 1 ? 'month' : 'months');
        }
        else {
            var years = Math.floor(diffYears);
            return "".concat(years, " ").concat(years === 1 ? 'year' : 'years');
        }
    }
    catch (error) {
        console.error('Error calculating age:', error);
        return 'Unknown';
    }
}
/**
 * Convert date object to YYYY-MM-DD format
 *
 * @param date JavaScript Date object
 * @returns Date in YYYY-MM-DD format
 */
function formatYYYYMMDD(date) {
    if (!date)
        return '';
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return "".concat(year, "-").concat(month, "-").concat(day);
}
/**
 * Convert time object to HH:MM format
 *
 * @param date JavaScript Date object
 * @returns Time in HH:MM format
 */
function formatHHMM(date) {
    if (!date)
        return '';
    var hours = String(date.getHours()).padStart(2, '0');
    var minutes = String(date.getMinutes()).padStart(2, '0');
    return "".concat(hours, ":").concat(minutes);
}
