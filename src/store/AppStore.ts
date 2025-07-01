import create from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { isAuthenticatedRoute } from '../utils/navigationUtils';

// Navigation state types
export interface NavigationState {
  currentRoute: string;
  currentParams?: Record<string, any>;
  routeHistory: string[];
  tabIndex?: number;
  stackIndex?: number;
}

// Form state types
export interface FormStateData {
  [key: string]: any;
}

export interface FormState {
  [routeName: string]: {
    data: FormStateData;
    timestamp: number;
    isDirty: boolean; // Has unsaved changes
  };
}

// App store type
export interface AppStoreType {
  // Loading states
  isLoading: boolean;
  isInitializing: boolean;
  setIsLoading: (loading: boolean) => void;
  setIsInitializing: (initializing: boolean) => void;

  // Error handling
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;

  // Navigation state
  navigationState: NavigationState;
  setNavigationState: (state: Partial<NavigationState>) => void;
  updateCurrentRoute: (route: string, params?: Record<string, any>) => void;
  addToRouteHistory: (route: string) => void;
  clearRouteHistory: () => void;

  // App lifecycle
  appState: AppStateStatus;
  lastActiveTime: number;
  wasInBackground: boolean;
  setAppState: (state: AppStateStatus) => void;
  setLastActiveTime: (time: number) => void;
  setWasInBackground: (wasInBackground: boolean) => void;

  // Navigation restoration
  shouldRestoreNavigation: boolean;
  setShouldRestoreNavigation: (should: boolean) => void;
  isRestoringNavigation: boolean;
  setIsRestoringNavigation: (isRestoring: boolean) => void;

  // Form state management
  formStates: FormState;
  formStateSaveTimeouts: Record<string, NodeJS.Timeout | undefined>;
  saveFormState: (routeName: string, formData: FormStateData) => void;
  getFormState: (routeName: string) => FormStateData | null;
  clearFormState: (routeName: string) => void;
  hasFormState: (routeName: string) => boolean;
  isFormDirty: (routeName: string) => boolean;
  
  // Utility methods
  resetAppState: () => void;
  getLastRoute: () => string | null;
  canRestoreToRoute: (route: string) => boolean;
  
  // Persistence methods
  saveStateToStorage: () => Promise<void>;
  loadStateFromStorage: () => Promise<void>;
  saveFormStateToStorage: () => Promise<void>;
  loadFormStateFromStorage: () => Promise<void>;

  [key: string]: any;
}

// Default navigation state
const defaultNavigationState: NavigationState = {
  currentRoute: 'Home',
  currentParams: undefined,
  routeHistory: ['Home'],
  tabIndex: 0,
  stackIndex: 0,
};

// Routes that are safe to restore to (avoid restoring to modals, auth screens, etc.)
const SAFE_RESTORATION_ROUTES = [
  'Home',
  'Health',
  'Schedule', 
  'Feeding',
  'Exercise',
  'PetProfile',
  'Settings',
  'FullAnalytics',
  'ChatAssistant',
  'ManagePets',
  'WeightTrend',
  'FeedbackForm',
  // Form routes that should also be preserved
  'AddMedication',
  'AddPet',
  'EditPet',
  'AddHealthRecord',
  'AddFeeding',
  'AddExercise',
  'AddTask',
  'AddMeal',
  'AddFoodItem',
  'AddActivity'
];

// Form routes that should have their state persisted
const FORM_ROUTES = [
  'AddMedication',
  'AddPet',
  'EditPet',
  'AddHealthRecord',
  'AddFeeding',
  'AddExercise',
  'AddTask',
  'AddMeal',
  'AddFoodItem',
  'AddActivity',
  'FeedbackForm'
];

// Maximum time in background before resetting navigation (15 minutes)
const MAX_BACKGROUND_TIME = 15 * 60 * 1000;

// Maximum time for form state persistence (30 minutes)
const MAX_FORM_STATE_TIME = 30 * 60 * 1000;

// Storage keys
const STORAGE_KEYS = {
  NAVIGATION_STATE: 'pet-care-navigation-state',
  APP_STATE: 'pet-care-app-state',
  FORM_STATES: 'pet-care-form-states',
};

