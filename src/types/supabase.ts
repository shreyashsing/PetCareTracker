// Type definitions for Supabase client
import { SupabaseClient } from '@supabase/supabase-js';

export type { SupabaseClient };

// This is a placeholder for the database schema types
// Ideally, these would be generated from your Supabase schema
export type Schema = {
  public: {
    Tables: Record<string, any>;
    Views: Record<string, any>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
  };
}; 