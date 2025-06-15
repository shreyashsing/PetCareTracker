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
import { useAuth } from '../../contexts/AuthContext';
import { useAppColors } from '../../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { sendConfirmationEmail } from '../../utils/emailConfirmation';
import NetInfo from '@react-native-community/netinfo';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, isLoading: authLoading } = useAuth();
  const { colors } = useAppColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  // Combined loading state from both local and auth context
  const isLoading = loginInProgress || authLoading;
  
  // Check network status on mount and when it changes
  useEffect(() => {
    // Check initial connection status
    const checkConnection = async () => {
      const netInfo = await NetInfo.fetch();
      setIsOffline(!(netInfo.isConnected && netInfo.isInternetReachable));
    };
    
    checkConnection();
    
    // Subscribe to connection changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected && state.isInternetReachable));
    });
    
    return () => {
      unsubscribe();
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
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleLogin = async () => {
    if (validateForm()) {
      try {
        setLoginInProgress(true);
        const { error } = await login(email, password);
        setLoginInProgress(false);
        
        if (error) {
          console.log('Login error:', error);
          if (isOffline) {
            if (error.message === 'Cannot verify credentials while offline') {
              Alert.alert(
                'Offline Login Failed',
                'The email you entered doesn\'t match your previous login. When offline, you can only sign in with the same email as your last successful login.'
              );
            } else if (error.message === 'No stored credentials found') {
              Alert.alert(
                'Offline Login Failed',
                'No previous login found. You need to sign in at least once online before using offline mode.'
              );
            } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
              Alert.alert(
                'Network Error',
                'The request timed out. Please check your connection and try again.'
              );
            } else {
              Alert.alert(
                'Offline Login Failed',
                'Unable to sign in while offline. Please connect to the internet and try again.'
              );
            }
          } else {
            if (error.message?.includes('Invalid login credentials')) {
              Alert.alert('Login Failed', 'Invalid email or password. Please check your credentials and try again.');
            } else if (error.message?.includes('Email not confirmed')) {
              Alert.alert(
                'Email Not Verified',
                'Your email has not been verified. Please check your email inbox for a verification link.'
              );
            } else {
              Alert.alert('Login Failed', `${error.message || 'An unknown error occurred'}`);
            }
          }
        }
      } catch (error: any) {
        setLoginInProgress(false);
        console.error('Login error:', error);
        
        if (error.message?.includes('Email not confirmed')) {
          Alert.alert(
            'Email Not Verified',
            'Your email has not been verified. Would you like to resend the verification email?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Resend',
                onPress: async () => {
                  const sent = await sendConfirmationEmail(email);
                  if (sent) {
                    Alert.alert(
                      'Verification Email Sent',
                      'Please check your email inbox and follow the link to verify your account.'
                    );
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert('Login Failed', `An error occurred: ${error.message || 'Unknown error'}`);
        }
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
          {isOffline && (
            <View style={styles.offlineNotice}>
              <Ionicons name="cloud-offline" size={20} color="#FF9800" />
              <Text style={styles.offlineText}>
                You are currently offline. You can sign in with your previous credentials.
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            error={errors.password}
          />
          
          <View style={styles.forgotPassword}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={isOffline}
            >
              <Text style={[
                styles.forgotPasswordText, 
                isOffline && styles.disabledText
              ]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>
          
          <Button
            title={isLoading ? "Signing in..." : "Sign In"}
            onPress={handleLogin}
            disabled={isLoading}
            style={styles.loginButton}
          />
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Register')}
              disabled={isOffline}
            >
              <Text style={[
                styles.registerLink,
                isOffline && styles.disabledText
              ]}>
                Sign Up
              </Text>
            </TouchableOpacity>
            {isOffline && (
              <Text style={styles.disabledInfo}> (requires internet)</Text>
            )}
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  loginButton: {
    marginBottom: 24,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
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
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 5,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  offlineText: {
    color: '#F57C00',
    fontSize: 12,
    marginLeft: 6,
    flexShrink: 1,
    textAlign: 'center',
  },
  disabledText: {
    color: '#BDBDBD',
  },
  disabledInfo: {
    color: '#BDBDBD',
    fontSize: 14,
  },
});

export default LoginScreen; 