// Create store
const useAppStore = create<AppStoreType>((set, get) => ({
  // Loading states
  isLoading: false,
  isInitializing: true,
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  setIsInitializing: (initializing: boolean) => set({ isInitializing: initializing }),

  // Error handling
  errorMessage: null,
  setErrorMessage: (message: string | null) => set({ errorMessage: message }),

  // Navigation state
  navigationState: defaultNavigationState,
  setNavigationState: (state: Partial<NavigationState>) =>
    set((prevState: AppStoreType) => ({
      navigationState: { ...prevState.navigationState, ...state }
    })),

  updateCurrentRoute: (route: string, params?: Record<string, any>) => {
    const currentState = get();
    
    // If we're currently restoring navigation, don't update the route unless it's a manual navigation
    if (currentState.isRestoringNavigation) {
      console.log('[AppStore] Skipping route update during restoration:', route);
      return;
    }
    
    const newHistory = [...currentState.navigationState.routeHistory];
    
    // Add to history if it's a different route
    if (newHistory[newHistory.length - 1] !== route) {
      newHistory.push(route);
      // Keep history limited to last 10 routes
      if (newHistory.length > 10) {
        newHistory.shift();
      }
    }

    const newNavigationState = {
      ...currentState.navigationState,
      currentRoute: route,
      currentParams: params,
      routeHistory: newHistory,
    };

    set({
      navigationState: newNavigationState,
      // Clear restoration flags when user manually navigates
      shouldRestoreNavigation: false,
    });

    console.log('[AppStore] Route updated to:', route);

    // Auto-save to storage
    setTimeout(() => {
      get().saveStateToStorage();
    }, 100);
  },

  addToRouteHistory: (route: string) => {
    const currentState = get();
    const newHistory = [...currentState.navigationState.routeHistory, route];
    if (newHistory.length > 10) {
      newHistory.shift();
    }
    set({
      navigationState: {
        ...currentState.navigationState,
        routeHistory: newHistory,
      }
    });
  },

  clearRouteHistory: () => set({
    navigationState: {
      ...get().navigationState,
      routeHistory: ['Home'],
    }
  }),

  // App lifecycle
  appState: AppState.currentState,
  lastActiveTime: Date.now(),
  wasInBackground: false,
  
  setAppState: (state: AppStateStatus) => {
    const currentState = get();
    const now = Date.now();
    
    if (state === 'background' || state === 'inactive') {
      set({
        appState: state,
        lastActiveTime: now,
        wasInBackground: true,
      });
      // Save both navigation and form state when going to background
      get().saveStateToStorage();
      get().saveFormStateToStorage();
    } else if (state === 'active' && currentState.wasInBackground) {
      const timeInBackground = now - currentState.lastActiveTime;
      const shouldResetNavigation = timeInBackground > MAX_BACKGROUND_TIME;
      
      set({
        appState: state,
        shouldRestoreNavigation: !shouldResetNavigation && currentState.canRestoreToRoute(currentState.navigationState.currentRoute),
      });
      
      // Load both navigation and form state when coming from background
      if (!shouldResetNavigation) {
        get().loadStateFromStorage();
        get().loadFormStateFromStorage();
      }
    } else {
      set({ appState: state });
    }
  },

  setLastActiveTime: (time: number) => set({ lastActiveTime: time }),
  setWasInBackground: (wasInBackground: boolean) => set({ wasInBackground }),

  // Navigation restoration
  shouldRestoreNavigation: false,
  setShouldRestoreNavigation: (should: boolean) => set({ shouldRestoreNavigation: should }),
  isRestoringNavigation: false,
  setIsRestoringNavigation: (isRestoring: boolean) => set({ isRestoringNavigation: isRestoring }),

  // Form state management
  formStates: {},
  formStateSaveTimeouts: {}, // Track debounce timeouts by route

  saveFormState: (routeName: string, formData: FormStateData) => {
    if (!FORM_ROUTES.includes(routeName)) {
      return;
    }

    const currentState = get();
    const now = Date.now();
    
    // Clear existing timeout if there is one
    if (currentState.formStateSaveTimeouts[routeName]) {
      clearTimeout(currentState.formStateSaveTimeouts[routeName]);
    }
    
    // Set a new timeout to prevent rapid consecutive updates
    const timeoutId = setTimeout(() => {
      const newFormStates = {
        ...get().formStates,
        [routeName]: {
          data: formData,
          timestamp: Date.now(),
          isDirty: true,
        }
      };

      set((state: AppStoreType) => ({ 
        formStates: newFormStates,
        formStateSaveTimeouts: {
          ...state.formStateSaveTimeouts,
          [routeName]: undefined
        }
      }));
      
      console.log(`[AppStore] Form state saved for ${routeName}:`, Object.keys(formData));

      // Auto-save to storage with additional debouncing
      setTimeout(() => {
        get().saveFormStateToStorage();
      }, 500);
    }, 300); // 300ms debounce
    
    // Store the timeout ID
    set((state: AppStoreType) => ({
      formStateSaveTimeouts: {
        ...state.formStateSaveTimeouts,
        [routeName]: timeoutId
      }
    }));
  },

  getFormState: (routeName: string) => {
    const currentState = get();
    const formState = currentState.formStates[routeName];
    
    if (!formState) {
      return null;
    }

    const now = Date.now();
    const timeSinceUpdate = now - formState.timestamp;
    
    // Return null if form state is too old
    if (timeSinceUpdate > MAX_FORM_STATE_TIME) {
      get().clearFormState(routeName);
      return null;
    }

    return formState.data;
  },

  clearFormState: (routeName: string) => {
    const currentState = get();
    const newFormStates = { ...currentState.formStates };
    delete newFormStates[routeName];
    
    set({ formStates: newFormStates });
    
    console.log(`[AppStore] Form state cleared for ${routeName}`);
    
    // Update storage
    get().saveFormStateToStorage();
  },

  hasFormState: (routeName: string) => {
    const formState = get().getFormState(routeName);
    return formState !== null && Object.keys(formState).length > 0;
  },

  isFormDirty: (routeName: string) => {
    const currentState = get();
    const formState = currentState.formStates[routeName];
    return formState?.isDirty || false;
  },

  // Method to clear navigation state on logout
  clearNavigationState: () => {
    console.log('[AppStore] Clearing navigation state due to authentication change');
    set({
      navigationState: defaultNavigationState,
      shouldRestoreNavigation: false,
      isRestoringNavigation: false,
      wasInBackground: false,
    });
  },

  // Utility methods
  resetAppState: () => set({
    navigationState: defaultNavigationState,
    shouldRestoreNavigation: false,
    wasInBackground: false,
    formStates: {},
  }),

  getLastRoute: () => {
    const state = get();
    return state.navigationState.currentRoute;
  },

  canRestoreToRoute: (route: string) => {
    // Special case for FeedbackForm - always allow restoration
    if (route === 'FeedbackForm') {
      console.log(`[AppStore] canRestoreToRoute special handling for "FeedbackForm": true`);
      return true;
    }
    
    const canRestore = SAFE_RESTORATION_ROUTES.includes(route) && isAuthenticatedRoute(route);
    console.log(`[AppStore] canRestoreToRoute check for "${route}":`, {
      inSafeRoutes: SAFE_RESTORATION_ROUTES.includes(route),
      isAuthenticated: isAuthenticatedRoute(route),
      result: canRestore
    });
    return canRestore;
  },

  // Persistence methods
  saveStateToStorage: async () => {
    try {
      const state = get();
      const stateToSave = {
        navigationState: state.navigationState,
        wasInBackground: state.wasInBackground,
        lastActiveTime: state.lastActiveTime,
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.NAVIGATION_STATE, JSON.stringify(stateToSave));
      console.log('[AppStore] Navigation state saved to storage:', stateToSave.navigationState.currentRoute);
    } catch (error) {
      console.error('[AppStore] Error saving navigation state to storage:', error);
    }
  },

  loadStateFromStorage: async () => {
    try {
      const storedState = await AsyncStorage.getItem(STORAGE_KEYS.NAVIGATION_STATE);
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        const now = Date.now();
        const timeSinceLastActive = now - (parsedState.lastActiveTime || 0);
        
        console.log('[AppStore] Loading navigation state from storage:', {
          currentRoute: parsedState.navigationState?.currentRoute,
          timeSinceLastActive: Math.round(timeSinceLastActive / 1000) + 's',
          wasInBackground: parsedState.wasInBackground
        });
        
        // Only restore if not too much time has passed AND was actually in background
        if (timeSinceLastActive < MAX_BACKGROUND_TIME && parsedState.wasInBackground) {
          const route = parsedState.navigationState?.currentRoute || 'Home';
          
          // Special case for FeedbackForm - always allow restoration
          if (route === 'FeedbackForm' && SAFE_RESTORATION_ROUTES.includes(route)) {
            console.log('[AppStore] Special handling for FeedbackForm route - bypassing auth check');
            set({
              navigationState: parsedState.navigationState || defaultNavigationState,
              shouldRestoreNavigation: true,
              wasInBackground: false, // Reset background flag
            });
            console.log('[AppStore] Navigation state restored successfully for FeedbackForm');
            return;
          }
          
          const canRestore = get().canRestoreToRoute(route);
          
          if (canRestore && route !== 'Home') {
            set({
              navigationState: parsedState.navigationState || defaultNavigationState,
              shouldRestoreNavigation: true,
              wasInBackground: false, // Reset background flag
            });
            console.log('[AppStore] Navigation state restored successfully, will navigate to:', route);
          } else {
            console.log('[AppStore] Cannot restore to route or route is Home:', route);
            set({ wasInBackground: false });
          }
        } else {
          console.log('[AppStore] Not restoring - time passed:', timeSinceLastActive > MAX_BACKGROUND_TIME, 'was in background:', parsedState.wasInBackground);
          set({ wasInBackground: false });
        }
      } else {
        console.log('[AppStore] No stored navigation state found');
      }
    } catch (error) {
      console.error('[AppStore] Error loading navigation state from storage:', error);
    }
  },

  saveFormStateToStorage: async () => {
    try {
      const state = get();
      await AsyncStorage.setItem(STORAGE_KEYS.FORM_STATES, JSON.stringify(state.formStates));
      console.log('[AppStore] Form states saved to storage for routes:', Object.keys(state.formStates));
    } catch (error) {
      console.error('[AppStore] Error saving form states to storage:', error);
    }
  },

  loadFormStateFromStorage: async () => {
    try {
      const storedFormStates = await AsyncStorage.getItem(STORAGE_KEYS.FORM_STATES);
      if (storedFormStates) {
        const parsedFormStates = JSON.parse(storedFormStates);
        const now = Date.now();
        
        // Validate and filter out expired or corrupted form states
        const validFormStates: FormState = {};
        Object.entries(parsedFormStates).forEach(([routeName, formState]: [string, any]) => {
          try {
            // Ensure formState has required properties
            if (!formState || typeof formState !== 'object' || !formState.timestamp) {
              console.log(`[AppStore] Invalid form state structure for ${routeName}, skipping`);
              return;
            }
            
            const timeSinceUpdate = now - (formState.timestamp || 0);
            if (timeSinceUpdate < MAX_FORM_STATE_TIME) {
              validFormStates[routeName] = formState;
            } else {
              console.log(`[AppStore] Expired form state removed for ${routeName}`);
            }
          } catch (error) {
            console.error(`[AppStore] Error processing form state for ${routeName}:`, error);
          }
        });
        
        set({ formStates: validFormStates });
        console.log('[AppStore] Form states loaded from storage for routes:', Object.keys(validFormStates));
      } else {
        console.log('[AppStore] No stored form states found');
      }
    } catch (error) {
      console.error('[AppStore] Error loading form states from storage:', error);
      // Reset form states on error to prevent app crashes
      set({ formStates: {} });
    }
  },
}));

export { useAppStore }; 