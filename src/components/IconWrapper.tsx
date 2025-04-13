import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Create a wrapper component for icons to prevent 
// "Text strings must be rendered within a <Text> component" error
const IconWrapper: React.FC<{
  name: any;
  size: number;
  color: string;
  style?: any;
}> = ({ name, size, color, style = {} }) => (
  <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
    <Text>
      <Ionicons name={name} size={size} color={color} />
    </Text>
  </View>
);

export default IconWrapper; 