import React from 'react';
import { GiftedChat as OriginalGiftedChat, IMessage, GiftedChatProps } from 'react-native-gifted-chat';
import { View, ActivityIndicator, Text } from 'react-native';

// This is a wrapper component to avoid TypeScript issues with GiftedChat
// We use 'any' explicitly here for the component props because the types
// from react-native-gifted-chat can cause issues
const SafeGiftedChat: React.FC<any> = (props) => {
  try {
    // @ts-ignore - TypeScript doesn't recognize GiftedChat as a component
    return <OriginalGiftedChat {...props} />;
  } catch (error) {
    console.error('Error rendering GiftedChat:', error);
    // Fallback UI
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#999" />
        <Text style={{ marginTop: 10 }}>Loading chat...</Text>
      </View>
    );
  }
};

// Helper to access the static methods of GiftedChat
export const GiftedChatUtils = {
  append: (currentMessages: IMessage[], newMessages: IMessage[]): IMessage[] => {
    if (OriginalGiftedChat && typeof OriginalGiftedChat.append === 'function') {
      return OriginalGiftedChat.append(currentMessages, newMessages);
    }
    // Fallback implementation if the static method isn't available
    return [...newMessages, ...currentMessages];
  },
  prepend: (currentMessages: IMessage[], newMessages: IMessage[]): IMessage[] => {
    if (OriginalGiftedChat && typeof OriginalGiftedChat.prepend === 'function') {
      return OriginalGiftedChat.prepend(currentMessages, newMessages);
    }
    // Fallback implementation
    return [...currentMessages, ...newMessages];
  },
};

export default SafeGiftedChat; 