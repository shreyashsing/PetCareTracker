import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert } from 'react-native';

type ToastProps = {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

type ToastContextType = {
  toast: (props: ToastProps) => void;
};

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const toast = ({ title, description, variant = 'default' }: ToastProps) => {
    Alert.alert(
      title,
      description,
      [{ text: 'OK' }],
      { cancelable: true }
    );
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}; 