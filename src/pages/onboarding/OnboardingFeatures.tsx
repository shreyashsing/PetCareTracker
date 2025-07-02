import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  TouchableOpacity,
  Animated,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import OnboardingManager from '../../utils/onboardingManager';

// Safe haptics import with fallback
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (error) {
  console.log('Haptics not available, continuing without haptic feedback');
}

// Safe haptic feedback function
const triggerHaptic = (type: 'light' | 'medium' | 'success') => {
  if (!Haptics) return;
  
  try {
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
    }
  } catch (error) {
    console.log('Haptic feedback failed:', error);
  }
};

const { width, height } = Dimensions.get('window');

interface Feature {
  title: string;
  description: string;
  detailedDescription: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: readonly [string, string];
  benefits: string[];
}

type OnboardingFeaturesNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OnboardingFeatures'>;

const features: Feature[] = [
  {
    title: 'Health & Wellness Tracking',
    description: 'Complete health management for your pets',
    detailedDescription: 'Keep comprehensive health records including vaccinations, medications, vet visits, and medical history.',
    icon: 'medical',
    color: '#4CAF50',
    gradient: ['#81C784', '#4CAF50'] as const,
    benefits: [
      'Track vaccinations & boosters',
      'Medication scheduling & reminders',
      'Vet appointment management',
      'Medical history timeline'
    ]
  },
  {
    title: 'Smart Feeding Management',
    description: 'Intelligent nutrition and feeding schedules',
    detailedDescription: 'Monitor feeding times, portions, and nutrition to keep your pet healthy and maintain optimal weight.',
    icon: 'restaurant',
    color: '#FF9800',
    gradient: ['#FFB74D', '#FF9800'] as const,
    benefits: [
      'Feeding schedule optimization',
      'Portion control guidance',
      'Food inventory tracking',
      'Weight monitoring'
    ]
  },
  {
    title: 'Activity & Exercise Tracking',
    description: 'Monitor daily activities and exercise',
    detailedDescription: 'Track walks, playtime, and activities to ensure your pet stays active and healthy.',
    icon: 'fitness',
    color: '#2196F3',
    gradient: ['#64B5F6', '#2196F3'] as const,
    benefits: [
      'Daily activity logging',
      'Exercise goal setting',
      'Activity duration tracking',
      'Health insights'
    ]
  },
  {
    title: 'Smart Notifications',
    description: 'Never miss important pet care tasks',
    detailedDescription: 'Intelligent reminders for medications, appointments, feeding times, and health checkups.',
    icon: 'notifications',
    color: '#9C27B0',
    gradient: ['#BA68C8', '#9C27B0'] as const,
    benefits: [
      'Medication reminders',
      'Appointment notifications',
      'Feeding time alerts',
      'Health checkup reminders'
    ]
  },
  {
    title: 'AI Pet Assistant',
    description: 'Get expert advice and insights',
    detailedDescription: 'Chat with our AI assistant for personalized pet care advice, health insights, and emergency guidance.',
    icon: 'chatbubbles',
    color: '#FF5722',
    gradient: ['#FF8A65', '#FF5722'] as const,
    benefits: [
      '24/7 pet care advice',
      'Health symptom analysis',
      'Emergency guidance',
      'Personalized recommendations'
    ]
  },
  {
    title: 'Multi-Pet Management',
    description: 'Manage all your pets in one place',
    detailedDescription: 'Easily switch between multiple pets and manage their individual care routines efficiently.',
    icon: 'paw',
    color: '#607D8B',
    gradient: ['#90A4AE', '#607D8B'] as const,
    benefits: [
      'Multiple pet profiles',
      'Individual care plans',
      'Unified dashboard',
      'Family pet sharing'
    ]
  }
];

