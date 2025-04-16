import { Task } from '../../types/components';
import { RELATED_KEYS, STORAGE_KEYS } from './constants';
import { BaseRepository } from './repository';

/**
 * Repository for managing Task entities
 */
export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super(STORAGE_KEYS.TASKS);
  }

  private petTasksKey(petId: string): string {
    return RELATED_KEYS.PET_TASKS(petId);
  }

  /**
   * Ensure scheduleInfo dates are proper Date objects
   * @param task The task to process
   * @returns Task with ensured Date objects
   */
  private ensureDates(task: Task): Task {
    if (task.scheduleInfo) {
      // Convert scheduleInfo.date to a Date object if it's not already
      if (!(task.scheduleInfo.date instanceof Date)) {
        task.scheduleInfo.date = new Date(task.scheduleInfo.date);
      }
      
      // Convert scheduleInfo.time to a Date object if it's not already
      if (!(task.scheduleInfo.time instanceof Date)) {
        task.scheduleInfo.time = new Date(task.scheduleInfo.time);
      }
    }
    
    return task;
  }

  /**
   * Get all tasks for a specific pet
   * @param petId Pet ID
   * @returns Array of tasks for the pet
   */
  async getByPetId(petId: string): Promise<Task[]> {
    return this.find(task => task.petId === petId);
  }

  /**
   * Get tasks for a specific date
   * @param date Date to get tasks for
   * @returns Array of tasks for the date
   */
  async getByDate(date: Date): Promise<Task[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);
    
    return this.find(task => {
      const taskDate = new Date(task.scheduleInfo.date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === targetDate.getTime();
    });
  }

  /**
   * Get tasks for a pet on a specific date
   * @param petId Pet ID
   * @param date Date to get tasks for
   * @returns Array of tasks for the pet on the date
   */
  async getByPetIdAndDate(petId: string, date: Date): Promise<Task[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return this.find(task => {
      const taskDate = new Date(task.scheduleInfo.date);
      taskDate.setHours(0, 0, 0, 0);
      return task.petId === petId && taskDate.getTime() === targetDate.getTime();
    });
  }

  /**
   * Get upcoming tasks for a pet
   * @param petId Pet ID
   * @param limit Maximum number of tasks to return
   * @returns Array of upcoming tasks for the pet
   */
  async getUpcomingByPetId(petId: string, limit = 5): Promise<Task[]> {
    const now = new Date();
    
    const tasks = await this.find(task => {
      // Check if the task is for the specified pet
      if (task.petId !== petId) return false;
      
      // Check if the task is pending or in-progress
      if (task.status !== 'pending' && task.status !== 'in-progress') return false;
      
      // Check if the task is in the future or current
      const taskDate = new Date(task.scheduleInfo.date);
      const taskDateTime = new Date(
        taskDate.getFullYear(),
        taskDate.getMonth(),
        taskDate.getDate(),
        task.scheduleInfo.time.getHours(),
        task.scheduleInfo.time.getMinutes()
      );
      
      return taskDateTime >= now;
    });
    
    // Sort by date and time
    tasks.sort((a, b) => {
      const aDate = new Date(a.scheduleInfo.date);
      const aTime = new Date(a.scheduleInfo.time);
      const aDateTime = new Date(
        aDate.getFullYear(),
        aDate.getMonth(),
        aDate.getDate(),
        aTime.getHours(),
        aTime.getMinutes()
      );
      
      const bDate = new Date(b.scheduleInfo.date);
      const bTime = new Date(b.scheduleInfo.time);
      const bDateTime = new Date(
        bDate.getFullYear(),
        bDate.getMonth(),
        bDate.getDate(),
        bTime.getHours(),
        bTime.getMinutes()
      );
      
      return aDateTime.getTime() - bDateTime.getTime();
    });
    
    return tasks.slice(0, limit);
  }

  /**
   * Get tasks by category
   * @param category Task category
   * @returns Array of tasks with the given category
   */
  async getByCategory(category: Task['category']): Promise<Task[]> {
    return this.find(task => task.category === category);
  }

  /**
   * Get tasks by status
   * @param status Task status
   * @returns Array of tasks with the given status
   */
  async getByStatus(status: Task['status']): Promise<Task[]> {
    return this.find(task => task.status === status);
  }

  /**
   * Mark a task as completed
   * @param id Task ID
   * @param completedBy ID of the user who completed the task
   * @param notes Optional notes about the completion
   * @returns Updated task if found, null otherwise
   */
  async markAsCompleted(id: string, completedBy: string, notes?: string): Promise<Task | null> {
    try {
      // Get the existing task first
      const existingTask = await this.getById(id);
      if (!existingTask) {
        return null;
      }
      
      // Ensure dates are proper Date objects
      const taskWithDates = this.ensureDates(existingTask);
      
      const completionDetails = {
        completedAt: new Date(),
        completedBy,
        notes
      };
      
      // Call the parent class update method
      return super.update(id, {
        ...taskWithDates,
        status: 'completed',
        completionDetails
      });
    } catch (error) {
      console.error('Error marking task as completed:', error);
      throw error;
    }
  }

  /**
   * Get overdue tasks
   * @returns Array of overdue tasks
   */
  async getOverdueTasks(): Promise<Task[]> {
    const now = new Date();
    
    return this.find(task => {
      // Only check pending tasks
      if (task.status !== 'pending') return false;
      
      // Get the task date and time
      const taskDate = new Date(task.scheduleInfo.date);
      const taskTime = new Date(task.scheduleInfo.time);
      const taskDateTime = new Date(
        taskDate.getFullYear(),
        taskDate.getMonth(),
        taskDate.getDate(),
        taskTime.getHours(),
        taskTime.getMinutes()
      );
      
      return taskDateTime < now;
    });
  }

  /**
   * Update a task
   * @param id Task ID
   * @param update Updates to apply
   * @returns Updated task if found, null otherwise
   */
  async update(id: string, update: Partial<Task>): Promise<Task | null> {
    try {
      // Get the existing task first
      const existingTask = await this.getById(id);
      if (!existingTask) {
        return null;
      }
      
      // Merge the existing task with the update
      const mergedTask = { ...existingTask, ...update };
      
      // Ensure dates are proper Date objects
      const taskWithDates = this.ensureDates(mergedTask);
      
      // Call the parent class update method
      return super.update(id, taskWithDates);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Update task status
   * @param id Task ID
   * @param status New task status
   * @returns Updated task if found, null otherwise
   */
  async updateStatus(id: string, status: Task['status']): Promise<Task | null> {
    try {
      // Get the existing task first
      const existingTask = await this.getById(id);
      if (!existingTask) {
        return null;
      }
      
      // Ensure dates are proper Date objects
      const taskWithDates = this.ensureDates(existingTask);
      
      // Update the status
      return super.update(id, { ...taskWithDates, status });
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }
} 