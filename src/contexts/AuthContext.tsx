/**
 * Compatibility layer for legacy code that imports from contexts/AuthContext
 * Re-exports from providers/AuthProvider to maintain backward compatibility
 */

import { useAuth, AuthProvider, AuthContextType } from '../providers/AuthProvider';
import { User } from '@supabase/supabase-js';

// Re-export for backward compatibility
export { useAuth, AuthProvider };
export type { AuthContextType };

// Create a compatible interface for old code
export interface AppUser extends User {
  displayName?: string;
  name?: string;
  isNewUser?: boolean;
  preferences?: Record<string, any>;
} 