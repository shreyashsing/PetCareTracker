import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  ScrollView, 
  TouchableOpacity,
  Animated,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '../../hooks/useAppColors';

const { width, height } = Dimensions.get('window');

type OnboardingScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;

export const Onboarding: React.FC = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const { colors } = useAppColors();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pawAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;

  useEffect(() => {
    // Main content animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    ]).start();

    // Floating paw prints animation
    const animatePaws = () => {
      pawAnimations.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000 + (index * 500),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 2000 + (index * 500),
              useNativeDriver: true,
            })
          ])
        ).start();
      });
    };

    const timer = setTimeout(animatePaws, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('OnboardingFeatures');
  };

  const handleSkip = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      {/* Floating Background Elements */}
      <View style={styles.backgroundElements}>
        {pawAnimations.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.floatingPaw,
              {
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, -50]
                    })
                  },
                  {
                    rotate: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }
                ],
                left: (index % 2) * (width * 0.7) + (width * 0.1),
                top: (Math.floor(index / 2)) * (height * 0.3) + (height * 0.2),
              }
            ]}
          >
            <Ionicons name="paw" size={30} color="rgba(255, 255, 255, 0.1)" />
          </Animated.View>
        ))}
      </View>

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                style={styles.logoGradient}
              >
                <View style={styles.logoInner}>
                  <Ionicons name="heart" size={40} color="#FF6B9D" />
                  <Ionicons name="paw" size={35} color="#4ECDC4" style={styles.pawOverlay} />
                </View>
              </LinearGradient>
            </View>
        </View>

          {/* Main Content */}
          <View style={styles.textSection}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.title}>Pet Care Tracker</Text>
        <Text style={styles.subtitle}>
              Your comprehensive companion for keeping your furry, feathered, and scaled friends happy and healthy
        </Text>

            {/* Feature Highlights */}
            <View style={styles.highlightsContainer}>
              <View style={styles.highlight}>
                <View style={[styles.highlightIcon, { backgroundColor: 'rgba(76, 175, 80, 0.2)' }]}>
                  <Ionicons name="heart-half" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.highlightText}>Health Tracking</Text>
              </View>
              
              <View style={styles.highlight}>
                <View style={[styles.highlightIcon, { backgroundColor: 'rgba(255, 193, 7, 0.2)' }]}>
                  <Ionicons name="restaurant" size={24} color="#FFC107" />
                </View>
                <Text style={styles.highlightText}>Smart Feeding</Text>
              </View>
              
              <View style={styles.highlight}>
                <View style={[styles.highlightIcon, { backgroundColor: 'rgba(156, 39, 176, 0.2)' }]}>
                  <Ionicons name="notifications" size={24} color="#9C27B0" />
                </View>
                <Text style={styles.highlightText}>Reminders</Text>
              </View>
            </View>
      </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Section */}
      <Animated.View 
        style={[
          styles.bottomSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF6B9D', '#C44569']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
      </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingPaw: {
    position: 'absolute',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 12,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 100,
  },
  content: {
    alignItems: 'center',
  },
  logoSection: {
    marginBottom: 50,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    padding: 3,
  },
  logoGradient: {
    flex: 1,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  pawOverlay: {
    position: 'absolute',
    bottom: 15,
    right: 15,
  },
  textSection: {
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
    marginBottom: 5,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  highlightsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  highlight: {
    alignItems: 'center',
    flex: 1,
  },
  highlightIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  highlightText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSection: {
    paddingHorizontal: 30,
    paddingBottom: 50,
    alignItems: 'center',
  },
  getStartedButton: {
    width: '100%',
    marginBottom: 30,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 5,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: 'white',
    width: 24,
  },
}); 