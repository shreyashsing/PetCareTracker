import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAppColors } from '../hooks/useAppColors';

export const ThemedStatusBar: React.FC = () => {
  const { isDark } = useAppColors();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}; 