"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAppStore = void 0;
var zustand_1 = require("zustand");
// Create store
var useAppStore = (0, zustand_1.default)(function (set) { return ({
    isLoading: false,
    setIsLoading: function (loading) { return set({ isLoading: loading }); },
    errorMessage: null,
    setErrorMessage: function (message) { return set({ errorMessage: message }); },
}); });
exports.useAppStore = useAppStore;
