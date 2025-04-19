// Ambient declarations for packages without TypeScript definitions

// ThemeContext
declare module '../contexts/ThemeContext' {
  export interface ThemeColors {
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
    userBubble?: string;
    assistantBubble?: string;
    userText?: string;
    inputBackground?: string; 
    inputText?: string;
    placeholderText?: string;
    sendButton?: string;
    [key: string]: string | undefined;
  }

  export interface ThemeContextType {
    colors: ThemeColors;
    isDark: boolean;
    toggleTheme?: () => void;
  }

  export function useTheme(): ThemeContextType;
}

// AppStore
declare module '../store/AppStore' {
  export interface AppStoreType {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    errorMessage: string | null;
    setErrorMessage: (message: string | null) => void;
    [key: string]: any;
  }
  
  export function useAppStore(): AppStoreType;
}

// PetStore
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
    [key: string]: any;
  }
  
  export function usePetStore(): PetStoreType;
}

// Error reporting
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
    [key: string]: any;
  }
  
  export function useErrorReporting(): ErrorReportingType;
}

// Toast Message
declare module 'react-native-toast-message' {
  interface ToastOptions {
    type: string;
    text1?: string;
    text2?: string;
    position?: 'top' | 'bottom';
    visibilityTime?: number;
    autoHide?: boolean;
    topOffset?: number;
    bottomOffset?: number;
    onShow?: () => void;
    onHide?: () => void;
    onPress?: () => void;
    props?: Record<string, any>;
    [key: string]: any;
  }

  interface Toast {
    show: (options: ToastOptions) => void;
    hide: () => void;
    [key: string]: any;
  }

  const Toast: Toast;
  export default Toast;
}

// Expo Haptics
declare module 'expo-haptics' {
  export enum ImpactFeedbackStyle {
    Light = 'light',
    Medium = 'medium',
    Heavy = 'heavy',
  }
  
  export function impactAsync(style?: ImpactFeedbackStyle): Promise<void>;
  export function notificationAsync(): Promise<void>;
  export function selectionAsync(): Promise<void>;
}

// Gifted Chat
declare module 'react-native-gifted-chat' {
  import * as React from 'react';
  
  export interface User {
    _id: string | number;
    name?: string;
    avatar?: string;
    [key: string]: any;
  }
  
  export interface IMessage {
    _id: string | number;
    text: string;
    createdAt: Date | number;
    user: User;
    image?: string;
    video?: string;
    audio?: string;
    system?: boolean;
    sent?: boolean;
    received?: boolean;
    pending?: boolean;
    quickReplies?: any;
    [key: string]: any;
  }
  
  export interface GiftedChatProps {
    messages: IMessage[];
    onSend: (messages: IMessage[]) => void;
    user: User;
    text?: string;
    messageIdGenerator?: () => string;
    onInputTextChanged?: (text: string) => void;
    renderBubble?: (props: any) => React.ReactNode;
    renderInputToolbar?: (props: any) => React.ReactNode;
    renderDay?: (props: any) => React.ReactNode;
    renderMessage?: (props: any) => React.ReactNode;
    renderSend?: (props: any) => React.ReactNode;
    placeholder?: string;
    alwaysShowSend?: boolean;
    scrollToBottom?: boolean;
    inverted?: boolean;
    renderAvatar?: ((props: any) => React.ReactNode) | null;
    maxComposerHeight?: number;
    bottomOffset?: number;
    textInputStyle?: any;
    [key: string]: any;
  }
  
  export class GiftedChat extends React.Component<GiftedChatProps> {
    static append(currentMessages: IMessage[], messages: IMessage[]): IMessage[];
    static prepend(currentMessages: IMessage[], messages: IMessage[]): IMessage[];
  }
  
  export interface BubbleProps {
    position?: 'left' | 'right';
    currentMessage?: IMessage;
    nextMessage?: IMessage;
    previousMessage?: IMessage;
    containerStyle?: any;
    wrapperStyle?: any;
    textStyle?: any;
    bottomContainerStyle?: any;
    tickStyle?: any;
    usernameStyle?: any;
    containerToNextStyle?: any;
    containerToPreviousStyle?: any;
  }
  
  export function Bubble(props: BubbleProps): JSX.Element;
  export function InputToolbar(props: any): JSX.Element;
  export function Day(props: any): JSX.Element;
  export function Message(props: any): JSX.Element;
  export function Send(props: any): JSX.Element;
} 