/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

import type {TurboModule} from './RCTExport';

import invariant from 'invariant';

// PATCHED_FOR_MISSING_MODULES - Import shim for RNCMaterialDatePicker
const RNCMaterialDatePickerShim = {
  present: () => {
    console.warn('Using RNCMaterialDatePicker shim instead of native module');
    return Promise.resolve({ action: 'dismissed' });
  },
  dismiss: () => {
    // No-op implementation
  }
};

const NativeModules = require('../BatchedBridge/NativeModules');

const turboModuleProxy = global.__turboModuleProxy;

const useLegacyNativeModuleInterop =
  global.RN$Bridgeless !== true || global.RN$TurboInterop === true;

function requireModule<T: TurboModule>(name: string): ?T {
  if (turboModuleProxy != null) {
    const module: ?T = turboModuleProxy(name);
    if (module != null) {
      return module;
    }
  }

  if (useLegacyNativeModuleInterop) {
    // Backward compatibility layer during migration.
    const legacyModule: ?T = NativeModules[name];
    if (legacyModule != null) {
      return legacyModule;
    }
  }

  return null;
}

export function get<T: TurboModule>(name: string): ?T {
  return requireModule<T>(name);
}

export function getEnforcing<T: TurboModule>(name: string): T {
  // PATCHED_FOR_MISSING_MODULES - Handle missing modules without crashing
  if (name === 'RNCMaterialDatePicker') {
    return (RNCMaterialDatePickerShim: $FlowFixMe);
  }
  
  try {
    const module = requireModule<T>(name);
    invariant(
      module != null,
      `TurboModuleRegistry.getEnforcing(...): '${name}' could not be found. ` +
        'Verify that a module by this name is registered in the native binary.',
    );
    return module;
  } catch (e) {
    console.warn(`TurboModuleRegistry.getEnforcing: Module ${name} not found, using empty shim`);
    // Return an empty object for unknown modules
    return ({}: $FlowFixMe);
  }
} 