import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Image
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppColors } from '../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TopNavBar } from '../components';
import { useActivePet } from '../hooks/useActivePet';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Pet } from '../types/components';

const { width } = Dimensions.get('window');

type FullAnalyticsScreenProps = NativeStackScreenProps<RootStackParamList, 'FullAnalytics'>;

interface AnalyticsMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: string;
}

interface AnalyticsChart {
  id: string;
  title: string;
  data: number[];
  labels: string[];
  color: string;
  unit: string;
  description: string;
}

interface HealthInsight {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const FullAnalytics: React.FC<FullAnalyticsScreenProps> = ({ navigation }) => {
  const { colors } = useAppColors();
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'insights'>('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'year'>('month');
  
  // Use the same dummy pet as in Home screen for consistency
  const dummyPet: Pet = {
    id: '1',
    name: 'Max',
    type: 'dog',
    breed: 'Golden Retriever',
    birthDate: new Date(2021, 5, 15),
    gender: 'male',
    weight: 24.5,
    weightUnit: 'kg',
    microchipped: true,
    microchipId: 'CHIP123456',
    neutered: true,
    color: 'Golden',
    image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-4.0.3',
    medicalConditions: [],
    allergies: [],
    status: 'healthy'
  };

  const analyticsMetrics: AnalyticsMetric[] = [
    {
      id: '1',
      title: 'Weight',
      value: '24.5 kg',
      change: '+0.2 kg',
      trend: 'up',
      color: '#4F46E5',
      icon: 'scale-outline'
    },
    {
      id: '2',
      title: 'Vaccination Status',
      value: 'Up to date',
      change: 'On schedule',
      trend: 'stable',
      color: '#10B981',
      icon: 'shield-checkmark-outline'
    },
    {
      id: '3',
      title: 'Medication Adherence',
      value: '92%',
      change: '+3%',
      trend: 'up',
      color: '#F59E0B',
      icon: 'medical-outline'
    },
    {
      id: '4',
      title: 'Vet Visits',
      value: '3',
      change: '-1',
      trend: 'down',
      color: '#EF4444',
      icon: 'medkit-outline'
    }
  ];

  const analyticsCharts: AnalyticsChart[] = [
    {
      id: '1',
      title: 'Weight Trend',
      data: [24.1, 24.2, 24.3, 24.4, 24.5, 24.4, 24.5],
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      color: '#4F46E5',
      unit: 'kg',
      description: 'Weight has remained stable with a slight increase over the past 6 months.'
    },
    {
      id: '2',
      title: 'Medication Adherence',
      data: [85, 87, 89, 90, 92, 91, 93],
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      color: '#F59E0B',
      unit: '%',
      description: 'Medication adherence has improved significantly, reaching 93% in July.'
    },
    {
      id: '3',
      title: 'Vet Visits',
      data: [5, 4, 4, 3, 3, 2, 2],
      labels: ['2020', '2021', '2022', '2023', '2024 Q1', '2024 Q2', '2024 Q3'],
      color: '#EF4444',
      unit: '',
      description: 'Vet visits have decreased over time, indicating improved health.'
    },
    {
      id: '4',
      title: 'Activity Level',
      data: [70, 75, 80, 82, 85, 88, 90],
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      color: '#10B981',
      unit: '%',
      description: 'Activity level has steadily increased, reaching 90% in July.'
    }
  ];

  const healthInsights: HealthInsight[] = [
    {
      id: '1',
      title: 'Weight Management',
      description: 'Your pet\'s weight is within the healthy range. Continue the current diet and exercise routine.',
      icon: 'scale-outline',
      color: '#4F46E5'
    },
    {
      id: '2',
      title: 'Medication Success',
      description: 'Excellent medication adherence (93%) indicates successful treatment plan.',
      icon: 'medical-outline',
      color: '#F59E0B'
    },
    {
      id: '3',
      title: 'Reduced Vet Visits',
      description: 'Decrease in vet visits suggests improved overall health and preventive care effectiveness.',
      icon: 'medkit-outline',
      color: '#EF4444'
    },
    {
      id: '4',
      title: 'Increased Activity',
      description: 'Activity level has improved by 20% since January, contributing to better health.',
      icon: 'fitness-outline',
      color: '#10B981'
    }
  ];

  const renderChart = (chart: AnalyticsChart) => {
    const maxValue = Math.max(...chart.data);
    const minValue = Math.min(...chart.data);
    const range = maxValue - minValue;
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>{chart.title}</Text>
          <Text style={[styles.chartDescription, { color: colors.text + '80' }]}>{chart.description}</Text>
        </View>
        
        <View style={styles.chartContent}>
          {chart.data.map((value, index) => {
            const height = range > 0 
              ? ((value - minValue) / range) * 100 
              : 50;
            
            return (
              <View key={index} style={styles.chartBarContainer}>
                <View 
                  style={[
                    styles.chartBar, 
                    { 
                      height, 
                      backgroundColor: chart.color,
                      opacity: 0.7 + (index / chart.data.length) * 0.3
                    }
                  ]} 
                />
                <Text style={styles.chartLabel}>{chart.labels[index]}</Text>
                <Text style={[styles.chartValue, { color: chart.color }]}>
                  {value}{chart.unit}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <View style={styles.metricsContainer}>
              {analyticsMetrics.map(metric => (
                <View key={metric.id} style={[styles.metricCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.metricIconContainer, { backgroundColor: metric.color + '15' }]}>
                    <Ionicons name={metric.icon as any} size={24} color={metric.color} />
                  </View>
                  <Text style={[styles.metricName, { color: colors.text + '80' }]}>{metric.title}</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{metric.value}</Text>
                  <View style={[
                    styles.trendContainer, 
                    { 
                      backgroundColor: 
                        metric.trend === 'up' ? colors.success + '20' : 
                        metric.trend === 'down' ? colors.error + '20' : 
                        colors.text + '20'
                    }
                  ]}>
                    <Ionicons 
                      name={
                        metric.trend === 'up' ? 'arrow-up' : 
                        metric.trend === 'down' ? 'arrow-down' : 'remove'
                      } 
                      size={12} 
                      color={
                        metric.trend === 'up' ? colors.success : 
                        metric.trend === 'down' ? colors.error : 
                        colors.text + '80'
                      } 
                    />
                    <Text style={[
                      styles.trendText, 
                      { 
                        color: 
                          metric.trend === 'up' ? colors.success : 
                          metric.trend === 'down' ? colors.error : 
                          colors.text + '80'
                      }
                    ]}>
                      {metric.change}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.chartsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Metrics</Text>
              {analyticsCharts.slice(0, 2).map(chart => (
                <View key={chart.id} style={[styles.chartCard, { backgroundColor: colors.card }]}>
                  {renderChart(chart)}
                </View>
              ))}
            </View>

            <View style={styles.insightsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Health Insights</Text>
              {healthInsights.slice(0, 2).map(insight => (
                <View key={insight.id} style={[styles.insightCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.insightIconContainer, { backgroundColor: insight.color + '15' }]}>
                    <Ionicons name={insight.icon as any} size={24} color={insight.color} />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={[styles.insightTitle, { color: colors.text }]}>{insight.title}</Text>
                    <Text style={[styles.insightDescription, { color: colors.text + '80' }]}>
                      {insight.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        );
      case 'trends':
        return (
          <>
            <View style={styles.timeRangeSelector}>
              <TouchableOpacity 
                style={[
                  styles.timeRangeButton, 
                  selectedTimeRange === 'week' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedTimeRange('week')}
              >
                <Text style={[
                  styles.timeRangeText, 
                  { color: selectedTimeRange === 'week' ? 'white' : colors.text }
                ]}>
                  Week
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.timeRangeButton, 
                  selectedTimeRange === 'month' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedTimeRange('month')}
              >
                <Text style={[
                  styles.timeRangeText, 
                  { color: selectedTimeRange === 'month' ? 'white' : colors.text }
                ]}>
                  Month
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.timeRangeButton, 
                  selectedTimeRange === 'year' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedTimeRange('year')}
              >
                <Text style={[
                  styles.timeRangeText, 
                  { color: selectedTimeRange === 'year' ? 'white' : colors.text }
                ]}>
                  Year
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chartsContainer}>
              {analyticsCharts.map(chart => (
                <View key={chart.id} style={[styles.chartCard, { backgroundColor: colors.card }]}>
                  {renderChart(chart)}
                </View>
              ))}
            </View>
          </>
        );
      case 'insights':
        return (
          <>
            <View style={styles.insightsContainer}>
              {healthInsights.map(insight => (
                <View key={insight.id} style={[styles.insightCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.insightIconContainer, { backgroundColor: insight.color + '15' }]}>
                    <Ionicons name={insight.icon as any} size={24} color={insight.color} />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={[styles.insightTitle, { color: colors.text }]}>{insight.title}</Text>
                    <Text style={[styles.insightDescription, { color: colors.text + '80' }]}>
                      {insight.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavBar 
        title="Health Analytics" 
        showBackButton 
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        <LinearGradient
          colors={[colors.primary + '20', colors.secondary + '20', 'transparent']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <View style={styles.petInfoContainer}>
              <Image 
                source={{ uri: dummyPet.image }} 
                style={styles.petImage} 
                resizeMode="cover"
              />
              <View style={styles.petInfo}>
                <Text style={[styles.petName, { color: colors.text }]}>{dummyPet.name}</Text>
                <Text style={[styles.petType, { color: colors.text + '80' }]}>{dummyPet.type}</Text>
                <View style={[styles.healthStatusContainer, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={[styles.healthStatus, { color: colors.success }]}>{dummyPet.status}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]} 
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons 
              name="stats-chart-outline" 
              size={20} 
              color={activeTab === 'overview' ? colors.primary : colors.text + '60'} 
            />
            <Text style={[styles.tabText, activeTab === 'overview' && { color: colors.primary }]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'trends' && styles.activeTab]} 
            onPress={() => setActiveTab('trends')}
          >
            <Ionicons 
              name="trending-up-outline" 
              size={20} 
              color={activeTab === 'trends' ? colors.primary : colors.text + '60'} 
            />
            <Text style={[styles.tabText, activeTab === 'trends' && { color: colors.primary }]}>
              Trends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'insights' && styles.activeTab]} 
            onPress={() => setActiveTab('insights')}
          >
            <Ionicons 
              name="bulb-outline" 
              size={20} 
              color={activeTab === 'insights' ? colors.primary : colors.text + '60'} 
            />
            <Text style={[styles.tabText, activeTab === 'insights' && { color: colors.primary }]}>
              Insights
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {renderTabContent()}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    marginTop: 10,
  },
  petInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'white',
  },
  petInfo: {
    marginLeft: 16,
  },
  petName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  petType: {
    fontSize: 16,
    marginTop: 2,
  },
  healthStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  healthStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  tabs: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  content: {
    paddingHorizontal: 20,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    width: width / 2 - 28,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricName: {
    fontSize: 14,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartsContainer: {
    marginBottom: 24,
  },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  chartContainer: {
    width: '100%',
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  chartDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  chartContent: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartBarContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#64748B',
  },
  chartValue: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  insightsContainer: {
    marginBottom: 24,
  },
  insightCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  insightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default FullAnalytics; 