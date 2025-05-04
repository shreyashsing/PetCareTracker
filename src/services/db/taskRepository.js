"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRepository = void 0;
var constants_1 = require("./constants");
var repository_1 = require("./repository");
/**
 * Repository for managing Task entities
 */
var TaskRepository = /** @class */ (function (_super) {
    __extends(TaskRepository, _super);
    function TaskRepository() {
        return _super.call(this, constants_1.STORAGE_KEYS.TASKS) || this;
    }
    TaskRepository.prototype.petTasksKey = function (petId) {
        return constants_1.RELATED_KEYS.PET_TASKS(petId);
    };
    /**
     * Ensure scheduleInfo dates are proper Date objects
     * @param task The task to process
     * @returns Task with ensured Date objects
     */
    TaskRepository.prototype.ensureDates = function (task) {
        if (task.scheduleInfo) {
            // Convert scheduleInfo.date to a Date object if it's not already
            if (!(task.scheduleInfo.date instanceof Date)) {
                task.scheduleInfo.date = new Date(task.scheduleInfo.date);
            }
            // Convert scheduleInfo.time to a Date object if it's not already
            if (!(task.scheduleInfo.time instanceof Date)) {
                task.scheduleInfo.time = new Date(task.scheduleInfo.time);
            }
        }
        return task;
    };
    /**
     * Get all tasks for a specific pet
     * @param petId Pet ID
     * @returns Array of tasks for the pet
     */
    TaskRepository.prototype.getByPetId = function (petId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (task) { return task.petId === petId; })];
            });
        });
    };
    /**
     * Get tasks for a specific date
     * @param date Date to get tasks for
     * @returns Array of tasks for the date
     */
    TaskRepository.prototype.getByDate = function (date) {
        return __awaiter(this, void 0, void 0, function () {
            var targetDate, endDate;
            return __generator(this, function (_a) {
                targetDate = new Date(date);
                targetDate.setHours(0, 0, 0, 0);
                endDate = new Date(targetDate);
                endDate.setHours(23, 59, 59, 999);
                return [2 /*return*/, this.find(function (task) {
                        var taskDate = new Date(task.scheduleInfo.date);
                        taskDate.setHours(0, 0, 0, 0);
                        return taskDate.getTime() === targetDate.getTime();
                    })];
            });
        });
    };
    /**
     * Get tasks for a pet on a specific date
     * @param petId Pet ID
     * @param date Date to get tasks for
     * @returns Array of tasks for the pet on the date
     */
    TaskRepository.prototype.getByPetIdAndDate = function (petId, date) {
        return __awaiter(this, void 0, void 0, function () {
            var targetDate;
            return __generator(this, function (_a) {
                targetDate = new Date(date);
                targetDate.setHours(0, 0, 0, 0);
                return [2 /*return*/, this.find(function (task) {
                        var taskDate = new Date(task.scheduleInfo.date);
                        taskDate.setHours(0, 0, 0, 0);
                        return task.petId === petId && taskDate.getTime() === targetDate.getTime();
                    })];
            });
        });
    };
    /**
     * Get upcoming tasks for a pet
     * @param petId Pet ID
     * @param limit Maximum number of tasks to return
     * @returns Array of upcoming tasks for the pet
     */
    TaskRepository.prototype.getUpcomingByPetId = function (petId_1) {
        return __awaiter(this, arguments, void 0, function (petId, limit) {
            var now, tasks;
            if (limit === void 0) { limit = 5; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = new Date();
                        return [4 /*yield*/, this.find(function (task) {
                                // Check if the task is for the specified pet
                                if (task.petId !== petId)
                                    return false;
                                // Check if the task is pending or in-progress
                                if (task.status !== 'pending' && task.status !== 'in-progress')
                                    return false;
                                // Check if the task is in the future or current
                                var taskDate = new Date(task.scheduleInfo.date);
                                var taskDateTime = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate(), task.scheduleInfo.time.getHours(), task.scheduleInfo.time.getMinutes());
                                return taskDateTime >= now;
                            })];
                    case 1:
                        tasks = _a.sent();
                        // Sort by date and time
                        tasks.sort(function (a, b) {
                            var aDate = new Date(a.scheduleInfo.date);
                            var aTime = new Date(a.scheduleInfo.time);
                            var aDateTime = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate(), aTime.getHours(), aTime.getMinutes());
                            var bDate = new Date(b.scheduleInfo.date);
                            var bTime = new Date(b.scheduleInfo.time);
                            var bDateTime = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate(), bTime.getHours(), bTime.getMinutes());
                            return aDateTime.getTime() - bDateTime.getTime();
                        });
                        return [2 /*return*/, tasks.slice(0, limit)];
                }
            });
        });
    };
    /**
     * Get tasks by category
     * @param category Task category
     * @returns Array of tasks with the given category
     */
    TaskRepository.prototype.getByCategory = function (category) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (task) { return task.category === category; })];
            });
        });
    };
    /**
     * Get tasks by status
     * @param status Task status
     * @returns Array of tasks with the given status
     */
    TaskRepository.prototype.getByStatus = function (status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.find(function (task) { return task.status === status; })];
            });
        });
    };
    /**
     * Mark a task as completed
     * @param id Task ID
     * @param completedBy ID of the user who completed the task
     * @param notes Optional notes about the completion
     * @returns Updated task if found, null otherwise
     */
    TaskRepository.prototype.markAsCompleted = function (id, completedBy, notes) {
        return __awaiter(this, void 0, void 0, function () {
            var existingTask, taskWithDates, completionDetails, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getById(id)];
                    case 1:
                        existingTask = _a.sent();
                        if (!existingTask) {
                            return [2 /*return*/, null];
                        }
                        taskWithDates = this.ensureDates(existingTask);
                        completionDetails = {
                            completedAt: new Date(),
                            completedBy: completedBy,
                            notes: notes
                        };
                        // Call the parent class update method
                        return [2 /*return*/, _super.prototype.update.call(this, id, __assign(__assign({}, taskWithDates), { status: 'completed', completionDetails: completionDetails }))];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Error marking task as completed:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get overdue tasks
     * @returns Array of overdue tasks
     */
    TaskRepository.prototype.getOverdueTasks = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now;
            return __generator(this, function (_a) {
                now = new Date();
                return [2 /*return*/, this.find(function (task) {
                        // Only check pending tasks
                        if (task.status !== 'pending')
                            return false;
                        // Get the task date and time
                        var taskDate = new Date(task.scheduleInfo.date);
                        var taskTime = new Date(task.scheduleInfo.time);
                        var taskDateTime = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate(), taskTime.getHours(), taskTime.getMinutes());
                        return taskDateTime < now;
                    })];
            });
        });
    };
    /**
     * Update a task
     * @param id Task ID
     * @param update Updates to apply
     * @returns Updated task if found, null otherwise
     */
    TaskRepository.prototype.update = function (id, update) {
        return __awaiter(this, void 0, void 0, function () {
            var existingTask, mergedTask, taskWithDates, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getById(id)];
                    case 1:
                        existingTask = _a.sent();
                        if (!existingTask) {
                            return [2 /*return*/, null];
                        }
                        mergedTask = __assign(__assign({}, existingTask), update);
                        taskWithDates = this.ensureDates(mergedTask);
                        // Call the parent class update method
                        return [2 /*return*/, _super.prototype.update.call(this, id, taskWithDates)];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Error updating task:', error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update task status
     * @param id Task ID
     * @param status New task status
     * @returns Updated task if found, null otherwise
     */
    TaskRepository.prototype.updateStatus = function (id, status) {
        return __awaiter(this, void 0, void 0, function () {
            var existingTask, taskWithDates, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getById(id)];
                    case 1:
                        existingTask = _a.sent();
                        if (!existingTask) {
                            return [2 /*return*/, null];
                        }
                        taskWithDates = this.ensureDates(existingTask);
                        // Update the status
                        return [2 /*return*/, _super.prototype.update.call(this, id, __assign(__assign({}, taskWithDates), { status: status }))];
                    case 2:
                        error_3 = _a.sent();
                        console.error('Error updating task status:', error_3);
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return TaskRepository;
}(repository_1.BaseRepository));
exports.TaskRepository = TaskRepository;