export const OnboardingFeatures: React.FC = () => {
  const navigation = useNavigation<OnboardingFeaturesNavigationProp>();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const pageTransitionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    // Update progress animation
    Animated.timing(progressAnim, {
      toValue: currentPage / (features.length - 1),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentPage]);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const page = Math.round(contentOffset / width);
    
    if (page !== currentPage) {
      setCurrentPage(page);
      // Haptic feedback on page change
      triggerHaptic('light');
      
      // Page transition animation
      Animated.sequence([
        Animated.timing(pageTransitionAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pageTransitionAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  const handleComplete = async () => {
    try {
      // Button press animation
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        })
      ]).start();

      // Haptic feedback
      triggerHaptic('success');
      
      // Mark onboarding as completed
      await OnboardingManager.markOnboardingCompleted();
      console.log('Onboarding completed by user');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      navigation.navigate('Login');
    }
  };

  const handleSkip = async () => {
    try {
      // Haptic feedback
      triggerHaptic('medium');
      
      await OnboardingManager.markOnboardingCompleted();
      console.log('Onboarding skipped by user');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      navigation.navigate('Login');
    }
  };

  const nextPage = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();

    // Haptic feedback
    triggerHaptic('light');

    if (currentPage < features.length - 1) {
      const nextPageIndex = currentPage + 1;
      scrollViewRef.current?.scrollTo({ x: nextPageIndex * width, animated: true });
      setCurrentPage(nextPageIndex);
    } else {
      handleComplete();
    }
  };

  const previousPage = () => {
    // Haptic feedback
    triggerHaptic('light');
    
    if (currentPage > 0) {
      const prevPageIndex = currentPage - 1;
      scrollViewRef.current?.scrollTo({ x: prevPageIndex * width, animated: true });
      setCurrentPage(prevPageIndex);
    }
  };

  const goToPage = (pageIndex: number) => {
    // Haptic feedback
    triggerHaptic('light');
    
    scrollViewRef.current?.scrollTo({ x: pageIndex * width, animated: true });
    setCurrentPage(pageIndex);
  };

  const renderFeature = (feature: Feature, index: number) => (
    <View key={index} style={[styles.featureContainer, { width }]}>
      <LinearGradient
        colors={feature.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featureGradient}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Feature Icon with enhanced animation */}
        <Animated.View 
          style={[
            styles.featureIconContainer,
            {
              transform: [
                { 
                  scale: pageTransitionAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1]
                  })
                }
              ]
            }
          ]}
        >
          <View style={[styles.featureIconWrapper, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
            <Ionicons name={feature.icon} size={60} color="white" />
          </View>
        </Animated.View>

        {/* Feature Content */}
        <Animated.View 
          style={[
            styles.featureContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>
          <Text style={styles.featureDetailedDescription}>{feature.detailedDescription}</Text>

          {/* Benefits List with staggered animation */}
          <View style={styles.benefitsContainer}>
            {feature.benefits.map((benefit, benefitIndex) => (
              <Animated.View 
                key={benefitIndex} 
                style={[
                  styles.benefitItem,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { 
                        translateX: slideAnim.interpolate({
                          inputRange: [0, 50],
                          outputRange: [0, 30 * (benefitIndex + 1)]
                        })
                      }
                    ]
                  }
                ]}
              >
                <View style={styles.benefitBullet}>
                  <Ionicons name="checkmark" size={14} color="white" />
                </View>
                <Text style={styles.benefitText}>{benefit}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Decorative Elements */}
        <View style={styles.decorativeElements}>
          <View style={[styles.decorativeCircle, styles.circle1]} />
          <View style={[styles.decorativeCircle, styles.circle2]} />
          <View style={[styles.decorativeCircle, styles.circle3]} />
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Skip Button with enhanced styling */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <View style={styles.skipButtonInner}>
          <Text style={styles.skipText}>Skip</Text>
        </View>
      </TouchableOpacity>

      {/* Features ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContainer}
      >
        {features.map((feature, index) => renderFeature(feature, index))}
      </ScrollView>

      {/* Enhanced Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <View style={styles.navigationContent}>
          {/* Enhanced Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentPage + 1} of {features.length}
            </Text>
          </View>

          {/* Interactive Page Indicators */}
          <View style={styles.pageIndicators}>
            {features.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pageIndicator,
                  index === currentPage && styles.activePageIndicator,
                  index < currentPage && styles.completedPageIndicator
                ]}
                onPress={() => goToPage(index)}
              >
                {index < currentPage && (
                  <Ionicons name="checkmark" size={12} color="white" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Enhanced Navigation Buttons */}
          <View style={styles.navigationButtons}>
            {currentPage > 0 && (
              <TouchableOpacity style={styles.backButton} onPress={previousPage}>
                <Ionicons name="chevron-back" size={24} color="#666" />
              </TouchableOpacity>
            )}
            
            <View style={styles.centerContent}>
              <View style={styles.featureCounter}>
                <Text style={styles.counterText}>{features[currentPage].title}</Text>
              </View>
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
              <TouchableOpacity 
                style={[styles.nextButton]} 
                onPress={nextPage}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={currentPage === features.length - 1 ? ['#4CAF50', '#2E7D32'] : ['#2196F3', '#1565C0']}
                  style={styles.nextButtonGradient}
                >
                  {currentPage === features.length - 1 ? (
                    <>
                      <Text style={styles.nextButtonText}>Get Started</Text>
                      <Ionicons name="rocket" size={20} color="white" style={{ marginLeft: 8 }} />
                    </>
                  ) : (
                    <>
                      <Text style={styles.nextButtonText}>Next</Text>
                      <Ionicons name="chevron-forward" size={20} color="white" style={{ marginLeft: 5 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 100,
  },
  skipButtonInner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContainer: {
    flexDirection: 'row',
  },
  featureContainer: {
    flex: 1,
  },
  featureGradient: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 120,
    paddingBottom: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  featureIconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  featureIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
  featureContent: {
    flex: 1,
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featureDescription: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  featureDetailedDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  benefitsContainer: {
    width: '100%',
    maxWidth: 320,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  benefitBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -100,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: -75,
    left: -75,
  },
  circle3: {
    width: 100,
    height: 100,
    top: '40%',
    right: -50,
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navigationContent: {
    paddingHorizontal: 25,
    paddingVertical: 25,
    paddingBottom: 35,
  },
  progressBarContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  pageIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePageIndicator: {
    backgroundColor: '#2196F3',
    width: 28,
    borderRadius: 6,
  },
  completedPageIndicator: {
    backgroundColor: '#4CAF50',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  featureCounter: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    textAlign: 'center',
  },
  nextButton: {
    borderRadius: 28,
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
  nextButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 140,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
}); 