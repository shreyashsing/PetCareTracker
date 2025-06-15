import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity, 
  Dimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastProps = {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
};

type ToastContextType = {
  toast: (props: ToastProps) => void;
};

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [toastProps, setToastProps] = useState<ToastProps>({
    title: '',
    description: '',
    type: 'success',
    duration: 3000
  });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const timeout = useRef<NodeJS.Timeout | null>(null);

  const showToast = () => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    
    setVisible(true);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    timeout.current = setTimeout(() => {
      hideToast();
    }, toastProps.duration);
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  const toast = (props: ToastProps) => {
    setToastProps({
      ...props,
      duration: props.duration || 3000,
      type: props.type || 'success'
    });
    showToast();
  };

  const getIconName = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      default:
        return 'checkmark-circle';
    }
  };

  const getIconColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#10b981';
    }
  };

  const getBackgroundColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '#ecfdf5';
      case 'error':
        return '#fef2f2';
      case 'warning':
        return '#fffbeb';
      case 'info':
        return '#eff6ff';
      default:
        return '#ecfdf5';
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#10b981';
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateY }],
              backgroundColor: getBackgroundColor(toastProps.type as ToastType),
              borderColor: getBorderColor(toastProps.type as ToastType),
            },
          ]}
        >
          <View style={styles.contentContainer}>
            <Ionicons 
              name={getIconName(toastProps.type as ToastType)} 
              size={24} 
              color={getIconColor(toastProps.type as ToastType)} 
              style={styles.icon}
            />
            <View style={styles.textContainer}>
              <Text style={styles.title}>{toastProps.title}</Text>
              {toastProps.description && (
                <Text style={styles.description}>{toastProps.description}</Text>
              )}
            </View>
            <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: StatusBar.currentHeight || 40,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
    borderLeftWidth: 4,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  description: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  closeButton: {
    padding: 4,
  },
});

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}; 