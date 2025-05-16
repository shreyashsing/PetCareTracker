import { AsyncStorageService } from './asyncStorage';
import { STORAGE_KEYS, RELATED_KEYS } from './constants';
import { ActivitySession } from '../../types/components';
import { generateUUID } from '../../utils/helpers';
import { supabase } from '../supabase';

/**
 * @deprecated Use unifiedDatabaseManager.activitySessions instead. This repository is being phased out.
 * Repository for managing ActivitySession entities
 */
export class ActivitySessionRepository {
  /**
   * Create a new activity session
   * @param session Activity session to create
   * @returns Created activity session
   */
  async create(session: ActivitySession): Promise<ActivitySession> {
    try {
      // Generate ID if not provided
      if (!session.id) {
        session.id = generateUUID();
      }

      // Get existing sessions
      const sessions = await this.getAll();
      
      // Add new session
      sessions.push(session);
      
      // Save to storage
      await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVITY_SESSIONS, sessions);
      
      // Save to Supabase if connected
      try {
        await this.saveToSupabase(session);
      } catch (error) {
        console.error('Error saving activity session to Supabase:', error);
      }
      
      return session;
    } catch (error) {
      console.error('Error creating activity session:', error);
      throw error;
    }
  }

  /**
   * Get all activity sessions
   * @returns Array of all activity sessions
   */
  async getAll(): Promise<ActivitySession[]> {
    try {
      const sessions = await AsyncStorageService.getItem<ActivitySession[]>(STORAGE_KEYS.ACTIVITY_SESSIONS) || [];
      return sessions;
    } catch (error) {
      console.error('Error getting all activity sessions:', error);
      return [];
    }
  }

  /**
   * Get activity sessions for a specific pet
   * @param petId Pet ID
   * @returns Array of activity sessions for the pet
   */
  async getByPetId(petId: string): Promise<ActivitySession[]> {
    try {
      const sessions = await this.getAll();
      return sessions.filter(session => session.petId === petId);
    } catch (error) {
      console.error(`Error getting activity sessions for pet ${petId}:`, error);
      return [];
    }
  }

  /**
   * Get activity session by ID
   * @param id Activity session ID
   * @returns Activity session or null if not found
   */
  async getById(id: string): Promise<ActivitySession | null> {
    try {
      const sessions = await this.getAll();
      return sessions.find(session => session.id === id) || null;
    } catch (error) {
      console.error(`Error getting activity session with id ${id}:`, error);
      return null;
    }
  }

  /**
   * Update an activity session
   * @param session Updated activity session
   * @returns Updated activity session or null if not found
   */
  async update(session: ActivitySession): Promise<ActivitySession | null> {
    try {
      const sessions = await this.getAll();
      const index = sessions.findIndex(s => s.id === session.id);
      
      if (index === -1) {
        return null;
      }
      
      sessions[index] = session;
      await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVITY_SESSIONS, sessions);
      
      // Update in Supabase if connected
      try {
        await this.saveToSupabase(session);
      } catch (error) {
        console.error('Error updating activity session in Supabase:', error);
      }
      
      return session;
    } catch (error) {
      console.error(`Error updating activity session ${session.id}:`, error);
      throw error;
    }
  }

  /**
   * Delete an activity session
   * @param id Activity session ID to delete
   * @returns True if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    try {
      const sessions = await this.getAll();
      const filteredSessions = sessions.filter(session => session.id !== id);
      
      if (filteredSessions.length === sessions.length) {
        return false;
      }
      
      await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVITY_SESSIONS, filteredSessions);
      
      // Delete from Supabase if connected
      try {
        const { error } = await supabase
          .from('activity_sessions')
          .delete()
          .eq('id', id);
          
        if (error) {
          console.error('Error deleting activity session from Supabase:', error);
        }
      } catch (error) {
        console.error('Exception deleting activity session from Supabase:', error);
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting activity session ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get recent activity sessions for a pet
   * @param petId Pet ID
   * @param limit Maximum number of sessions to return (default 10)
   * @returns Array of recent activity sessions
   */
  async getRecentByPetId(petId: string, limit: number = 10): Promise<ActivitySession[]> {
    try {
      const sessions = await this.getByPetId(petId);
      
      // Sort by date descending (most recent first)
      return sessions
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        })
        .slice(0, limit);
    } catch (error) {
      console.error(`Error getting recent activity sessions for pet ${petId}:`, error);
      return [];
    }
  }

  /**
   * Save activity session to Supabase
   * @param session Activity session to save
   * @returns True if saved successfully
   */
  private async saveToSupabase(session: ActivitySession): Promise<boolean> {
    // Make sure Supabase is available
    if (!supabase) {
      return false;
    }

    try {
      // Convert date objects to ISO strings for Supabase
      const supabaseSession = {
        ...session,
        date: session.date instanceof Date ? session.date.toISOString() : session.date,
        startTime: session.startTime instanceof Date ? session.startTime.toISOString() : session.startTime,
        endTime: session.endTime instanceof Date ? session.endTime.toISOString() : session.endTime,
        // Convert nested objects to JSON strings
        location: session.location ? JSON.stringify(session.location) : null,
        weatherConditions: session.weatherConditions ? JSON.stringify(session.weatherConditions) : null,
        companions: session.companions ? JSON.stringify(session.companions) : null,
        images: session.images ? JSON.stringify(session.images) : null
      };

      // Upsert to Supabase (insert if not exists, update if exists)
      const { error } = await supabase
        .from('activity_sessions')
        .upsert(supabaseSession, { onConflict: 'id' });

      if (error) {
        console.error('Error upserting activity session to Supabase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception saving activity session to Supabase:', error);
      return false;
    }
  }

  /**
   * Sync activity sessions with Supabase
   * @param userId User ID to sync
   * @returns Number of synced records
   */
  async syncWithSupabase(userId: string): Promise<number> {
    // Make sure Supabase is available
    if (!supabase) {
      return 0;
    }

    try {
      // Get local sessions
      const localSessions = await this.getAll();
      let syncCount = 0;

      // Push local sessions to Supabase
      for (const session of localSessions) {
        if (await this.saveToSupabase(session)) {
          syncCount++;
        }
      }

      // Get sessions from Supabase
      const { data: remoteSessions, error } = await supabase
        .from('activity_sessions')
        .select('*');

      if (error) {
        console.error('Error fetching activity sessions from Supabase:', error);
        return syncCount;
      }

      // Process remote sessions
      if (remoteSessions && remoteSessions.length > 0) {
        const localSessionIds = new Set(localSessions.map(s => s.id));
        const newSessions = [];

        for (const remoteSession of remoteSessions) {
          // Skip if already exists locally
          if (localSessionIds.has(remoteSession.id)) {
            continue;
          }

          // Convert back from Supabase format
          const session: ActivitySession = {
            ...remoteSession,
            date: new Date(remoteSession.date),
            startTime: new Date(remoteSession.startTime),
            endTime: new Date(remoteSession.endTime),
            location: remoteSession.location ? JSON.parse(remoteSession.location) : undefined,
            weatherConditions: remoteSession.weatherConditions ? 
              JSON.parse(remoteSession.weatherConditions) : undefined,
            companions: remoteSession.companions ? JSON.parse(remoteSession.companions) : undefined,
            images: remoteSession.images ? JSON.parse(remoteSession.images) : undefined
          };

          newSessions.push(session);
          syncCount++;
        }

        // Save new sessions locally
        if (newSessions.length > 0) {
          await AsyncStorageService.setItem(
            STORAGE_KEYS.ACTIVITY_SESSIONS, 
            [...localSessions, ...newSessions]
          );
        }
      }

      return syncCount;
    } catch (error) {
      console.error('Error syncing activity sessions with Supabase:', error);
      return 0;
    }
  }
} 