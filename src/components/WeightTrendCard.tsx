import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '../hooks/useAppColors';
import { Pet, WeightRecord } from '../types/components';

interface WeightTrendCardProps {
  pet: Pet;
  weightRecords: WeightRecord[];
  onPress: () => void;
}

interface WeightTrend {
  direction: 'up' | 'down' | 'stable';
  change: number;
  changePercent: number;
}

const WeightTrendCard: React.FC<WeightTrendCardProps> = ({ pet, weightRecords, onPress }) => {
  const { colors } = useAppColors();

  // Calculate weight trend
  const calculateWeightTrend = (): WeightTrend => {
    if (weightRecords.length < 2) {
      return {
        direction: 'stable',
        change: 0,
        changePercent: 0
      };
    }

    // Sort by date (newest first)
    const sortedRecords = [...weightRecords].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const currentWeight = sortedRecords[0].weight;
    const previousWeight = sortedRecords[1].weight;
    const change = currentWeight - previousWeight;
    const changePercent = (change / previousWeight) * 100;

    let direction: 'up' | 'down' | 'stable' = 'stable';
    
    if (Math.abs(change) > 0.1) {
      direction = change > 0 ? 'up' : 'down';
    }

    return {
      direction,
      change,
      changePercent
    };
  };

  const weightTrend = calculateWeightTrend();

  const getTrendIcon = () => {
    switch (weightTrend.direction) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = () => {
    switch (weightTrend.direction) {
      case 'up':
        return '#f59e0b'; // Orange for weight gain
      case 'down':
        return '#3b82f6'; // Blue for weight loss
      default:
        return colors.text + '60'; // Gray for stable
    }
  };

  const getTrendText = () => {
    if (weightTrend.direction === 'stable') {
      return 'Stable';
    }
    
    const sign = weightTrend.change > 0 ? '+' : '';
    return `${sign}${weightTrend.change.toFixed(1)} ${pet.weightUnit}`;
  };

  const getLastWeighedText = () => {
    if (weightRecords.length === 0) {
      return 'No weight records';
    }

    const lastRecord = weightRecords.reduce((latest, current) => 
      new Date(current.date) > new Date(latest.date) ? current : latest
    );

    const lastWeighedDate = new Date(lastRecord.date);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - lastWeighedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Weighed today';
    } else if (diffInDays === 1) {
      return 'Weighed yesterday';
    } else if (diffInDays < 7) {
      return `Weighed ${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `Weighed ${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      const months = Math.floor(diffInDays / 30);
      return `Weighed ${months} month${months > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="scale-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Weight</Text>
          <Text style={[styles.subtitle, { color: colors.text + '60' }]}>
            {getLastWeighedText()}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text + '40'} />
      </View>

      <View style={styles.weightDisplay}>
        <View style={styles.currentWeight}>
          <Text style={[styles.weightValue, { color: colors.text }]}>
            {pet.weight}
          </Text>
          <Text style={[styles.weightUnit, { color: colors.text + '80' }]}>
            {pet.weightUnit}
          </Text>
        </View>

        <View style={styles.trendDisplay}>
          <View style={[styles.trendIndicator, { backgroundColor: getTrendColor() + '15' }]}>
            <Ionicons 
              name={getTrendIcon()} 
              size={16} 
              color={getTrendColor()} 
            />
            <Text style={[styles.trendText, { color: getTrendColor() }]}>
              {getTrendText()}
            </Text>
          </View>
        </View>
      </View>

      {weightRecords.length > 1 && (
        <View style={styles.changeDisplay}>
          <Text style={[styles.changeText, { color: colors.text + '60' }]}>
            {Math.abs(weightTrend.changePercent) > 0.1 && (
              `${weightTrend.changePercent > 0 ? '+' : ''}${weightTrend.changePercent.toFixed(1)}% from last measurement`
            )}
            {Math.abs(weightTrend.changePercent) <= 0.1 && 'No significant change'}
          </Text>
        </View>
      )}

      {weightRecords.length > 0 && (
        <View style={styles.actionHint}>
          <Text style={[styles.actionText, { color: colors.primary }]}>
            Tap to view weight trend & add new measurement
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  currentWeight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  weightValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  weightUnit: {
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '500',
  },
  trendDisplay: {
    alignItems: 'flex-end',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  changeDisplay: {
    marginBottom: 8,
  },
  changeText: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionHint: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default WeightTrendCard; 