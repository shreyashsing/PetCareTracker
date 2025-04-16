import { FoodItem } from '../../types/components';
import { STORAGE_KEYS } from './constants';
import { BaseRepository } from './repository';
import { notificationService } from '../notifications';

/**
 * Repository for managing FoodItem entities
 */
export class FoodItemRepository extends BaseRepository<FoodItem> {
  constructor() {
    super(STORAGE_KEYS.FOOD_ITEMS);
  }

  /**
   * Get all food items for a specific pet
   * @param petId Pet ID
   * @returns Array of food items for the pet
   */
  async getByPetId(petId: string): Promise<FoodItem[]> {
    return this.find(item => item.petId === petId);
  }

  /**
   * Get food items by category
   * @param petId Pet ID
   * @param category Food category
   * @returns Array of food items in the given category
   */
  async getByCategory(petId: string, category: FoodItem['category']): Promise<FoodItem[]> {
    return this.find(item => item.petId === petId && item.category === category);
  }

  /**
   * Get food items that are low in stock
   * @param petId Pet ID
   * @returns Array of food items that are low in stock
   */
  async getLowStock(petId: string): Promise<FoodItem[]> {
    return this.find(item => {
      const { inventory } = item;
      return (
        item.petId === petId && 
        inventory.currentAmount <= inventory.lowStockThreshold
      );
    });
  }

  /**
   * Get food items by pet preference
   * @param petId Pet ID
   * @param preference Pet preference
   * @returns Array of food items with the given preference
   */
  async getByPreference(petId: string, preference: FoodItem['petPreference']): Promise<FoodItem[]> {
    return this.find(item => 
      item.petId === petId && 
      item.petPreference === preference
    );
  }

  /**
   * Get food items that are expiring soon
   * @param petId Pet ID
   * @param daysThreshold Number of days to check for expiry
   * @returns Array of food items expiring within the threshold
   */
  async getExpiringSoon(petId: string, daysThreshold = 30): Promise<FoodItem[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + daysThreshold);
    
    return this.find(item => {
      // Check if the item is for the specified pet
      if (item.petId !== petId) return false;
      
      // Check if there's an expiry date
      if (!item.purchaseDetails.expiryDate) return false;
      
      // Check if the expiry date is within the threshold
      const expiryDate = new Date(item.purchaseDetails.expiryDate);
      return expiryDate >= now && expiryDate <= future;
    });
  }

  /**
   * Get food items sorted by rating
   * @param petId Pet ID
   * @param ascending Whether to sort in ascending order
   * @returns Array of food items sorted by rating
   */
  async getSortedByRating(petId: string, ascending = false): Promise<FoodItem[]> {
    const items = await this.getByPetId(petId);
    
    return items.sort((a, b) => {
      const comparison = a.rating - b.rating;
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Update inventory amount
   * @param id Food item ID
   * @param newAmount New amount
   * @returns Updated food item if found, null otherwise
   */
  async updateInventory(id: string, newAmount: number): Promise<FoodItem | null> {
    // First get the current food item
    const foodItem = await this.getById(id);
    
    if (!foodItem) {
      return null;
    }
    
    // Calculate days remaining based on new amount and daily feeding amount
    const daysRemaining = Math.floor(newAmount / foodItem.inventory.dailyFeedingAmount);
    
    // Update the inventory with the new amount and days remaining
    const updatedInventory = {
      ...foodItem.inventory,
      currentAmount: newAmount,
      daysRemaining,
      reorderAlert: daysRemaining <= foodItem.inventory.lowStockThreshold
    };

    // Check if we're crossing below the low stock threshold
    const isLowStock = daysRemaining <= foodItem.inventory.lowStockThreshold;
    const wasLowStock = foodItem.inventory.currentAmount <= foodItem.inventory.lowStockThreshold;
    
    // Update the food item
    const updatedFoodItem = await this.update(id, {
      ...foodItem,
      inventory: updatedInventory,
      lowStock: isLowStock
    });
    
    // If the item is now low on stock but wasn't before, schedule an inventory alert
    if (isLowStock && !wasLowStock && updatedFoodItem) {
      await notificationService.scheduleInventoryAlert(updatedFoodItem);
    }
    
    return updatedFoodItem;
  }

  /**
   * Get food items with specific allergens
   * @param petId Pet ID
   * @param allergen Allergen to search for
   * @returns Array of food items containing the allergen
   * @throws Error if allergen parameter is empty
   */
  async getWithAllergen(petId: string, allergen: string): Promise<FoodItem[]> {
    if (!allergen.trim()) {
      throw new Error('Allergen parameter cannot be empty');
    }

    return this.find(item => {
      // Check if the item is for the specified pet
      if (item.petId !== petId) return false;
      
      // Check if the item has allergens
      if (!item.nutritionalInfo.allergens || item.nutritionalInfo.allergens.length === 0) {
        return false;
      }
      
      // Check if any of the allergens match (case-insensitive)
      const searchAllergen = allergen.toLowerCase().trim();
      return item.nutritionalInfo.allergens.some(a => 
        a.toLowerCase().trim() === searchAllergen
      );
    });
  }

  /**
   * Get all veterinarian approved food items
   * @param petId Pet ID
   * @returns Array of veterinarian approved food items
   */
  async getVeterinarianApproved(petId: string): Promise<FoodItem[]> {
    return this.find(item => 
      item.petId === petId && 
      item.veterinarianApproved === true
    );
  }
} 