import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAppColors } from '../hooks/useAppColors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';

type SettingsScreenProps = NativeStackScreenProps<MainStackParamList, 'Settings'>;

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { logout, user } = useAuth();
  const { colors } = useAppColors();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const settings = [
    {
      title: 'Account',
      items: [
        { label: 'Profile', icon: 'person-outline', action: () => {} },
        { label: 'Notifications', icon: 'notifications-outline', action: () => {} },
        { label: 'Privacy', icon: 'shield-outline', action: () => {} },
      ]
    },
    {
      title: 'App Settings',
      items: [
        { label: 'Theme', icon: 'color-palette-outline', action: () => {} },
        { label: 'Language', icon: 'language-outline', action: () => {} },
        { label: 'Units', icon: 'options-outline', action: () => {} },
      ]
    },
    {
      title: 'Support',
      items: [
        { label: 'Help Center', icon: 'help-circle-outline', action: () => {} },
        { label: 'Contact Us', icon: 'mail-outline', action: () => {} },
        { label: 'About', icon: 'information-circle-outline', action: () => {} },
      ]
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>{user?.displayName?.[0] || 'U'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.displayName || 'User'}</Text>
            <Text style={[styles.userEmail, { color: colors.text + 'CC' }]}>{user?.email}</Text>
          </View>
        </View>

        {settings.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{section.title}</Text>
            
            <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
              {section.items.map((item, j) => (
                <TouchableOpacity 
                  key={j}
                  style={[
                    styles.settingItem, 
                    j < section.items.length - 1 && [styles.settingItemBorder, { borderBottomColor: colors.border }]
                  ]}
                  onPress={item.action}
                >
                  <View style={styles.settingItemContent}>
                    <Ionicons name={item.icon as any} size={22} color={colors.primary} style={styles.settingIcon} />
                    <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text + '99'} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.error }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Log Out</Text>
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
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 10,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  settingsCard: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 30,
    marginTop: 10,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen; 