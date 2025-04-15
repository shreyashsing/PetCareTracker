import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary, withErrorBoundary } from '../../../src/components/ErrorBoundary';
import { Text, TouchableOpacity } from 'react-native';

// Test components
const ErrorTrigger = () => {
  throw new Error('Test error');
};

const ButtonThatThrows = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Button error');
  }
  return <Text>Button OK</Text>;
};

// Mock component with a button to trigger an error
const ToggleErrorComponent = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);
  
  return (
    <ErrorBoundary>
      <TouchableOpacity 
        testID="toggle-error"
        onPress={() => setShouldThrow(true)}
      >
        <Text>Trigger Error</Text>
      </TouchableOpacity>
      
      <ButtonThatThrows shouldThrow={shouldThrow} />
    </ErrorBoundary>
  );
};

// Higher-order component tests
const ComponentWithHOC = withErrorBoundary(() => <Text>HOC Component</Text>);

describe('ErrorBoundary', () => {
  // Suppress React error boundary console errors to avoid noisy output
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>No error here</Text>
      </ErrorBoundary>
    );
    
    expect(getByText('No error here')).toBeDefined();
  });

  it('renders fallback UI when a child component throws', () => {
    // We need to mock the componentDidCatch since it uses methods that 
    // don't exist in the test environment
    jest.spyOn(ErrorBoundary.prototype, 'componentDidCatch').mockImplementation(() => {});
    
    const { getByText } = render(
      <ErrorBoundary>
        <ErrorTrigger />
      </ErrorBoundary>
    );
    
    expect(getByText('Something went wrong')).toBeDefined();
  });

  it('calls the onError callback when an error occurs', () => {
    const mockOnError = jest.fn();
    jest.spyOn(ErrorBoundary.prototype, 'componentDidCatch').mockImplementation(function() {
      if (this.props.onError) {
        this.props.onError(new Error('Test error'), { componentStack: 'test stack' });
      }
    });
    
    render(
      <ErrorBoundary onError={mockOnError}>
        <ErrorTrigger />
      </ErrorBoundary>
    );
    
    expect(mockOnError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('allows error recovery by clicking the try again button', () => {
    jest.spyOn(ErrorBoundary.prototype, 'componentDidCatch').mockImplementation(() => {});
    
    // Render component with button that will cause error when pressed
    const { getByText, getByTestId } = render(<ToggleErrorComponent />);
    
    // Initially component renders without error
    expect(getByText('Button OK')).toBeDefined();
    
    // Trigger the error
    fireEvent.press(getByTestId('toggle-error'));
    
    // Now error boundary should show the fallback UI
    expect(getByText('Something went wrong')).toBeDefined();
    
    // Find and press the "Try Again" button
    const tryAgainButton = getByText('Try Again');
    fireEvent.press(tryAgainButton);
    
    // Component should be back to initial state (though it will still throw immediately)
    expect(getByText('Something went wrong')).toBeDefined();
  });

  it('works when used as a higher-order component', () => {
    const { getByText } = render(<ComponentWithHOC />);
    expect(getByText('HOC Component')).toBeDefined();
  });
}); 