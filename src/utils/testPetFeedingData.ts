/**
 * Test utility to check if feeding data exists for the active pet
 * This helps debug why the Pet Assistant isn't getting feeding information
 */

import { unifiedDatabaseManager } from '../services/db';
import { AsyncStorageService } from '../services/db/asyncStorage';
import { STORAGE_KEYS } from '../services/db/constants';

export const testPetFeedingData = async () => {
  try {
    console.log('🧪 Testing Pet Feeding Data...\n');
    
    // 1. Check if there's an active pet
    const activePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
    console.log('Active Pet ID:', activePetId || 'No active pet set');
    
    if (!activePetId) {
      console.log('❌ No active pet found. Please set an active pet first.');
      return;
    }
    
    // 2. Check if the pet exists
    const pet = await unifiedDatabaseManager.pets.getById(activePetId);
    console.log('Pet found:', pet ? `${pet.name} (${pet.type})` : 'Pet not found');
    
    if (!pet) {
      console.log('❌ Pet not found in database.');
      return;
    }
    
    // 3. Check food items
    const allFoodItems = await unifiedDatabaseManager.foodItems.getAll();
    const petFoodItems = allFoodItems.filter((item: any) => item.petId === activePetId);
    console.log(`\n🍽️ Food Items: ${petFoodItems.length} found`);
    
    if (petFoodItems.length > 0) {
      petFoodItems.forEach((item: any, index: number) => {
        console.log(`  ${index + 1}. ${item.name} (${item.brand})`);
        console.log(`     - Type: ${item.type || 'Not specified'}`);
        console.log(`     - Calories: ${item.caloriesPerServing || item.calories || 'Not specified'} per serving`);
        console.log(`     - Preference: ${item.petPreference || 'Not specified'}`);
      });
    } else {
      console.log('   ❌ No food items found for this pet');
      console.log('   💡 Try adding some food items in the app first');
    }
    
    // 4. Check meal schedule
    const todaysMeals = await unifiedDatabaseManager.meals.getByPetIdAndDate(activePetId, new Date());
    console.log(`\n📅 Today's Meals: ${todaysMeals.length} found`);
    
    if (todaysMeals.length > 0) {
      todaysMeals.forEach((meal: any, index: number) => {
        const time = meal.time ? new Date(meal.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'No time set';
        const status = meal.completed ? '✅ Completed' : meal.skipped ? '❌ Skipped' : '⏳ Pending';
        console.log(`  ${index + 1}. ${meal.type || 'Meal'} at ${time} - ${status}`);
        console.log(`     - Calories: ${meal.totalCalories || meal.calories || 'Not specified'}`);
      });
    } else {
      console.log('   ❌ No meals scheduled for today');
      console.log('   💡 Try adding some meals in the feeding schedule');
    }
    
    // 5. Check upcoming meals
    const upcomingMeals = await unifiedDatabaseManager.meals.getUpcoming(activePetId, 3);
    console.log(`\n⏰ Upcoming Meals: ${upcomingMeals.length} found`);
    
    if (upcomingMeals.length > 0) {
      upcomingMeals.forEach((meal: any, index: number) => {
        const time = meal.time ? new Date(meal.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'No time set';
        const date = meal.date ? new Date(meal.date).toLocaleDateString() : 'No date set';
        console.log(`  ${index + 1}. ${meal.type || 'Meal'} on ${date} at ${time}`);
      });
    }
    
    // 6. Check activities
    const activities = await unifiedDatabaseManager.activitySessions.getRecentByPetId(activePetId, 3);
    console.log(`\n🏃 Recent Activities: ${activities.length} found`);
    
    if (activities.length > 0) {
      activities.forEach((activity: any, index: number) => {
        const date = activity.date ? new Date(activity.date).toLocaleDateString() : 'No date';
        console.log(`  ${index + 1}. ${activity.type || 'Activity'} on ${date}`);
        if (activity.duration) console.log(`     - Duration: ${activity.duration} minutes`);
      });
    }
    
    // 7. Summary and recommendations
    console.log('\n📊 Summary:');
    if (petFoodItems.length === 0) {
      console.log('❌ ISSUE: No food items found');
      console.log('💡 SOLUTION: Add food items in the app under "Add Food Item" or "Feeding" section');
    }
    
    if (todaysMeals.length === 0) {
      console.log('❌ ISSUE: No meals scheduled for today');
      console.log('💡 SOLUTION: Add meals in the feeding schedule or "Add Meal" section');
    }
    
    if (petFoodItems.length > 0 && todaysMeals.length > 0) {
      console.log('✅ Feeding data looks good! Pet Assistant should have access to this information.');
      console.log('🔧 If Pet Assistant still says no access, there might be a session loading issue.');
    }
    
    return {
      activePetId,
      pet: pet?.name,
      foodItemsCount: petFoodItems.length,
      todaysMealsCount: todaysMeals.length,
      upcomingMealsCount: upcomingMeals.length,
      activitiesCount: activities.length
    };
    
  } catch (error) {
    console.error('❌ Error testing pet feeding data:', error);
    return null;
  }
};

// Export a simplified version for easy console testing
export const quickFeedingCheck = async () => {
  const result = await testPetFeedingData();
  
  if (result) {
    console.log('\n🎯 Quick Check Result:');
    console.log(`Pet: ${result.pet || 'Not found'}`);
    console.log(`Food Items: ${result.foodItemsCount}`);
    console.log(`Today's Meals: ${result.todaysMealsCount}`);
    console.log(`Activities: ${result.activitiesCount}`);
    
    if (result.foodItemsCount === 0) {
      console.log('\n⚠️  You need to add food items first!');
      console.log('📱 Go to: Feeding → Add Food Item');
    }
    
    if (result.todaysMealsCount === 0) {
      console.log('\n⚠️  You need to add meals for today!');
      console.log('📱 Go to: Feeding → Add Meal');
    }
  }
  
  return result;
}; 