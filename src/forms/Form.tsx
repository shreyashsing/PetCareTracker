import React, { ReactNode } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  StyleProp,
  ViewStyle
} from 'react-native';

// Form Context to manage form state
interface FormContextType {
  isSubmitting: boolean;
}

export const FormContext = React.createContext<FormContextType>({
  isSubmitting: false,
});

interface FormProps {
  children: ReactNode;
  onSubmit?: () => void;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  isSubmitting?: boolean;
}

const Form: React.FC<FormProps> = ({
  children,
  onSubmit,
  style,
  contentContainerStyle,
  scrollable = true,
  keyboardShouldPersistTaps = 'handled',
  isSubmitting = false,
}) => {
  // Content of the form
  const formContent = (
    <View 
      style={[
        styles.formContainer,
        !scrollable && styles.nonScrollableContainer,
        !scrollable && contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <FormContext.Provider value={{ isSubmitting }}>
      <KeyboardAvoidingView
        style={[styles.container, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {scrollable ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollViewContent, contentContainerStyle]}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            showsVerticalScrollIndicator={false}
          >
            {formContent}
          </ScrollView>
        ) : (
          formContent
        )}
      </KeyboardAvoidingView>
    </FormContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: 16,
  },
  formContainer: {
    width: '100%',
  },
  nonScrollableContainer: {
    flex: 1,
    padding: 16,
  },
});

export default Form; 