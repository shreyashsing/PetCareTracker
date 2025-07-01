import { supabase } from '../supabase';
import Constants from 'expo-constants';

// Define feedback types
export type FeedbackType = 'bug_report' | 'feature_request' | 'general_feedback' | 'issue_report';
export type FeedbackSeverity = 'low' | 'medium' | 'high' | 'critical' | null;
export type FeedbackStatus = 'new' | 'in_review' | 'in_progress' | 'completed' | 'rejected';

// Define feedback interface
export interface AppFeedback {
  id?: string;
  user_id?: string;
  feedback_type: FeedbackType;
  title: string;
  description: string;
  severity?: FeedbackSeverity;
  app_version?: string;
  device_info?: string;  // Manually provided by user
  screenshot_url?: string | null;
  status?: FeedbackStatus;
  created_at?: string;
  updated_at?: string;
  is_anonymous?: boolean;
  contact_email?: string | null;
  admin_notes?: string | null;
}

// Simple base repository interface to avoid importing from another file
interface Repository<T> {
  getById(id: string): Promise<T | null>;
  create(item: Partial<T>): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export class AppFeedbackRepository implements Repository<AppFeedback> {
  // Flag to check if API key is available
  public hasApiKey: boolean = false;
  protected tableName: string = 'app_feedback';

  constructor() {
    // Check if API key is available
    try {
      this.hasApiKey = !!supabase.auth.getSession;
    } catch (e) {
      this.hasApiKey = false;
    }
  }

  /**
   * Submit new feedback with user-provided information
   */
  async submitFeedback(feedback: AppFeedback) {
    try {
      // Get current app version (this is still useful metadata)
      const appVersion = Constants.expoConfig?.version || '1.0.0';
      
      // Create complete feedback object
      const completeFeeback: AppFeedback = {
        ...feedback,
        app_version: appVersion
      };
      
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(completeFeeback)
        .select()
        .single();
        
      if (error) {
        console.error('Error submitting feedback:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in submitFeedback:', error);
      throw error;
    }
  }
  
  /**
   * Get feedback history for the current user
   */
  async getUserFeedbackHistory() {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error('No authenticated user found');
      }
      
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching user feedback:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getUserFeedbackHistory:', error);
      throw error;
    }
  }
  
  /**
   * Submit anonymous feedback
   */
  async submitAnonymousFeedback(feedback: Omit<AppFeedback, 'user_id'>) {
    try {
      // Get current app version
      const appVersion = Constants.expoConfig?.version || '1.0.0';
      
      // Create complete feedback object
      const completeFeeback: AppFeedback = {
        ...feedback,
        is_anonymous: true,
        user_id: undefined, // Ensure user_id is not set for anonymous feedback
        app_version: appVersion
      };
      
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(completeFeeback)
        .select()
        .single();
        
      if (error) {
        console.error('Error submitting anonymous feedback:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in submitAnonymousFeedback:', error);
      throw error;
    }
  }
  
  /**
   * Upload feedback screenshot to storage
   */
  async uploadScreenshot(uri: string, userId?: string) {
    try {
      // Create a unique file path
      const timestamp = new Date().getTime();
      const uniqueId = userId || 'anonymous';
      const extension = uri.split('.').pop();
      const filePath = `feedback-screenshots/${uniqueId}-${timestamp}.${extension}`;
      
      // Convert uri to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload to storage
      const { data, error } = await supabase.storage
        .from('app-feedback')
        .upload(filePath, blob);
        
      if (error) {
        console.error('Error uploading screenshot:', error);
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('app-feedback')
        .getPublicUrl(filePath);
        
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadScreenshot:', error);
      throw error;
    }
  }

  // Required methods from Repository interface
  async getById(id: string): Promise<AppFeedback | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select()
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data as AppFeedback;
  }

  async create(item: Partial<AppFeedback>): Promise<AppFeedback> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(item)
      .select()
      .single();
      
    if (error) throw error;
    return data as AppFeedback;
  }

  async update(id: string, updates: Partial<AppFeedback>): Promise<AppFeedback> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as AppFeedback;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
}

// Export singleton instance
export const appFeedbackRepository = new AppFeedbackRepository(); 