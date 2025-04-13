import { Meal } from '../../types/components';
import { RELATED_KEYS, STORAGE_KEYS } from './constants';
import { BaseRepository } from './repository';

/**
 * Repository for managing Meal entities
 */
export class MealRepository extends BaseRepository<Meal> {
  constructor() {
    super(STORAGE_KEYS.MEALS);
  }

  private petMealsKey(petId: string): string {
    return RELATED_KEYS.PET_MEALS(petId);
  }

  /**
   * Get all meals for a specific pet
   * @param petId Pet ID
   * @returns Array of meals for the pet
   */
  async getByPetId(petId: string): Promise<Meal[]> {
    return this.find(meal => meal.petId === petId);
  }

  /**
   * Get meals for a specific date
   * @param date Date to get meals for
   * @returns Array of meals for the date
   */
  async getByDate(date: Date): Promise<Meal[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return this.find(meal => {
      const mealDate = new Date(meal.date);
      mealDate.setHours(0, 0, 0, 0);
      return mealDate.getTime() === targetDate.getTime();
    });
  }

  /**
   * Get meals for a pet on a specific date
   * @param petId Pet ID
   * @param date Date to get meals for
   * @returns Array of meals for the pet on the date
   */
  async getByPetIdAndDate(petId: string, date: Date): Promise<Meal[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return this.find(meal => {
      const mealDate = new Date(meal.date);
      mealDate.setHours(0, 0, 0, 0);
      return meal.petId === petId && mealDate.getTime() === targetDate.getTime();
    });
  }

  /**
   * Mark a meal as completed
   * @param id Meal ID
   * @returns Updated meal if found, null otherwise
   */
  async markAsCompleted(id: string): Promise<Meal | null> {
    return this.update(id, {
      completed: true,
      skipped: false
    });
  }

  /**
   * Mark a meal as skipped
   * @param id Meal ID
   * @returns Updated meal if found, null otherwise
   */
  async markAsSkipped(id: string): Promise<Meal | null> {
    return this.update(id, {
      completed: false,
      skipped: true
    });
  }

  /**
   * Get meals by type
   * @param type Meal type
   * @returns Array of meals with the given type
   */
  async getByType(type: Meal['type']): Promise<Meal[]> {
    return this.find(meal => meal.type === type);
  }

  /**
   * Get upcoming meals for a pet
   * @param petId Pet ID
   * @param limit Maximum number of meals to return
   * @returns Array of upcoming meals for the pet
   */
  async getUpcomingByPetId(petId: string, limit = 5): Promise<Meal[]> {
    const now = new Date();
    
    const meals = await this.find(meal => {
      // Check if the meal is for the specified pet
      if (meal.petId !== petId) return false;
      
      // Check if the meal is not completed or skipped
      if (meal.completed || meal.skipped) return false;
      
      // Check if the meal is in the future or current
      const mealDate = new Date(meal.date);
      const mealTime = new Date(meal.time);
      const mealDateTime = new Date(
        mealDate.getFullYear(),
        mealDate.getMonth(),
        mealDate.getDate(),
        mealTime.getHours(),
        mealTime.getMinutes()
      );
      
      return mealDateTime >= now;
    });
    
    // Sort by date and time
    meals.sort((a, b) => {
      const aDate = new Date(a.date);
      const aTime = new Date(a.time);
      const aDateTime = new Date(
        aDate.getFullYear(),
        aDate.getMonth(),
        aDate.getDate(),
        aTime.getHours(),
        aTime.getMinutes()
      );
      
      const bDate = new Date(b.date);
      const bTime = new Date(b.time);
      const bDateTime = new Date(
        bDate.getFullYear(),
        bDate.getMonth(),
        bDate.getDate(),
        bTime.getHours(),
        bTime.getMinutes()
      );
      
      return aDateTime.getTime() - bDateTime.getTime();
    });
    
    return meals.slice(0, limit);
  }

  /**
   * Get total calories consumed by a pet for a date range
   * @param petId Pet ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Total calories consumed
   */
  async getTotalCaloriesByDateRange(petId: string, startDate: Date, endDate: Date): Promise<number> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const meals = await this.find(meal => {
      // Check if the meal is for the specified pet
      if (meal.petId !== petId) return false;
      
      // Check if the meal is completed
      if (!meal.completed) return false;
      
      // Check if the meal is within the date range
      const mealDate = new Date(meal.date);
      return mealDate >= start && mealDate <= end;
    });
    
    // Sum up the calories
    return meals.reduce((total, meal) => total + meal.totalCalories, 0);
  }

  /**
   * Get meals completed count by date range
   * @param petId Pet ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Number of completed meals
   */
  async getCompletedCountByDateRange(petId: string, startDate: Date, endDate: Date): Promise<number> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const meals = await this.find(meal => {
      // Check if the meal is for the specified pet
      if (meal.petId !== petId) return false;
      
      // Check if the meal is completed
      if (!meal.completed) return false;
      
      // Check if the meal is within the date range
      const mealDate = new Date(meal.date);
      return mealDate >= start && mealDate <= end;
    });
    
    return meals.length;
  }
} 