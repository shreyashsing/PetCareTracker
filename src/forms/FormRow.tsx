import React, { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface FormRowProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gapSize?: number;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
}

const FormRow: React.FC<FormRowProps> = ({
  children,
  style,
  gapSize = 12,
  align = 'center',
  justify = 'space-between',
}) => {
  // Convert alignment props to flexbox values
  const getAlignItems = () => {
    switch (align) {
      case 'start': return 'flex-start';
      case 'end': return 'flex-end';
      case 'center': return 'center';
      case 'stretch': return 'stretch';
      case 'baseline': return 'baseline';
      default: return 'center';
    }
  };

  const getJustifyContent = () => {
    switch (justify) {
      case 'start': return 'flex-start';
      case 'end': return 'flex-end';
      case 'center': return 'center';
      case 'space-between': return 'space-between';
      case 'space-around': return 'space-around';
      case 'space-evenly': return 'space-evenly';
      default: return 'space-between';
    }
  };

  // Apply gap to children
  const childrenWithGap = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        ...child.props,
        style: [
          child.props.style,
          index !== React.Children.count(children) - 1 && { marginRight: gapSize },
        ],
      });
    }
    return child;
  });

  return (
    <View 
      style={[
        styles.container, 
        { 
          alignItems: getAlignItems(), 
          justifyContent: getJustifyContent() 
        },
        style
      ]}
    >
      {childrenWithGap}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 16,
  },
});

export default FormRow; 