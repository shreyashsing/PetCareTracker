/**
 * Module declarations for third-party libraries without proper TypeScript support
 */

// Make sure we have React types available
/// <reference types="react" />

// Declare zustand module
declare module 'zustand' {
  function create<T>(initializer: (set: any, get: any, api: any) => T): () => T;
  export default create;
}

// Toast message module
declare module 'react-native-toast-message' {
  interface ToastShowParams {
    type?: 'success' | 'error' | 'info';
    position?: 'top' | 'bottom';
    text1?: string;
    text2?: string;
    visibilityTime?: number;
    autoHide?: boolean;
    topOffset?: number;
    bottomOffset?: number;
    props?: any;
    onShow?: () => void;
    onHide?: () => void;
  }

  interface ToastHideParams {
    onHide?: () => void;
  }

  interface ToastType {
    show: (params: ToastShowParams) => void;
    hide: (params?: ToastHideParams) => void;
  }

  const Toast: ToastType & React.FC<any>;
  export default Toast;
}

// Haptics module
declare module 'expo-haptics' {
  enum ImpactFeedbackStyle {
    Light = 0,
    Medium = 1,
    Heavy = 2,
  }

  enum NotificationFeedbackType {
    Success = 0,
    Warning = 1,
    Error = 2,
  }

  function impactAsync(style: ImpactFeedbackStyle): Promise<void>;
  function notificationAsync(type: NotificationFeedbackType): Promise<void>;
  function selectionAsync(): Promise<void>;
  
  export { 
    ImpactFeedbackStyle, 
    NotificationFeedbackType,
    impactAsync,
    notificationAsync,
    selectionAsync
  };
}

// GiftedChat module
declare module 'react-native-gifted-chat' {
  interface IMessage {
    _id: string | number;
    text: string;
    createdAt: Date | number;
    user: {
      _id: string | number;
      name?: string;
      avatar?: string;
    };
    image?: string;
    video?: string;
    audio?: string;
    system?: boolean;
    sent?: boolean;
    received?: boolean;
    pending?: boolean;
    quickReplies?: {
      type: 'radio' | 'checkbox';
      values: Array<{
        title: string;
        value: string;
        messageId?: string;
      }>;
      keepIt?: boolean;
    };
    [key: string]: any;
  }

  interface GiftedChatProps {
    messages?: IMessage[];
    text?: string;
    onSend?: (messages: IMessage[]) => void;
    alwaysShowSend?: boolean;
    [key: string]: any;
  }

  // GiftedChat class
  export class GiftedChat extends React.Component<GiftedChatProps> {
    static append(currentMessages: IMessage[], newMessages: IMessage[]): IMessage[];
    static prepend(currentMessages: IMessage[], newMessages: IMessage[]): IMessage[];
  }

  export { IMessage, GiftedChatProps };
  export default GiftedChat;
}

// Custom Contexts
declare module '../contexts/ThemeContext' {
  export interface ThemeContextType {
    colors: {
      primary: string;
      background: string;
      card: string;
      text: string;
      border: string;
      notification: string;
      error: string;
      success: string;
      warning: string;
      info: string;
      assistantText: string;
      userBubble: string;
      assistantBubble: string;
      userText: string;
      inputBackground: string;
      inputText: string;
      placeholderText: string;
      sendButton: string;
    };
    isDark: boolean;
    toggleTheme?: () => void;
  }

  export const useTheme: () => ThemeContextType;
  
  const ThemeContext: React.Context<ThemeContextType>;
  export default ThemeContext;
}

// Custom Stores
declare module '../store/AppStore' {
  export interface AppStoreType {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    errorMessage: string | null;
    setErrorMessage: (message: string | null) => void;
    [key: string]: any;
  }

  export const useAppStore: () => AppStoreType;
}

declare module '../store/PetStore' {
  export interface Pet {
    id: string;
    name: string;
    type: string;
    breed?: string;
    birthDate?: string;
    weight?: number;
    gender?: string;
    color?: string;
    microchipped?: boolean;
    microchipId?: string;
    notes?: string;
    image?: string;
    created_at?: string;
    updated_at?: string;
    user_id?: string;
    [key: string]: any;
  }

  export interface PetStoreType {
    pets: Pet[];
    activePet: Pet | null;
    setPets: (pets: Pet[]) => void;
    setActivePet: (pet: Pet | null) => void;
    addPet: (pet: Pet) => void;
    updatePet: (pet: Pet) => void;
    deletePet: (petId: string) => void;
    loadPets: () => Promise<void>;
  }

  export const usePetStore: () => PetStoreType;
}

// Utility modules
declare module '../utils/error-reporting' {
  export interface ErrorReportingType {
    reportError: (error: any, context?: string) => void;
    captureException: (error: any) => void;
    captureMessage: (message: string) => void;
    addBreadcrumb: (breadcrumb: {
      category?: string;
      message: string;
      data?: any;
    }) => void;
  }

  export const useErrorReporting: () => ErrorReportingType;
} 