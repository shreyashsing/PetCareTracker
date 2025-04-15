import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { withErrorBoundary } from '../components/ErrorBoundary';

interface FormErrorProps {
  error?: string | null;
  touched?: boolean;
  fieldName?: string;
}

/**
 * Form Error component for displaying validation errors
 * Standardizes how form errors are displayed throughout the app
 */
export const FormError: React.FC<FormErrorProps> = ({ 
  error, 
  touched = true,
  fieldName
}) => {
  if (!error || !touched) return null;
  
  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>
        {fieldName ? `${fieldName}: ${error}` : error}
      </Text>
    </View>
  );
};

/**
 * Error aggregator for forms to display multiple errors in one place
 */
export const FormErrorSummary: React.FC<{
  errors: Record<string, string>;
  heading?: string;
}> = ({ errors, heading }) => {
  const errorEntries = Object.entries(errors).filter(([_, value]) => !!value);
  
  if (errorEntries.length === 0) return null;
  
  return (
    <View style={styles.summaryContainer}>
      {heading && <Text style={styles.heading}>{heading}</Text>}
      
      {errorEntries.map(([field, error]) => (
        <Text key={field} style={styles.summaryItem}>
          • {field}: {error}
        </Text>
      ))}
    </View>
  );
};

/**
 * A standardized way to handle form submission errors
 */
export const FormSubmissionError: React.FC<{ 
  error: Error | null | undefined;
  resetError?: () => void;
}> = ({ error, resetError }) => {
  if (!error) return null;

  return (
    <View style={styles.submissionErrorContainer}>
      <Text style={styles.submissionHeading}>Error Submitting Form</Text>
      <Text style={styles.errorText}>{error.message}</Text>
      {resetError && (
        <Text style={styles.resetLink} onPress={resetError}>
          Try Again
        </Text>
      )}
    </View>
  );
};

// Export error-boundary wrapped versions
export const SafeFormError = withErrorBoundary(FormError);
export const SafeFormErrorSummary = withErrorBoundary(FormErrorSummary);
export const SafeFormSubmissionError = withErrorBoundary(FormSubmissionError);

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '500',
  },
  summaryContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  heading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  summaryItem: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 4,
  },
  submissionErrorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 4,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  submissionHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  resetLink: {
    color: '#2196F3',
    fontWeight: '500',
    marginTop: 8,
    fontSize: 14,
  },
}); 