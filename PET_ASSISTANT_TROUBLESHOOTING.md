# Pet Assistant Troubleshooting Guide

## 🚨 Issue: Pet Assistant Says "No Access to Personal Information"

If your Pet Assistant is saying it doesn't have access to your pet's diet information, follow this troubleshooting guide:

## 🔍 **Step 1: Check Your Data**

First, verify that you have feeding data in your app:

### **In React Native Debugger Console:**
```javascript
// Import the test function
import { quickFeedingCheck } from '../utils/testPetFeedingData';

// Run the test
quickFeedingCheck();
```

### **Expected Output:**
```
🎯 Quick Check Result:
Pet: Buddy
Food Items: 2
Today's Meals: 2
Activities: 1
```

### **Problem Indicators:**
- ❌ `Food Items: 0` - You need to add food items
- ❌ `Today's Meals: 0` - You need to add meals for today
- ❌ `Pet: Not found` - No active pet set

## 🔧 **Step 2: Add Missing Data**

### **If Food Items = 0:**
1. Go to **Feeding** tab in your app
2. Tap **"Add Food Item"** 
3. Add at least one food item with:
   - Name (e.g., "Royal Canin Adult")
   - Brand (e.g., "Royal Canin")
   - Type (dry/wet)
   - Calories per serving

### **If Today's Meals = 0:**
1. Go to **Feeding** tab
2. Tap **"Add Meal"**
3. Create meals for today with:
   - Meal type (breakfast, lunch, dinner)
   - Time
   - Select food items
   - Portion sizes

## 🔄 **Step 3: Force Reload Pet Assistant Context**

After adding data, force reload the Pet Assistant:

### **In React Native Debugger Console:**
```javascript
// Import the reload function
import { forceReloadPetContext } from '../services/petAssistant/forceReloadContext';

// Replace 'your-user-id' with your actual user ID
forceReloadPetContext('your-user-id');
```

### **Expected Output:**
```
🔄 Force reloading Pet Assistant context...
✅ Cleared current session
Active Pet ID: abc-123-def
✅ Started new session with pet context: session-456
✅ Pet Assistant context reloaded successfully!
💬 Try asking about your pet's food now
```

## 🧪 **Step 4: Test the Assistant**

After reloading, test with these prompts:

### **Test Prompts:**
1. **"What food am I currently giving to my pet?"**
2. **"Show me today's feeding schedule"**
3. **"How many calories is my pet getting daily?"**
4. **"What does my pet prefer to eat?"**

### **Expected Response Example:**
```
"Based on your current food inventory, you're feeding Buddy two main foods:

1. Royal Canin Medium Adult Dry Food (Royal Canin)
   - Type: Dry food
   - 340 calories per serving
   - Your pet's preference: Loves it

Today's feeding schedule shows breakfast was completed at 7:00 AM, 
and dinner is planned for 6:00 PM for a total of 500 calories."
```

## 🐛 **Step 5: Debug Issues**

### **If Still No Context After Reload:**

Check the React Native logs for these messages:

#### **Good Signs:**
```
PetAssistantService: Found pet in local database: Buddy
Loaded additional data: 2 food items, 2 recent meals, 2 upcoming meals...
Food items found: ["Royal Canin Adult (Royal Canin)", "Blue Buffalo (Blue Buffalo)"]
✅ Pet Assistant context reloaded successfully!
```

#### **Problem Signs:**
```
❌ No food items found for this pet
❌ No meals scheduled for today
Could not load feeding/exercise data from local database
```

### **Common Solutions:**

#### **Problem: "No active pet found"**
**Solution:**
1. Go to **Manage Pets** in your app
2. Make sure you have a pet created
3. Tap on your pet to set it as active
4. Look for a checkmark or "Active" indicator

#### **Problem: "Food items found: []"**
**Solution:**
1. The database might not be synced
2. Try adding food items again
3. Check if you're using the correct pet
4. Restart the app

#### **Problem: "Could not load feeding/exercise data"**
**Solution:**
1. Check internet connection
2. Try restarting the app
3. Clear and reload the database

## 🔄 **Step 6: Full Reset (Last Resort)**

If nothing works, try a full reset:

### **In React Native Debugger Console:**
```javascript
// Clear Pet Assistant session completely
import { petAssistantService } from '../services/petAssistant';
petAssistantService.clearCurrentSession();

// Clear and reinitialize database
import { unifiedDatabaseManager } from '../services/db';
await unifiedDatabaseManager.initialize();

// Force reload context
import { forceReloadPetContext } from '../services/petAssistant/forceReloadContext';
forceReloadPetContext('your-user-id');
```

## 📱 **Quick Mobile Testing**

### **Check Active Pet:**
1. Open app → **Manage Pets**
2. Verify your pet is marked as "Active"
3. Note the pet's name

### **Check Food Items:**
1. Open app → **Feeding** tab
2. Look for "Food Items" section
3. Should see your added foods

### **Check Meal Schedule:**
1. Open app → **Feeding** tab
2. Look for today's date
3. Should see scheduled meals

## ✅ **Success Indicators**

You'll know it's working when:

1. ✅ Pet Assistant mentions your pet by name
2. ✅ References specific food brands you're using
3. ✅ Shows today's feeding schedule with times
4. ✅ Mentions food preferences (loves/likes/dislikes)
5. ✅ Provides calorie information
6. ✅ References recent exercise activities

## 🆘 **Still Not Working?**

### **Check These Common Issues:**

1. **Wrong Pet Selected**: Make sure the correct pet is set as active
2. **No Data Added**: Ensure you've added food items and meals
3. **Database Sync Issue**: Try restarting the app
4. **Cache Problem**: Clear the Pet Assistant session and reload
5. **Network Issue**: Check if the app can connect to services

### **Get More Debug Info:**
```javascript
// In React Native Debugger Console
import { testPetFeedingData } from '../utils/testPetFeedingData';
testPetFeedingData(); // This will show detailed information
```

---

**Remember**: The Pet Assistant needs actual data in your app to work. Make sure you've:
1. ✅ Added at least one food item
2. ✅ Scheduled at least one meal for today  
3. ✅ Set an active pet
4. ✅ Reloaded the Pet Assistant context

Once these are done, your Pet Assistant should provide personalized, detailed responses about your pet's diet and care! 🐾 