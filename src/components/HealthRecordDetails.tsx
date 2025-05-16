import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '../hooks/useAppColors';
import { HealthRecord } from '../types/components';
import {unifiedDatabaseManager} from "../services/db";
import { formatDate } from '../utils/helpers';

interface HealthRecordDetailsProps {
  record: HealthRecord | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (record: HealthRecord) => void;
  onDelete: (record: HealthRecord) => void;
  onRefresh: () => void;
}

export const HealthRecordDetails: React.FC<HealthRecordDetailsProps> = ({ 
  record, 
  visible, 
  onClose,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const { colors } = useAppColors();

  if (!record) return null;
  
  const handleEdit = () => {
    onEdit(record);
  };
  
  const handleDelete = () => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this health record? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await unifiedDatabaseManager.healthRecords.delete(record.id);
              onRefresh();
              onClose();
              Alert.alert('Success', 'Health record deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete health record');
              console.error('Error deleting health record:', error);
            }
          }
        }
      ]
    );
  };
  
  const getRecordIcon = (type: string) => {
    const recordType = type.toLowerCase();
    if (recordType === 'vaccination') return '💉';
    if (recordType === 'surgery') return '🔪';
    if (recordType === 'dental') return '🦷';
    if (recordType === 'emergency') return '🚑';
    return '🩺';
  };
  
  const getRecordTypeColor = (type: string) => {
    const recordType = type.toLowerCase();
    if (recordType === 'vaccination') return '#4F46E5';
    if (recordType === 'checkup') return '#10B981';
    if (recordType === 'surgery') return '#EF4444';
    if (recordType === 'dental') return '#6366F1';
    return colors.primary;
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleContainer}>
              <View style={[
                styles.recordIconContainer, 
                { backgroundColor: getRecordTypeColor(record.type) + '15' }
              ]}>
                <Text style={styles.recordIcon}>{getRecordIcon(record.type)}</Text>
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {record.title}
              </Text>
            </View>
            
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Type:</Text>
                <View style={styles.typeContainer}>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                  </Text>
                  <View style={[
                    styles.typeIndicator, 
                    { backgroundColor: getRecordTypeColor(record.type) }
                  ]} />
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Date:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatDate(record.date)}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Status:</Text>
                <Text style={[
                  styles.infoValue, 
                  styles.statusText,
                  { 
                    color: 
                      record.status === 'completed' ? '#10B981' :
                      record.status === 'scheduled' ? '#6366F1' : '#F59E0B'
                  }
                ]}>
                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </Text>
              </View>
            </View>
            
            {record.description && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                </View>
                <Text style={[styles.description, { color: colors.text }]}>
                  {record.description}
                </Text>
              </View>
            )}
            
            {record.provider && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="medkit-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Healthcare Provider</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Name:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {record.provider.name || 'Not specified'}
                  </Text>
                </View>
                
                {record.provider.specialty && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Specialty:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {record.provider.specialty}
                    </Text>
                  </View>
                )}
                
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Clinic:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {record.provider.clinic || 'Not specified'}
                  </Text>
                </View>
                
                {record.provider.phone && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Phone:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {record.provider.phone}
                    </Text>
                  </View>
                )}
                
                {record.provider.email && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Email:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {record.provider.email}
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {record.followUpNeeded && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Follow-up</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Follow-up Date:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {record.followUpDate ? formatDate(record.followUpDate) : 'Not specified'}
                  </Text>
                </View>
              </View>
            )}
            
            {record.labResults && record.labResults.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="flask-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Lab Results</Text>
                </View>
                
                {record.labResults.map((result, index) => (
                  <View key={index} style={styles.labResult}>
                    <View style={styles.labResultHeader}>
                      <Text style={[styles.labResultName, { color: colors.text }]}>
                        {result.name}
                      </Text>
                      <Text style={[styles.labResultValue, { color: colors.primary }]}>
                        {result.value} {result.unit}
                      </Text>
                    </View>
                    
                    {result.normalRange && (
                      <Text style={[styles.labResultRange, { color: colors.text + '70' }]}>
                        Normal range: {result.normalRange}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            {record.symptoms && record.symptoms.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="thermometer-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Symptoms</Text>
                </View>
                <View style={styles.tagContainer}>
                  {record.symptoms.map((symptom, index) => (
                    <View 
                      key={index} 
                      style={[styles.tag, { backgroundColor: colors.primary + '20' }]}
                    >
                      <Text style={[styles.tagText, { color: colors.primary }]}>
                        {symptom}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {record.diagnosis && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Diagnosis</Text>
                </View>
                <Text style={[styles.description, { color: colors.text }]}>
                  {record.diagnosis}
                </Text>
              </View>
            )}
            
            {record.treatment && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="bandage-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Treatment</Text>
                </View>
                <Text style={[styles.description, { color: colors.text }]}>
                  {record.treatment}
                </Text>
              </View>
            )}
            
            {record.medications && record.medications.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="medical-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Medications</Text>
                </View>
                
                {record.medications.map((medication, index) => (
                  <View key={index} style={[styles.medicationItem, { backgroundColor: colors.card }]}>
                    <Text style={[styles.medicationName, { color: colors.text }]}>
                      {medication.name}
                    </Text>
                    <Text style={[styles.medicationDetails, { color: colors.text + '80' }]}>
                      {medication.dosage} • {medication.frequency}
                    </Text>
                    <View style={styles.medicationDateContainer}>
                      <View style={styles.medicationDateItem}>
                        <Text style={[styles.medicationDateLabel, { color: colors.text + '70' }]}>
                          Start:
                        </Text>
                        <Text style={[styles.medicationDateValue, { color: colors.text }]}>
                          {formatDate(medication.startDate)}
                        </Text>
                      </View>
                      
                      {medication.endDate && (
                        <View style={styles.medicationDateItem}>
                          <Text style={[styles.medicationDateLabel, { color: colors.text + '70' }]}>
                            End:
                          </Text>
                          <Text style={[styles.medicationDateValue, { color: colors.text }]}>
                            {formatDate(medication.endDate)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {record.cost > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="cash-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Cost Information</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Cost:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    ${record.cost.toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Insurance Covered:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {record.insuranceCovered ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
          
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity 
              style={[styles.button, styles.deleteButton, { borderColor: '#EF4444' }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={[styles.buttonText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.editButton, { backgroundColor: colors.primary }]}
              onPress={handleEdit}
            >
              <Ionicons name="pencil-outline" size={16} color="white" />
              <Text style={[styles.buttonText, { color: 'white' }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recordIcon: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  statusText: {
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  labResult: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  labResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labResultName: {
    fontSize: 14,
    fontWeight: '500',
  },
  labResultValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  labResultRange: {
    fontSize: 12,
    marginTop: 2,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  medicationItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  medicationName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  medicationDetails: {
    fontSize: 13,
    marginBottom: 6,
  },
  medicationDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  medicationDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationDateLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  medicationDateValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 0.48,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  deleteButton: {
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: '#4A90E2',
  },
});

export default HealthRecordDetails; 