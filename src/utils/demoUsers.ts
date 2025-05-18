import { User } from '../types/components';
import { hashPassword } from '../services/auth/passwordService';
import {unifiedDatabaseManager} from "../services/db";
import { generateUUID } from './helpers';
import { supabase, camelToSnake } from '../services/supabase';

/**
 * Create a demo user if none exist
 * NOTE: Demo user creation is currently disabled
 */
export async function createDemoUserIfNeeded(): Promise<void> {
  // Demo user creation is disabled
  console.log('Demo user creation is disabled');
  return;
  
} 