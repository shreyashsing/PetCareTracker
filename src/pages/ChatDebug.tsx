import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useAppColors } from '../hooks/useAppColors';

const ChatDebug: React.FC = () => {
  const { colors } = useAppColors();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Chat Debug</Text>
      <Text style={[styles.text, { color: colors.text }]}>
        This is a placeholder for the Chat Debug screen.
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ChatDebug; 