import create from 'zustand';

// App store type
export interface AppStoreType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;
  [key: string]: any;
}

// Create store
const useAppStore = create<AppStoreType>((set) => ({
  isLoading: false,
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  errorMessage: null,
  setErrorMessage: (message: string | null) => set({ errorMessage: message }),
}));

export { useAppStore }; 