import { CodedError } from './CodedError';

/**
 * Error thrown when a native module method is invoked but the feature is not available
 * at the time or on the current platform.
 */
export class UnavailabilityError extends CodedError {
  constructor(moduleName: string, propertyName?: string) {
    super(
      'ERR_UNAVAILABLE',
      `The method or property ${
        propertyName ? moduleName + '.' + propertyName : moduleName
      } is not available on this device. This can occur when native modules are invoked on a background thread in development. Try updating your application to use the run-time compatibility check for features which are unavailable.`
    );
  }
}

export default UnavailabilityError; 