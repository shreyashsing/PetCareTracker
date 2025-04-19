import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAuth } from '../../providers/AuthProvider';
import { useAppColors } from '../../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { signIn, isLoading } = useAuth();
  const { colors } = useAppColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; auth?: string }>({});
  const [loginInProgress, setLoginInProgress] = useState(false);
  
  // Clear previous auth errors when unmounting
  useEffect(() => {
    return () => {
      // Clear any errors on unmount
      setErrors({});
    };
  }, []);
  
  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    let isValid = true;
    
    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }
    
    setErrors(prev => ({ ...newErrors, auth: prev.auth }));
    return isValid;
  };
  
  const handleLogin = async () => {
    if (validateForm()) {
      try {
        setLoginInProgress(true);
        const { error } = await signIn(email, password);
        
        if (error) {
          setErrors(prev => ({ ...prev, auth: error.message }));
          Alert.alert('Login Failed', error.message || 'Invalid email or password.');
        }
      } catch (error: any) {
        console.error('Login error:', error);
        
        if (error.message?.includes('Email not verified')) {
          Alert.alert(
            'Email Not Verified',
            'Your email has not been verified. Please check your email inbox.',
            [
              {
                text: 'OK',
                style: 'default',
              }
            ]
          );
        } else {
          Alert.alert('Login Failed', `An error occurred: ${error.message || 'Unknown error'}`);
        }
      } finally {
        setLoginInProgress(false);
      }
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
        <View style={styles.header}>
          <Ionicons name="paw" size={60} color="#4CAF50" />
          <Text style={styles.title}>Pet Care Tracker</Text>
          <Text style={styles.subtitle}>Log in to your account</Text>
        </View>
        
        <View style={styles.form}>
          {errors.auth && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errors.auth}</Text>
            </View>
          )}
          
          <Input
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              // Clear email error when typing
              if (errors.email) {
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.email;
                  return newErrors;
                });
              }
            }}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          
          <Input
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              // Clear password error when typing
              if (errors.password) {
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.password;
                  return newErrors;
                });
              }
            }}
            placeholder="Your password"
            secureTextEntry
            error={errors.password}
          />
          
          <View style={styles.forgotPassword}>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          
          <Button
            title={loginInProgress ? "Signing in..." : "Sign In"}
            onPress={handleLogin}
            disabled={loginInProgress}
            style={styles.loginButton}
          />
          
          <View style={styles.credentialsHint}>
            <Text style={styles.credentialsHintText}>
              Demo credentials: user@example.com / password123
            </Text>
          </View>
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  },
  form: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  loginButton: {
    marginBottom: 16,
  },
  credentialsHint: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
  },
  credentialsHintText: {
    color: '#2E7D32',
    fontSize: 12,
    textAlign: 'center',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen; 