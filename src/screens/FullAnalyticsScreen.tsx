import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';

type FullAnalyticsScreenProps = NativeStackScreenProps<MainStackParamList, 'FullAnalytics'>;

const FullAnalyticsScreen: React.FC<FullAnalyticsScreenProps> = ({ route, navigation }) => {
  const { petId } = route.params;
  const { colors } = useAppColors();

  // This would come from a real API/database in a full implementation
  const petData = {
    id: petId,
    name: petId === '1' ? 'Max' : 'Luna',
    species: petId === '1' ? 'Dog' : 'Cat',
    breed: petId === '1' ? 'Golden Retriever' : 'Siamese',
  };

  const analyticsCategories = [
    {
      title: 'Health Trends',
      icon: 'medkit-outline',
      data: [
        { label: 'Weight', value: petId === '1' ? '30.2 kg' : '4.1 kg', trend: 'stable' },
        { label: 'Checkups', value: '3 this year', trend: 'good' },
        { label: 'Medications', value: '1 active', trend: 'neutral' },
      ]
    },
    {
      title: 'Activity',
      icon: 'footsteps-outline',
      data: [
        { label: 'Daily Average', value: petId === '1' ? '45 min' : '30 min', trend: 'up' },
        { label: 'Last Week', value: petId === '1' ? '5 hours' : '3.5 hours', trend: 'up' },
        { label: 'Type', value: petId === '1' ? 'Walking, Playing' : 'Playing', trend: 'neutral' },
      ]
    },
    {
      title: 'Nutrition',
      icon: 'restaurant-outline',
      data: [
        { label: 'Daily Calories', value: petId === '1' ? '1,200 kcal' : '250 kcal', trend: 'stable' },
        { label: 'Meals', value: '3 per day', trend: 'neutral' },
        { label: 'Water', value: petId === '1' ? '500 ml/day' : '150 ml/day', trend: 'down' },
      ]
    },
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <Ionicons name="arrow-up" size={16} color="#4CAF50" />;
      case 'down':
        return <Ionicons name="arrow-down" size={16} color="#F44336" />;
      case 'stable':
        return <Ionicons name="remove" size={16} color="#FFB300" />;
      case 'good':
        return <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />;
      default:
        return <Ionicons name="ellipse" size={16} color="#9E9E9E" />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{petData.name}'s Analytics</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Overall Health Status</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.statusText, { color: colors.text }]}>Excellent</Text>
          </View>
          <Text style={[styles.summaryDescription, { color: colors.text + 'CC' }]}>
            {petData.name} is in excellent health based on recent activity, nutrition, and medical checkups.
          </Text>
        </View>

        {analyticsCategories.map((category, index) => (
          <View key={index} style={[styles.categoryCard, { backgroundColor: colors.card }]}>
            <View style={styles.categoryHeader}>
              <Ionicons name={category.icon as any} size={24} color={colors.primary} />
              <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.title}</Text>
            </View>
            
            <View style={styles.dataContainer}>
              {category.data.map((item, i) => (
                <View key={i} style={styles.dataRow}>
                  <Text style={[styles.dataLabel, { color: colors.text + 'CC' }]}>{item.label}</Text>
                  <View style={styles.dataValueContainer}>
                    {getTrendIcon(item.trend)}
                    <Text style={[styles.dataValue, { color: colors.text }]}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={[styles.exportButton, { backgroundColor: colors.primary }]}>
          <Ionicons name="download-outline" size={18} color="#fff" style={styles.exportIcon} />
          <Text style={styles.exportText}>Export Report</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  categoryCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  dataContainer: {
    marginLeft: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dataLabel: {
    fontSize: 14,
  },
  dataValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 30,
  },
  exportIcon: {
    marginRight: 8,
  },
  exportText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FullAnalyticsScreen; 