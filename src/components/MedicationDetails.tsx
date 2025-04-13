import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '../hooks/useAppColors';
import { Medication } from '../types/components';
import { databaseManager } from '../services/db';
import { formatDate } from '../utils/helpers';

interface MedicationDetailsProps {
  medication: Medication | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (medication: Medication) => void;
  onDelete: (medication: Medication) => void;
  onRefresh: () => void;
}

export const MedicationDetails: React.FC<MedicationDetailsProps> = ({ 
  medication, 
  visible, 
  onClose,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const { colors } = useAppColors();

  if (!medication) return null;
  
  const handleEdit = () => {
    onEdit(medication);
  };
  
  const handleDelete = () => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseManager.medications.delete(medication.id);
              onRefresh();
              onClose();
              Alert.alert('Success', 'Medication deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete medication');
              console.error('Error deleting medication:', error);
            }
          }
        }
      ]
    );
  };
  
  // Determine medication status color
  const getStatusColor = () => {
    // This is a simplified version - in a real app we'd check if medication is active, scheduled, etc.
    return '#4F46E5'; // Default to blue
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
                styles.medicationIconContainer, 
                { backgroundColor: colors.primary + '15' }
              ]}>
                <Ionicons name="medical" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {medication.name}
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
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Status:</Text>
                <Text style={[
                  styles.infoValue, 
                  styles.statusText,
                  { color: getStatusColor() }
                ]}>
                  Active
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Type:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {medication.type ? medication.type.charAt(0).toUpperCase() + medication.type.slice(1) : 'Not specified'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Dosage:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {medication.dosage.amount} {medication.dosage.unit}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Frequency:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {medication.frequency.times}x {medication.frequency.period}
                </Text>
              </View>
            </View>
            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="albums-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions</Text>
              </View>
              
              <View style={[styles.instructionsCard, { backgroundColor: colors.card }]}>
                {medication.specialInstructions ? (
                  <View style={styles.instructionItem}>
                    <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                    <Text style={[styles.instructionText, { color: colors.text }]}>
                      {medication.specialInstructions}
                    </Text>
                  </View>
                ) : null}
                
                {medication.administrationMethod ? (
                  <View style={styles.instructionItem}>
                    <Ionicons name="flask-outline" size={18} color={colors.primary} />
                    <Text style={[styles.instructionText, { color: colors.text }]}>
                      Administration: {medication.administrationMethod.charAt(0).toUpperCase() + medication.administrationMethod.slice(1)}
                    </Text>
                  </View>
                ) : null}
                
                {/* Default instructions based on medication type */}
                <View style={styles.instructionItem}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.instructionText, { color: colors.text }]}>
                    {medication.type === 'pill' && 'Take with water'}
                    {medication.type === 'liquid' && 'Shake well before use'}
                    {medication.type === 'injection' && 'Store in refrigerator'}
                    {medication.type === 'topical' && 'Apply to clean, dry skin'}
                    {medication.type === 'chewable' && 'Take with or after food'}
                    {medication.type === 'other' && 'Follow veterinarian instructions'}
                  </Text>
                </View>
                
                <View style={styles.instructionItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.instructionText, { color: colors.text }]}>
                    Store in a cool, dry place
                  </Text>
                </View>
                
                <View style={styles.instructionItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.instructionText, { color: colors.text }]}>
                    Keep out of reach of children and pets
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Side Effects</Text>
              </View>
              
              <View style={styles.sideEffectsContainer}>
                {medication.sideEffects && medication.sideEffects.length > 0 ? (
                  medication.sideEffects.map((effect, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.sideEffectTag, 
                        { 
                          backgroundColor: index % 3 === 0
                            ? colors.error + '15'
                            : index % 3 === 1
                              ? colors.warning + '15'
                              : colors.primary + '15'
                        }
                      ]}
                    >
                      <Text 
                        style={[
                          styles.sideEffectText, 
                          { 
                            color: index % 3 === 0
                              ? colors.error
                              : index % 3 === 1
                                ? colors.warning
                                : colors.primary
                          }
                        ]}
                      >
                        {effect}
                      </Text>
                    </View>
                  ))
                ) : (
                  <>
                    <View style={[styles.sideEffectTag, { backgroundColor: colors.text + '15' }]}>
                      <Text style={[styles.sideEffectText, { color: colors.text }]}>
                        Consult veterinarian for side effects
                      </Text>
                    </View>
                    
                    {/* Common side effects based on medication type */}
                    {(() => {
                      // Show type-specific side effects
                      switch(medication.type) {
                        case 'pill':
                          return (
                            <>
                              <View style={[styles.sideEffectTag, { backgroundColor: colors.warning + '15' }]}>
                                <Text style={[styles.sideEffectText, { color: colors.warning }]}>Drowsiness</Text>
                              </View>
                              <View style={[styles.sideEffectTag, { backgroundColor: colors.warning + '15' }]}>
                                <Text style={[styles.sideEffectText, { color: colors.warning }]}>Upset stomach</Text>
                              </View>
                            </>
                          );
                        case 'liquid':
                          return (
                            <>
                              <View style={[styles.sideEffectTag, { backgroundColor: colors.warning + '15' }]}>
                                <Text style={[styles.sideEffectText, { color: colors.warning }]}>Nausea</Text>
                              </View>
                              <View style={[styles.sideEffectTag, { backgroundColor: colors.warning + '15' }]}>
                                <Text style={[styles.sideEffectText, { color: colors.warning }]}>Increased thirst</Text>
                              </View>
                            </>
                          );
                        case 'injection':
                          return (
                            <>
                              <View style={[styles.sideEffectTag, { backgroundColor: colors.warning + '15' }]}>
                                <Text style={[styles.sideEffectText, { color: colors.warning }]}>Pain at injection site</Text>
                              </View>
                              <View style={[styles.sideEffectTag, { backgroundColor: colors.warning + '15' }]}>
                                <Text style={[styles.sideEffectText, { color: colors.warning }]}>Lethargy</Text>
                              </View>
                            </>
                          );
                        case 'topical':
                          return (
                            <>
                              <View style={[styles.sideEffectTag, { backgroundColor: colors.warning + '15' }]}>
                                <Text style={[styles.sideEffectText, { color: colors.warning }]}>Skin irritation</Text>
                              </View>
                              <View style={[styles.sideEffectTag, { backgroundColor: colors.warning + '15' }]}>
                                <Text style={[styles.sideEffectText, { color: colors.warning }]}>Itching</Text>
                              </View>
                            </>
                          );
                        default:
                          return null;
                      }
                    })()}
                  </>
                )}
              </View>
            </View>
            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>History</Text>
              </View>
              
              <View style={[styles.historyCard, { backgroundColor: colors.card }]}>
                {medication.history && medication.history.length > 0 ? (
                  medication.history.slice(0, 5).map((historyItem, index) => (
                    <View key={index} style={[
                      styles.historyItem,
                      index < medication.history.length - 1 && index < 4 && { borderBottomColor: colors.border, borderBottomWidth: 0.5 }
                    ]}>
                      <View style={styles.historyItemLeft}>
                        <Text style={[styles.historyDate, { color: colors.text }]}>
                          {formatDate(new Date(historyItem.date))}
                        </Text>
                        <View style={[
                          styles.historyStatus, 
                          { 
                            backgroundColor: historyItem.administered 
                              ? colors.success + '15' 
                              : historyItem.skipped 
                                ? colors.warning + '15' 
                                : colors.error + '15' 
                          }
                        ]}>
                          <Text style={[
                            styles.historyStatusText, 
                            { 
                              color: historyItem.administered 
                                ? colors.success 
                                : historyItem.skipped 
                                  ? colors.warning 
                                  : colors.error 
                            }
                          ]}>
                            {historyItem.administered ? 'Administered' : historyItem.skipped ? 'Skipped' : 'Missed'}
                          </Text>
                        </View>
                      </View>
                      
                      <Ionicons 
                        name={
                          historyItem.administered 
                            ? "checkmark-circle" 
                            : historyItem.skipped 
                              ? "alert-circle" 
                              : "close-circle"
                        } 
                        size={20} 
                        color={
                          historyItem.administered 
                            ? colors.success 
                            : historyItem.skipped 
                              ? colors.warning 
                              : colors.error
                        } 
                      />
                    </View>
                  ))
                ) : (
                  <View style={styles.noHistoryContainer}>
                    <Ionicons name="document-text-outline" size={24} color={colors.text + '40'} />
                    <Text style={[styles.noHistoryText, { color: colors.text + '70' }]}>
                      No medication history yet
                    </Text>
                  </View>
                )}
                
                {medication.history && medication.history.length > 5 && (
                  <TouchableOpacity 
                    style={[styles.viewAllHistoryButton, { borderTopColor: colors.border }]}
                    onPress={() => {
                      // In a real app, this would navigate to a full history screen
                      Alert.alert('Full History', 'This would show the complete medication history.');
                    }}
                  >
                    <Text style={[styles.viewAllHistoryText, { color: colors.primary }]}>
                      View all history ({medication.history.length} records)
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
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
  medicationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
  statusText: {
    fontWeight: '600',
  },
  instructionsCard: {
    borderRadius: 12,
    padding: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    marginLeft: 10,
  },
  sideEffectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sideEffectTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  sideEffectText: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyCard: {
    borderRadius: 12,
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 14,
    marginRight: 8,
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyStatusText: {
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
  noHistoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  noHistoryText: {
    fontSize: 14,
    marginLeft: 8,
  },
  viewAllHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  viewAllHistoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MedicationDetails; 