import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { handlePasswordReset } from '../../utils/deepLinks';

type ResetPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ navigation, route }) => {
  const { token } = route.params || {};
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: {
      password?: string;
      confirmPassword?: string;
    } = {};
    let isValid = true;

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!token) {
      Alert.alert('Error', 'Invalid reset token. Please try the password reset process again.');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await handlePasswordReset(token, password);
      
      if (success) {
        Alert.alert(
          'Password Reset',
          'Your password has been successfully reset. You can now log in with your new password.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('Login') 
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to reset password. The link may have expired. Please try again.');
      }
    } catch (error) {
      console.error('Password reset failed', error);
      Alert.alert('Error', 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.header}>
          <Ionicons name="lock-open-outline" size={60} color="#4CAF50" />
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Create a new password for your account
          </Text>
        </View>
        
        <View style={styles.form}>
          <Input
            label="New Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter new password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.confirmPassword}
          />

          <Button
            title={isLoading ? "Resetting..." : "Reset Password"}
            onPress={handleSubmit}
            disabled={isLoading}
            style={styles.resetButton}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  resetButton: {
    marginTop: 10,
    marginBottom: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ResetPasswordScreen; 