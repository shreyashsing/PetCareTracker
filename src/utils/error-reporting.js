"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useErrorReporting = void 0;
// Stub implementation of error reporting hooks
var useErrorReporting = function () {
    return {
        reportError: function (error, context) {
            console.error("[".concat(context || 'Error', "]"), error);
        },
        captureException: function (error) {
            console.error('[Exception]', error);
        },
        captureMessage: function (message) {
            console.warn('[Message]', message);
        },
        addBreadcrumb: function (breadcrumb) {
            console.info('[Breadcrumb]', breadcrumb);
        }
    };
};
exports.useErrorReporting = useErrorReporting;
