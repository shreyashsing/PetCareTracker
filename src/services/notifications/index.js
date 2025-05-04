"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
var Notifications = require("expo-notifications");
var Device = require("expo-device");
var db_1 = require("../db");
var async_storage_1 = require("@react-native-async-storage/async-storage");
// Constants
var NOTIFICATION_PERMISSION_KEY = 'notification_permission_granted';
var SCHEDULED_NOTIFICATIONS_KEY = 'scheduled_notifications';
var SCHEDULED_MEDICATION_NOTIFICATIONS_KEY = 'scheduled_medication_notifications';
var SCHEDULED_MEAL_NOTIFICATIONS_KEY = 'scheduled_meal_notifications';
var INVENTORY_ALERT_NOTIFICATIONS_KEY = 'inventory_alert_notifications';
// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                })];
        });
    }); },
});
/**
 * Notification Service class to handle scheduling and canceling notifications
 */
var NotificationService = /** @class */ (function () {
    function NotificationService() {
        this.initialized = false;
    }
    // Singleton pattern
    NotificationService.getInstance = function () {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    };
    /**
     * Initialize notifications
     */
    NotificationService.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var existingStatus, finalStatus, status_1, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.initialized)
                            return [2 /*return*/, true];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        // Check if running on a physical device (notifications don't work in simulator)
                        if (!Device.isDevice) {
                            console.warn('Notifications only work on physical devices, not in the simulator');
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, Notifications.getPermissionsAsync()];
                    case 2:
                        existingStatus = (_a.sent()).status;
                        finalStatus = existingStatus;
                        if (!(existingStatus !== 'granted')) return [3 /*break*/, 4];
                        return [4 /*yield*/, Notifications.requestPermissionsAsync()];
                    case 3:
                        status_1 = (_a.sent()).status;
                        finalStatus = status_1;
                        _a.label = 4;
                    case 4: 
                    // Save permission status
                    return [4 /*yield*/, async_storage_1.default.setItem(NOTIFICATION_PERMISSION_KEY, finalStatus)];
                    case 5:
                        // Save permission status
                        _a.sent();
                        // Set up notification listeners
                        this.setupNotificationListeners();
                        // Initialize success
                        this.initialized = finalStatus === 'granted';
                        return [2 /*return*/, this.initialized];
                    case 6:
                        error_1 = _a.sent();
                        console.error('Error initializing notifications:', error_1);
                        return [2 /*return*/, false];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set up notification received and response listeners
     */
    NotificationService.prototype.setupNotificationListeners = function () {
        var _this = this;
        // When a notification is received while the app is in the foreground
        Notifications.addNotificationReceivedListener(function (notification) {
            console.log('Notification received in foreground:', notification);
        });
        // When user taps on a notification (app in background or closed)
        Notifications.addNotificationResponseReceivedListener(function (response) {
            var data = response.notification.request.content.data;
            // Handle notification tap based on data
            _this.handleNotificationTap(data);
        });
    };
    /**
     * Handle when a user taps on a notification
     * @param data Data from the notification
     */
    NotificationService.prototype.handleNotificationTap = function (data) {
        // Handle navigation or other actions based on notification data
        // This would typically be used to navigate to the appropriate screen
        console.log('Notification tapped with data:', data);
        // The actual implementation would depend on how navigation is set up
        // Example: navigate to task detail or pet profile screen
    };
    /**
     * Schedule notifications for a task
     * @param task The task to schedule notifications for
     */
    NotificationService.prototype.scheduleTaskNotifications = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var taskDate, taskTime, scheduledDateTime, pet, petName, baseContent, scheduledNotifications, _i, _a, minutesBefore, triggerDate, timeText, days, hours, content, notificationId, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 8, , 9]);
                        // Check if notifications are enabled for this task
                        if (!task.reminderSettings.enabled) {
                            return [2 /*return*/];
                        }
                        // Cancel any existing notifications for this task
                        return [4 /*yield*/, this.cancelTaskNotifications(task.id)];
                    case 1:
                        // Cancel any existing notifications for this task
                        _b.sent();
                        taskDate = new Date(task.scheduleInfo.date);
                        taskTime = new Date(task.scheduleInfo.time);
                        scheduledDateTime = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate(), taskTime.getHours(), taskTime.getMinutes(), 0, 0);
                        return [4 /*yield*/, db_1.databaseManager.pets.getById(task.petId)];
                    case 2:
                        pet = _b.sent();
                        petName = pet ? pet.name : 'your pet';
                        baseContent = {
                            title: task.title,
                            body: "Reminder for ".concat(petName, ": ").concat(task.description || task.title),
                            data: {
                                taskId: task.id,
                                petId: task.petId,
                                category: task.category,
                                type: 'task_reminder'
                            },
                        };
                        scheduledNotifications = [];
                        _i = 0, _a = task.reminderSettings.times;
                        _b.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        minutesBefore = _a[_i];
                        triggerDate = new Date(scheduledDateTime.getTime());
                        triggerDate.setMinutes(triggerDate.getMinutes() - minutesBefore);
                        if (!(triggerDate > new Date())) return [3 /*break*/, 5];
                        timeText = '';
                        if (minutesBefore >= 1440) { // Days
                            days = Math.floor(minutesBefore / 1440);
                            timeText = "".concat(days, " day").concat(days > 1 ? 's' : '', " before");
                        }
                        else if (minutesBefore >= 60) { // Hours
                            hours = Math.floor(minutesBefore / 60);
                            timeText = "".concat(hours, " hour").concat(hours > 1 ? 's' : '', " before");
                        }
                        else { // Minutes
                            timeText = "".concat(minutesBefore, " minute").concat(minutesBefore > 1 ? 's' : '', " before");
                        }
                        content = __assign(__assign({}, baseContent), { body: "".concat(timeText, ": ").concat(baseContent.body) });
                        return [4 /*yield*/, this.scheduleNotification(content, triggerDate)];
                    case 4:
                        notificationId = _b.sent();
                        // Store scheduled notification info
                        scheduledNotifications.push({
                            id: notificationId,
                            taskId: task.id,
                            petId: task.petId,
                            title: content.title,
                            body: content.body,
                            data: content.data,
                            triggerTime: triggerDate.getTime()
                        });
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: 
                    // Save the scheduled notifications
                    return [4 /*yield*/, this.saveScheduledNotifications(scheduledNotifications)];
                    case 7:
                        // Save the scheduled notifications
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        error_2 = _b.sent();
                        console.error('Error scheduling task notifications:', error_2);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Schedule a notification
     * @param content Notification content
     * @param triggerDate When the notification should trigger
     * @returns ID of the scheduled notification
     */
    NotificationService.prototype.scheduleNotification = function (content, triggerDate) {
        return __awaiter(this, void 0, void 0, function () {
            var identifier;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Notifications.scheduleNotificationAsync({
                            content: content,
                            trigger: triggerDate,
                        })];
                    case 1:
                        identifier = _a.sent();
                        return [2 /*return*/, identifier];
                }
            });
        });
    };
    /**
     * Store scheduled notifications in AsyncStorage
     * @param notifications Array of scheduled notifications
     */
    NotificationService.prototype.saveScheduledNotifications = function (notifications) {
        return __awaiter(this, void 0, void 0, function () {
            var existingJson, existing, taskIds_1, filtered, updated, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, async_storage_1.default.getItem(SCHEDULED_NOTIFICATIONS_KEY)];
                    case 1:
                        existingJson = _a.sent();
                        existing = existingJson
                            ? JSON.parse(existingJson)
                            : [];
                        taskIds_1 = new Set(notifications.map(function (n) { return n.taskId; }));
                        filtered = existing.filter(function (n) { return !taskIds_1.has(n.taskId); });
                        updated = __spreadArray(__spreadArray([], filtered, true), notifications, true);
                        // Save back to AsyncStorage
                        return [4 /*yield*/, async_storage_1.default.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(updated))];
                    case 2:
                        // Save back to AsyncStorage
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        console.error('Error saving scheduled notifications:', error_3);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Cancel notifications for a task
     * @param taskId ID of the task or 'all' to cancel all notifications
     */
    NotificationService.prototype.cancelTaskNotifications = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var existingJson, notifications, taskNotifications, _i, taskNotifications_1, notification, updated, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 10, , 11]);
                        if (!(taskId === 'all')) return [3 /*break*/, 3];
                        return [4 /*yield*/, Notifications.cancelAllScheduledNotificationsAsync()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, async_storage_1.default.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify([]))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                    case 3: return [4 /*yield*/, async_storage_1.default.getItem(SCHEDULED_NOTIFICATIONS_KEY)];
                    case 4:
                        existingJson = _a.sent();
                        if (!existingJson)
                            return [2 /*return*/];
                        notifications = JSON.parse(existingJson);
                        taskNotifications = notifications.filter(function (n) { return n.taskId === taskId; });
                        _i = 0, taskNotifications_1 = taskNotifications;
                        _a.label = 5;
                    case 5:
                        if (!(_i < taskNotifications_1.length)) return [3 /*break*/, 8];
                        notification = taskNotifications_1[_i];
                        return [4 /*yield*/, Notifications.cancelScheduledNotificationAsync(notification.id)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 5];
                    case 8:
                        updated = notifications.filter(function (n) { return n.taskId !== taskId; });
                        return [4 /*yield*/, async_storage_1.default.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(updated))];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 11];
                    case 10:
                        error_4 = _a.sent();
                        console.error('Error canceling task notifications:', error_4);
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Schedule notifications for a medication
     * @param medication The medication to schedule notifications for
     */
    NotificationService.prototype.scheduleMedicationNotifications = function (medication) {
        return __awaiter(this, void 0, void 0, function () {
            var pet, petName, startDate, endDate, frequencyTimes, frequencyPeriod, dosesPerDay, scheduledNotifications, now, maxScheduleDate, schedulingEndDate, schedulingStartDate, baseContent, currentDate, _i, _a, timeString, _b, hours, minutes, notificationDate, reminderDate, content, notificationId, doseContent, doseNotificationId, times, _c, times_1, _d, hours, minutes, notificationDate, reminderDate, timeString, content, notificationId, doseContent, doseNotificationId, error_5;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 19, , 20]);
                        // Check if notifications are enabled for this medication
                        if (!medication.reminderSettings.enabled) {
                            return [2 /*return*/];
                        }
                        // Cancel any existing notifications for this medication
                        return [4 /*yield*/, this.cancelMedicationNotifications(medication.id)];
                    case 1:
                        // Cancel any existing notifications for this medication
                        _e.sent();
                        return [4 /*yield*/, db_1.databaseManager.pets.getById(medication.petId)];
                    case 2:
                        pet = _e.sent();
                        petName = pet ? pet.name : 'your pet';
                        startDate = new Date(medication.duration.startDate);
                        endDate = medication.duration.indefinite ? null : medication.duration.endDate ? new Date(medication.duration.endDate) : null;
                        frequencyTimes = medication.frequency.times;
                        frequencyPeriod = medication.frequency.period;
                        dosesPerDay = this.calculateDosesPerDay(frequencyTimes, frequencyPeriod);
                        scheduledNotifications = [];
                        now = new Date();
                        maxScheduleDate = new Date();
                        maxScheduleDate.setDate(now.getDate() + 30); // Schedule up to 30 days in advance
                        schedulingEndDate = endDate && endDate < maxScheduleDate ? endDate : maxScheduleDate;
                        // Only schedule if the start date is in the past or future
                        if (startDate > schedulingEndDate) {
                            return [2 /*return*/]; // No need to schedule notifications yet
                        }
                        schedulingStartDate = startDate > now ? startDate : now;
                        baseContent = {
                            title: "Time for ".concat(medication.name),
                            body: "".concat(petName, " needs ").concat(medication.dosage.amount, " ").concat(medication.dosage.unit, " of ").concat(medication.name),
                            data: {
                                medicationId: medication.id,
                                petId: medication.petId,
                                type: 'medication_reminder'
                            },
                        };
                        currentDate = new Date(schedulingStartDate);
                        _e.label = 3;
                    case 3:
                        if (!(currentDate <= schedulingEndDate)) return [3 /*break*/, 17];
                        // Skip days based on frequency period
                        if (frequencyPeriod === 'week' && !this.shouldScheduleForWeeklyMedication(currentDate, startDate, frequencyTimes)) {
                            return [3 /*break*/, 16];
                        }
                        if (frequencyPeriod === 'month' && !this.shouldScheduleForMonthlyMedication(currentDate, startDate, frequencyTimes)) {
                            return [3 /*break*/, 16];
                        }
                        if (!(medication.frequency.specificTimes && medication.frequency.specificTimes.length > 0)) return [3 /*break*/, 10];
                        _i = 0, _a = medication.frequency.specificTimes;
                        _e.label = 4;
                    case 4:
                        if (!(_i < _a.length)) return [3 /*break*/, 9];
                        timeString = _a[_i];
                        _b = timeString.split(':').map(Number), hours = _b[0], minutes = _b[1];
                        notificationDate = new Date(currentDate);
                        notificationDate.setHours(hours, minutes, 0, 0);
                        if (!(notificationDate > now)) return [3 /*break*/, 8];
                        reminderDate = new Date(notificationDate);
                        reminderDate.setMinutes(reminderDate.getMinutes() - medication.reminderSettings.reminderTime);
                        if (!(reminderDate > now)) return [3 /*break*/, 6];
                        content = __assign(__assign({}, baseContent), { body: "Reminder: ".concat(baseContent.body, " at ").concat(timeString) });
                        return [4 /*yield*/, this.scheduleNotification(content, reminderDate)];
                    case 5:
                        notificationId = _e.sent();
                        scheduledNotifications.push({
                            id: notificationId,
                            medicationId: medication.id,
                            petId: medication.petId,
                            title: content.title,
                            body: content.body,
                            data: content.data,
                            triggerTime: reminderDate.getTime()
                        });
                        _e.label = 6;
                    case 6:
                        doseContent = __assign(__assign({}, baseContent), { body: "It's time for ".concat(petName, " to take ").concat(medication.dosage.amount, " ").concat(medication.dosage.unit, " of ").concat(medication.name) });
                        return [4 /*yield*/, this.scheduleNotification(doseContent, notificationDate)];
                    case 7:
                        doseNotificationId = _e.sent();
                        scheduledNotifications.push({
                            id: doseNotificationId,
                            medicationId: medication.id,
                            petId: medication.petId,
                            title: doseContent.title,
                            body: doseContent.body,
                            data: doseContent.data,
                            triggerTime: notificationDate.getTime()
                        });
                        _e.label = 8;
                    case 8:
                        _i++;
                        return [3 /*break*/, 4];
                    case 9: return [3 /*break*/, 16];
                    case 10:
                        times = this.generateEvenlyDistributedTimes(dosesPerDay);
                        _c = 0, times_1 = times;
                        _e.label = 11;
                    case 11:
                        if (!(_c < times_1.length)) return [3 /*break*/, 16];
                        _d = times_1[_c], hours = _d.hours, minutes = _d.minutes;
                        notificationDate = new Date(currentDate);
                        notificationDate.setHours(hours, minutes, 0, 0);
                        if (!(notificationDate > now)) return [3 /*break*/, 15];
                        reminderDate = new Date(notificationDate);
                        reminderDate.setMinutes(reminderDate.getMinutes() - medication.reminderSettings.reminderTime);
                        if (!(reminderDate > now)) return [3 /*break*/, 13];
                        timeString = "".concat(hours.toString().padStart(2, '0'), ":").concat(minutes.toString().padStart(2, '0'));
                        content = __assign(__assign({}, baseContent), { body: "Reminder: ".concat(baseContent.body, " at ").concat(timeString) });
                        return [4 /*yield*/, this.scheduleNotification(content, reminderDate)];
                    case 12:
                        notificationId = _e.sent();
                        scheduledNotifications.push({
                            id: notificationId,
                            medicationId: medication.id,
                            petId: medication.petId,
                            title: content.title,
                            body: content.body,
                            data: content.data,
                            triggerTime: reminderDate.getTime()
                        });
                        _e.label = 13;
                    case 13:
                        doseContent = __assign(__assign({}, baseContent), { body: "It's time for ".concat(petName, " to take ").concat(medication.dosage.amount, " ").concat(medication.dosage.unit, " of ").concat(medication.name) });
                        return [4 /*yield*/, this.scheduleNotification(doseContent, notificationDate)];
                    case 14:
                        doseNotificationId = _e.sent();
                        scheduledNotifications.push({
                            id: doseNotificationId,
                            medicationId: medication.id,
                            petId: medication.petId,
                            title: doseContent.title,
                            body: doseContent.body,
                            data: doseContent.data,
                            triggerTime: notificationDate.getTime()
                        });
                        _e.label = 15;
                    case 15:
                        _c++;
                        return [3 /*break*/, 11];
                    case 16:
                        currentDate.setDate(currentDate.getDate() + 1);
                        return [3 /*break*/, 3];
                    case 17: 
                    // Save scheduled notifications
                    return [4 /*yield*/, this.saveScheduledMedicationNotifications(scheduledNotifications)];
                    case 18:
                        // Save scheduled notifications
                        _e.sent();
                        return [3 /*break*/, 20];
                    case 19:
                        error_5 = _e.sent();
                        console.error('Error scheduling medication notifications:', error_5);
                        return [3 /*break*/, 20];
                    case 20: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Calculate how many doses to give per day based on frequency
     */
    NotificationService.prototype.calculateDosesPerDay = function (times, period) {
        switch (period) {
            case 'day':
                return times;
            case 'week':
                return times / 7; // Weekly doses divided by days in a week
            case 'month':
                return times / 30; // Monthly doses divided by approx days in a month
            default:
                return 1;
        }
    };
    /**
     * Determine if a weekly medication should be scheduled on a specific date
     */
    NotificationService.prototype.shouldScheduleForWeeklyMedication = function (currentDate, startDate, frequencyTimes) {
        // For weekly medications, calculate the day of the week to schedule
        var daysFromStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        var weeksFromStart = Math.floor(daysFromStart / 7);
        // If frequency is less than once per week, determine if this week is a medication week
        if (frequencyTimes < 1) {
            var weeksPerDose = Math.round(1 / frequencyTimes);
            return weeksFromStart % weeksPerDose === 0;
        }
        // If frequency is once per week or more, always schedule on the same day(s) of the week
        return currentDate.getDay() === startDate.getDay();
    };
    /**
     * Determine if a monthly medication should be scheduled on a specific date
     */
    NotificationService.prototype.shouldScheduleForMonthlyMedication = function (currentDate, startDate, frequencyTimes) {
        // For monthly medications, schedule on the same day of the month
        return currentDate.getDate() === startDate.getDate();
    };
    /**
     * Generate evenly distributed times throughout the day for multiple doses
     */
    NotificationService.prototype.generateEvenlyDistributedTimes = function (dosesPerDay) {
        // Round up the doses per day to an integer
        var numDoses = Math.ceil(dosesPerDay);
        // If less than one dose per day, default to morning dose
        if (numDoses <= 0) {
            return [{ hours: 9, minutes: 0 }];
        }
        var times = [];
        var wakeHour = 8; // 8:00 AM
        var sleepHour = 22; // 10:00 PM
        var availableHours = sleepHour - wakeHour;
        // Calculate interval between doses
        var interval = availableHours / numDoses;
        // Generate the times
        for (var i = 0; i < numDoses; i++) {
            var hour = wakeHour + Math.floor(interval * i);
            var minute = Math.round((interval * i - Math.floor(interval * i)) * 60);
            times.push({ hours: hour, minutes: minute });
        }
        return times;
    };
    /**
     * Save scheduled medication notifications to AsyncStorage
     */
    NotificationService.prototype.saveScheduledMedicationNotifications = function (notifications) {
        return __awaiter(this, void 0, void 0, function () {
            var existingJson, existing, medicationIds_1, filtered, updated, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, async_storage_1.default.getItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY)];
                    case 1:
                        existingJson = _a.sent();
                        existing = existingJson
                            ? JSON.parse(existingJson)
                            : [];
                        medicationIds_1 = new Set(notifications.map(function (n) { return n.medicationId; }));
                        filtered = existing.filter(function (n) { return !medicationIds_1.has(n.medicationId); });
                        updated = __spreadArray(__spreadArray([], filtered, true), notifications, true);
                        // Save back to AsyncStorage
                        return [4 /*yield*/, async_storage_1.default.setItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY, JSON.stringify(updated))];
                    case 2:
                        // Save back to AsyncStorage
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_6 = _a.sent();
                        console.error('Error saving scheduled medication notifications:', error_6);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Cancel notifications for a medication
     * @param medicationId ID of the medication or 'all' to cancel all medication notifications
     */
    NotificationService.prototype.cancelMedicationNotifications = function (medicationId) {
        return __awaiter(this, void 0, void 0, function () {
            var existingJson, notifications, _i, notifications_1, notification, medicationNotifications, _a, medicationNotifications_1, notification, updated, error_7;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 13, , 14]);
                        return [4 /*yield*/, async_storage_1.default.getItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY)];
                    case 1:
                        existingJson = _b.sent();
                        if (!existingJson)
                            return [2 /*return*/];
                        notifications = JSON.parse(existingJson);
                        if (!(medicationId === 'all')) return [3 /*break*/, 7];
                        _i = 0, notifications_1 = notifications;
                        _b.label = 2;
                    case 2:
                        if (!(_i < notifications_1.length)) return [3 /*break*/, 5];
                        notification = notifications_1[_i];
                        return [4 /*yield*/, Notifications.cancelScheduledNotificationAsync(notification.id)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: 
                    // Clear storage
                    return [4 /*yield*/, async_storage_1.default.setItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY, JSON.stringify([]))];
                    case 6:
                        // Clear storage
                        _b.sent();
                        return [2 /*return*/];
                    case 7:
                        medicationNotifications = notifications.filter(function (n) { return n.medicationId === medicationId; });
                        _a = 0, medicationNotifications_1 = medicationNotifications;
                        _b.label = 8;
                    case 8:
                        if (!(_a < medicationNotifications_1.length)) return [3 /*break*/, 11];
                        notification = medicationNotifications_1[_a];
                        return [4 /*yield*/, Notifications.cancelScheduledNotificationAsync(notification.id)];
                    case 9:
                        _b.sent();
                        _b.label = 10;
                    case 10:
                        _a++;
                        return [3 /*break*/, 8];
                    case 11:
                        updated = notifications.filter(function (n) { return n.medicationId !== medicationId; });
                        return [4 /*yield*/, async_storage_1.default.setItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY, JSON.stringify(updated))];
                    case 12:
                        _b.sent();
                        return [3 /*break*/, 14];
                    case 13:
                        error_7 = _b.sent();
                        console.error('Error canceling medication notifications:', error_7);
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Schedule meal notifications for a pet's feeding schedule
     * @param meal The meal to schedule notifications for
     */
    NotificationService.prototype.scheduleMealNotifications = function (meal) {
        return __awaiter(this, void 0, void 0, function () {
            var pet, petName, mealDate, mealTime, scheduledDateTime, mealTypeFormatted, baseContent, scheduledNotifications, reminderDate, content, notificationId, mealContent, mealNotificationId, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        // Check if notifications are enabled for this meal
                        if (!meal.reminderSettings.enabled) {
                            return [2 /*return*/];
                        }
                        // Cancel any existing notifications for this meal
                        return [4 /*yield*/, this.cancelMealNotifications(meal.id)];
                    case 1:
                        // Cancel any existing notifications for this meal
                        _a.sent();
                        return [4 /*yield*/, db_1.databaseManager.pets.getById(meal.petId)];
                    case 2:
                        pet = _a.sent();
                        petName = pet ? pet.name : 'your pet';
                        mealDate = new Date(meal.date);
                        mealTime = new Date(meal.time);
                        scheduledDateTime = new Date(mealDate.getFullYear(), mealDate.getMonth(), mealDate.getDate(), mealTime.getHours(), mealTime.getMinutes(), 0, 0);
                        mealTypeFormatted = meal.type.charAt(0).toUpperCase() + meal.type.slice(1);
                        baseContent = {
                            title: "Time for ".concat(petName, "'s ").concat(mealTypeFormatted),
                            body: "".concat(petName, " needs to be fed ").concat(meal.amount || '', " ").concat(meal.specialInstructions ? "(".concat(meal.specialInstructions, ")") : ''),
                            data: {
                                mealId: meal.id,
                                petId: meal.petId,
                                type: 'meal_reminder'
                            },
                        };
                        scheduledNotifications = [];
                        if (!(scheduledDateTime > new Date())) return [3 /*break*/, 6];
                        reminderDate = new Date(scheduledDateTime);
                        reminderDate.setMinutes(reminderDate.getMinutes() - meal.reminderSettings.reminderTime);
                        if (!(reminderDate > new Date())) return [3 /*break*/, 4];
                        content = __assign(__assign({}, baseContent), { body: "In ".concat(meal.reminderSettings.reminderTime, " minutes: ").concat(baseContent.body) });
                        return [4 /*yield*/, this.scheduleNotification(content, reminderDate)];
                    case 3:
                        notificationId = _a.sent();
                        scheduledNotifications.push({
                            id: notificationId,
                            mealId: meal.id,
                            petId: meal.petId,
                            title: content.title,
                            body: content.body,
                            data: content.data,
                            triggerTime: reminderDate.getTime()
                        });
                        _a.label = 4;
                    case 4:
                        mealContent = __assign(__assign({}, baseContent), { body: "It's time for ".concat(petName, "'s ").concat(mealTypeFormatted.toLowerCase(), "! ").concat(meal.specialInstructions ? "(".concat(meal.specialInstructions, ")") : '') });
                        return [4 /*yield*/, this.scheduleNotification(mealContent, scheduledDateTime)];
                    case 5:
                        mealNotificationId = _a.sent();
                        scheduledNotifications.push({
                            id: mealNotificationId,
                            mealId: meal.id,
                            petId: meal.petId,
                            title: mealContent.title,
                            body: mealContent.body,
                            data: mealContent.data,
                            triggerTime: scheduledDateTime.getTime()
                        });
                        _a.label = 6;
                    case 6: 
                    // Save scheduled notifications
                    return [4 /*yield*/, this.saveScheduledMealNotifications(scheduledNotifications)];
                    case 7:
                        // Save scheduled notifications
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        error_8 = _a.sent();
                        console.error('Error scheduling meal notifications:', error_8);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Save scheduled meal notifications to AsyncStorage
     */
    NotificationService.prototype.saveScheduledMealNotifications = function (notifications) {
        return __awaiter(this, void 0, void 0, function () {
            var existingJson, existing, mealIds_1, filtered, updated, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, async_storage_1.default.getItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY)];
                    case 1:
                        existingJson = _a.sent();
                        existing = existingJson
                            ? JSON.parse(existingJson)
                            : [];
                        mealIds_1 = new Set(notifications.map(function (n) { return n.mealId; }));
                        filtered = existing.filter(function (n) { return !mealIds_1.has(n.mealId); });
                        updated = __spreadArray(__spreadArray([], filtered, true), notifications, true);
                        // Save back to AsyncStorage
                        return [4 /*yield*/, async_storage_1.default.setItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY, JSON.stringify(updated))];
                    case 2:
                        // Save back to AsyncStorage
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_9 = _a.sent();
                        console.error('Error saving scheduled meal notifications:', error_9);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Cancel notifications for a meal
     * @param mealId ID of the meal or 'all' to cancel all meal notifications
     */
    NotificationService.prototype.cancelMealNotifications = function (mealId) {
        return __awaiter(this, void 0, void 0, function () {
            var existingJson, notifications, _i, notifications_2, notification, mealNotifications, _a, mealNotifications_1, notification, updated, error_10;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 13, , 14]);
                        return [4 /*yield*/, async_storage_1.default.getItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY)];
                    case 1:
                        existingJson = _b.sent();
                        if (!existingJson)
                            return [2 /*return*/];
                        notifications = JSON.parse(existingJson);
                        if (!(mealId === 'all')) return [3 /*break*/, 7];
                        _i = 0, notifications_2 = notifications;
                        _b.label = 2;
                    case 2:
                        if (!(_i < notifications_2.length)) return [3 /*break*/, 5];
                        notification = notifications_2[_i];
                        return [4 /*yield*/, Notifications.cancelScheduledNotificationAsync(notification.id)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: 
                    // Clear storage
                    return [4 /*yield*/, async_storage_1.default.setItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY, JSON.stringify([]))];
                    case 6:
                        // Clear storage
                        _b.sent();
                        return [2 /*return*/];
                    case 7:
                        mealNotifications = notifications.filter(function (n) { return n.mealId === mealId; });
                        _a = 0, mealNotifications_1 = mealNotifications;
                        _b.label = 8;
                    case 8:
                        if (!(_a < mealNotifications_1.length)) return [3 /*break*/, 11];
                        notification = mealNotifications_1[_a];
                        return [4 /*yield*/, Notifications.cancelScheduledNotificationAsync(notification.id)];
                    case 9:
                        _b.sent();
                        _b.label = 10;
                    case 10:
                        _a++;
                        return [3 /*break*/, 8];
                    case 11:
                        updated = notifications.filter(function (n) { return n.mealId !== mealId; });
                        return [4 /*yield*/, async_storage_1.default.setItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY, JSON.stringify(updated))];
                    case 12:
                        _b.sent();
                        return [3 /*break*/, 14];
                    case 13:
                        error_10 = _b.sent();
                        console.error('Error canceling meal notifications:', error_10);
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Schedule an inventory alert notification for a low stock item
     * @param foodItem The food item with low stock
     */
    NotificationService.prototype.scheduleInventoryAlert = function (foodItem) {
        return __awaiter(this, void 0, void 0, function () {
            var pet, petName, daysRemaining, content, notificationId, notification, tomorrowDate, urgentContent, urgentNotificationId, notification, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        // Only schedule if the inventory is below threshold
                        if (foodItem.inventory.currentAmount > foodItem.inventory.lowStockThreshold) {
                            return [2 /*return*/];
                        }
                        // Cancel any existing notifications for this food item
                        return [4 /*yield*/, this.cancelInventoryAlert(foodItem.id)];
                    case 1:
                        // Cancel any existing notifications for this food item
                        _a.sent();
                        return [4 /*yield*/, db_1.databaseManager.pets.getById(foodItem.petId)];
                    case 2:
                        pet = _a.sent();
                        petName = pet ? pet.name : 'your pet';
                        daysRemaining = foodItem.inventory.daysRemaining;
                        content = {
                            title: "Low Food Stock Alert",
                            body: "".concat(foodItem.name, " for ").concat(petName, " is running low! Only ").concat(daysRemaining, " day").concat(daysRemaining !== 1 ? 's' : '', " of food remaining."),
                            data: {
                                foodItemId: foodItem.id,
                                petId: foodItem.petId,
                                type: 'inventory_alert'
                            },
                        };
                        return [4 /*yield*/, this.sendImmediateNotification(content.title, content.body, content.data)];
                    case 3:
                        notificationId = _a.sent();
                        if (!notificationId) return [3 /*break*/, 5];
                        notification = {
                            id: notificationId,
                            foodItemId: foodItem.id,
                            petId: foodItem.petId,
                            title: content.title,
                            body: content.body,
                            data: content.data,
                            triggerTime: new Date().getTime()
                        };
                        return [4 /*yield*/, this.saveInventoryAlertNotification(notification)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        if (!(daysRemaining <= 2)) return [3 /*break*/, 8];
                        tomorrowDate = new Date();
                        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                        tomorrowDate.setHours(9, 0, 0, 0); // 9 AM tomorrow
                        urgentContent = {
                            title: "URGENT: Food Supply Critical",
                            body: "".concat(foodItem.name, " for ").concat(petName, " is almost gone! Only ").concat(daysRemaining, " day").concat(daysRemaining !== 1 ? 's' : '', " remaining. Please restock soon!"),
                            data: {
                                foodItemId: foodItem.id,
                                petId: foodItem.petId,
                                type: 'inventory_urgent_alert'
                            },
                        };
                        return [4 /*yield*/, this.scheduleNotification(urgentContent, tomorrowDate)];
                    case 6:
                        urgentNotificationId = _a.sent();
                        if (!urgentNotificationId) return [3 /*break*/, 8];
                        notification = {
                            id: urgentNotificationId,
                            foodItemId: foodItem.id,
                            petId: foodItem.petId,
                            title: urgentContent.title,
                            body: urgentContent.body,
                            data: urgentContent.data,
                            triggerTime: tomorrowDate.getTime()
                        };
                        return [4 /*yield*/, this.saveInventoryAlertNotification(notification)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_11 = _a.sent();
                        console.error('Error scheduling inventory alert:', error_11);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Save inventory alert notification to AsyncStorage
     */
    NotificationService.prototype.saveInventoryAlertNotification = function (notification) {
        return __awaiter(this, void 0, void 0, function () {
            var existingJson, existing, updated, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, async_storage_1.default.getItem(INVENTORY_ALERT_NOTIFICATIONS_KEY)];
                    case 1:
                        existingJson = _a.sent();
                        existing = existingJson
                            ? JSON.parse(existingJson)
                            : [];
                        updated = __spreadArray(__spreadArray([], existing, true), [notification], false);
                        // Save back to AsyncStorage
                        return [4 /*yield*/, async_storage_1.default.setItem(INVENTORY_ALERT_NOTIFICATIONS_KEY, JSON.stringify(updated))];
                    case 2:
                        // Save back to AsyncStorage
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_12 = _a.sent();
                        console.error('Error saving inventory alert notification:', error_12);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Cancel inventory alert for a food item
     * @param foodItemId ID of the food item or 'all' to cancel all inventory alerts
     */
    NotificationService.prototype.cancelInventoryAlert = function (foodItemId) {
        return __awaiter(this, void 0, void 0, function () {
            var existingJson, notifications, _i, notifications_3, notification, itemNotifications, _a, itemNotifications_1, notification, updated, error_13;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 13, , 14]);
                        return [4 /*yield*/, async_storage_1.default.getItem(INVENTORY_ALERT_NOTIFICATIONS_KEY)];
                    case 1:
                        existingJson = _b.sent();
                        if (!existingJson)
                            return [2 /*return*/];
                        notifications = JSON.parse(existingJson);
                        if (!(foodItemId === 'all')) return [3 /*break*/, 7];
                        _i = 0, notifications_3 = notifications;
                        _b.label = 2;
                    case 2:
                        if (!(_i < notifications_3.length)) return [3 /*break*/, 5];
                        notification = notifications_3[_i];
                        return [4 /*yield*/, Notifications.cancelScheduledNotificationAsync(notification.id)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: 
                    // Clear storage
                    return [4 /*yield*/, async_storage_1.default.setItem(INVENTORY_ALERT_NOTIFICATIONS_KEY, JSON.stringify([]))];
                    case 6:
                        // Clear storage
                        _b.sent();
                        return [2 /*return*/];
                    case 7:
                        itemNotifications = notifications.filter(function (n) { return n.foodItemId === foodItemId; });
                        _a = 0, itemNotifications_1 = itemNotifications;
                        _b.label = 8;
                    case 8:
                        if (!(_a < itemNotifications_1.length)) return [3 /*break*/, 11];
                        notification = itemNotifications_1[_a];
                        return [4 /*yield*/, Notifications.cancelScheduledNotificationAsync(notification.id)];
                    case 9:
                        _b.sent();
                        _b.label = 10;
                    case 10:
                        _a++;
                        return [3 /*break*/, 8];
                    case 11:
                        updated = notifications.filter(function (n) { return n.foodItemId !== foodItemId; });
                        return [4 /*yield*/, async_storage_1.default.setItem(INVENTORY_ALERT_NOTIFICATIONS_KEY, JSON.stringify(updated))];
                    case 12:
                        _b.sent();
                        return [3 /*break*/, 14];
                    case 13:
                        error_13 = _b.sent();
                        console.error('Error canceling inventory alert:', error_13);
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check all food inventory items and schedule alerts for low stock
     */
    NotificationService.prototype.checkAndScheduleInventoryAlerts = function () {
        return __awaiter(this, void 0, void 0, function () {
            var pets, _i, pets_1, pet, lowStockItems, _a, lowStockItems_1, item, error_14;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 9, , 10]);
                        return [4 /*yield*/, db_1.databaseManager.pets.getAll()];
                    case 1:
                        pets = _b.sent();
                        _i = 0, pets_1 = pets;
                        _b.label = 2;
                    case 2:
                        if (!(_i < pets_1.length)) return [3 /*break*/, 8];
                        pet = pets_1[_i];
                        return [4 /*yield*/, db_1.databaseManager.foodItems.getLowStock(pet.id)];
                    case 3:
                        lowStockItems = _b.sent();
                        _a = 0, lowStockItems_1 = lowStockItems;
                        _b.label = 4;
                    case 4:
                        if (!(_a < lowStockItems_1.length)) return [3 /*break*/, 7];
                        item = lowStockItems_1[_a];
                        return [4 /*yield*/, this.scheduleInventoryAlert(item)];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6:
                        _a++;
                        return [3 /*break*/, 4];
                    case 7:
                        _i++;
                        return [3 /*break*/, 2];
                    case 8:
                        console.log('Scheduled inventory alerts for low stock items');
                        return [3 /*break*/, 10];
                    case 9:
                        error_14 = _b.sent();
                        console.error('Error checking and scheduling inventory alerts:', error_14);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Schedule notifications for tasks and medications on app startup
     */
    NotificationService.prototype.rescheduleAllNotifications = function () {
        return __awaiter(this, void 0, void 0, function () {
            var tasks, _i, tasks_1, task, medications, _a, medications_1, medication, now_1, twoDaysLater_1, meals, _b, meals_1, meal, error_15;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 22, , 23]);
                        // Cancel all existing notifications first
                        return [4 /*yield*/, Notifications.cancelAllScheduledNotificationsAsync()];
                    case 1:
                        // Cancel all existing notifications first
                        _c.sent();
                        // Clear stored notification records
                        return [4 /*yield*/, async_storage_1.default.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify([]))];
                    case 2:
                        // Clear stored notification records
                        _c.sent();
                        return [4 /*yield*/, async_storage_1.default.setItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY, JSON.stringify([]))];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, async_storage_1.default.setItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY, JSON.stringify([]))];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, async_storage_1.default.setItem(INVENTORY_ALERT_NOTIFICATIONS_KEY, JSON.stringify([]))];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, db_1.databaseManager.tasks.find(function (task) { return task.status !== 'completed' && task.reminderSettings.enabled; })];
                    case 6:
                        tasks = _c.sent();
                        _i = 0, tasks_1 = tasks;
                        _c.label = 7;
                    case 7:
                        if (!(_i < tasks_1.length)) return [3 /*break*/, 10];
                        task = tasks_1[_i];
                        return [4 /*yield*/, this.scheduleTaskNotifications(task)];
                    case 8:
                        _c.sent();
                        _c.label = 9;
                    case 9:
                        _i++;
                        return [3 /*break*/, 7];
                    case 10:
                        console.log("Rescheduled notifications for ".concat(tasks.length, " tasks"));
                        return [4 /*yield*/, db_1.databaseManager.medications.find(function (medication) { return medication.status === 'active' && medication.reminderSettings.enabled; })];
                    case 11:
                        medications = _c.sent();
                        _a = 0, medications_1 = medications;
                        _c.label = 12;
                    case 12:
                        if (!(_a < medications_1.length)) return [3 /*break*/, 15];
                        medication = medications_1[_a];
                        return [4 /*yield*/, this.scheduleMedicationNotifications(medication)];
                    case 13:
                        _c.sent();
                        _c.label = 14;
                    case 14:
                        _a++;
                        return [3 /*break*/, 12];
                    case 15:
                        console.log("Rescheduled notifications for ".concat(medications.length, " medications"));
                        now_1 = new Date();
                        twoDaysLater_1 = new Date();
                        twoDaysLater_1.setDate(now_1.getDate() + 2);
                        return [4 /*yield*/, db_1.databaseManager.meals.find(function (meal) {
                                var _a;
                                // Check if the meal has a reminder enabled
                                if (!((_a = meal.reminderSettings) === null || _a === void 0 ? void 0 : _a.enabled))
                                    return false;
                                // Make sure the meal date is valid
                                var mealDate = new Date(meal.date);
                                if (isNaN(mealDate.getTime()))
                                    return false;
                                // Only include upcoming meals within the next 2 days
                                return mealDate >= now_1 && mealDate <= twoDaysLater_1 && !meal.completed;
                            })];
                    case 16:
                        meals = _c.sent();
                        _b = 0, meals_1 = meals;
                        _c.label = 17;
                    case 17:
                        if (!(_b < meals_1.length)) return [3 /*break*/, 20];
                        meal = meals_1[_b];
                        return [4 /*yield*/, this.scheduleMealNotifications(meal)];
                    case 18:
                        _c.sent();
                        _c.label = 19;
                    case 19:
                        _b++;
                        return [3 /*break*/, 17];
                    case 20:
                        console.log("Rescheduled notifications for ".concat(meals.length, " meals"));
                        // Check and schedule inventory alerts for low stock items
                        return [4 /*yield*/, this.checkAndScheduleInventoryAlerts()];
                    case 21:
                        // Check and schedule inventory alerts for low stock items
                        _c.sent();
                        return [3 /*break*/, 23];
                    case 22:
                        error_15 = _c.sent();
                        console.error('Error rescheduling notifications:', error_15);
                        return [3 /*break*/, 23];
                    case 23: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send an immediate notification
     * @param title Notification title
     * @param body Notification body
     * @param data Additional data to include
     */
    NotificationService.prototype.sendImmediateNotification = function (title_1, body_1) {
        return __awaiter(this, arguments, void 0, function (title, body, data) {
            var notificationId, error_16;
            if (data === void 0) { data = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Notifications.scheduleNotificationAsync({
                                content: {
                                    title: title,
                                    body: body,
                                    data: data
                                },
                                trigger: null // null trigger means send immediately
                            })];
                    case 1:
                        notificationId = _a.sent();
                        return [2 /*return*/, notificationId];
                    case 2:
                        error_16 = _a.sent();
                        console.error('Error sending immediate notification:', error_16);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if notification permissions are granted
     */
    NotificationService.prototype.hasPermission = function () {
        return __awaiter(this, void 0, void 0, function () {
            var status;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Notifications.getPermissionsAsync()];
                    case 1:
                        status = (_a.sent()).status;
                        return [2 /*return*/, status === 'granted'];
                }
            });
        });
    };
    /**
     * Request notification permissions
     */
    NotificationService.prototype.requestPermission = function () {
        return __awaiter(this, void 0, void 0, function () {
            var status;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Notifications.requestPermissionsAsync()];
                    case 1:
                        status = (_a.sent()).status;
                        return [4 /*yield*/, async_storage_1.default.setItem(NOTIFICATION_PERMISSION_KEY, status)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, status === 'granted'];
                }
            });
        });
    };
    return NotificationService;
}());
// Export singleton instance
exports.notificationService = NotificationService.getInstance();
