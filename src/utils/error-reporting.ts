// Error reporting interface
export interface ErrorReportingType {
  reportError: (error: any, context?: string) => void;
  captureException: (error: any) => void;
  captureMessage: (message: string) => void;
  addBreadcrumb: (breadcrumb: {
    category?: string;
    message: string;
    data?: any;
  }) => void;
}

// Stub implementation of error reporting hooks
export const useErrorReporting = (): ErrorReportingType => {
  return {
    reportError: (error: any, context?: string) => {
      console.error(`[${context || 'Error'}]`, error);
    },
    captureException: (error: any) => {
      console.error('[Exception]', error);
    },
    captureMessage: (message: string) => {
      console.warn('[Message]', message);
    },
    addBreadcrumb: (breadcrumb: any) => {
      console.info('[Breadcrumb]', breadcrumb);
    }
  };
}; 