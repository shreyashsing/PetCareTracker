import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '../hooks/useAppColors';
import { useToast } from '../hooks/use-toast';
import { Medication } from '../types/components';
import { unifiedDatabaseManager } from "../services/db";
import { formatDate } from '../utils/helpers';
import { notificationService } from '../services/notifications';
import ConfirmationDialog from './ConfirmationDialog';

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
  const { toast } = useToast();
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [markCompletedDialogVisible, setMarkCompletedDialogVisible] = useState(false);
  const [reactivateDialogVisible, setReactivateDialogVisible] = useState(false);

  if (!medication) return null;
  
  const handleEdit = () => {
    onEdit(medication);
  };
  
  const handleDelete = () => {
    setConfirmDialogVisible(true);
  };
  
  const confirmDelete = async () => {
            try {
              await unifiedDatabaseManager.medications.delete(medication.id);
              // Cancel any scheduled notifications
              await notificationService.cancelMedicationNotifications(medication.id);
              onRefresh();
              onClose();
      toast({
        title: 'Success',
        description: 'Medication deleted successfully',
        type: 'success'
      });
            } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete medication',
        type: 'error'
      });
              console.error('Error deleting medication:', error);
    } finally {
      setConfirmDialogVisible(false);
        }
  };

  const handleMarkCompleted = () => {
    setMarkCompletedDialogVisible(true);
  };
  
  const confirmMarkCompleted = async () => {
            try {
              await unifiedDatabaseManager.medications.updateStatus(medication.id, 'completed');
              await notificationService.cancelMedicationNotifications(medication.id);
              onRefresh();
              onClose();
      toast({
        title: 'Success',
        description: 'Medication marked as completed and will be deleted after 2 days',
        type: 'success'
      });
            } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update medication status',
        type: 'error'
      });
              console.error('Error updating medication status:', error);
    } finally {
      setMarkCompletedDialogVisible(false);
        }
  };

  const handleReactivate = () => {
    setReactivateDialogVisible(true);
  };
  
  const confirmReactivate = async () => {
            try {
              await unifiedDatabaseManager.medications.updateStatus(medication.id, 'active');
              // Reschedule notifications if reminders are enabled
              if (medication.reminderSettings?.enabled) {
                await notificationService.scheduleMedicationNotifications(medication);
              }
              onRefresh();
              onClose();
      toast({
        title: 'Success',
        description: 'Medication reactivated',
        type: 'success'
      });
            } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reactivate medication',
        type: 'error'
      });
              console.error('Error reactivating medication:', error);
    } finally {
      setReactivateDialogVisible(false);
        }
  };
  
  // Determine medication status color and text
  const getStatusInfo = () => {
    switch (medication.status) {
      case 'active':
        return { 
          color: colors.success || '#4CAF50', 
          text: 'Active',
          icon: 'checkmark-circle-outline' as const
        };
      case 'completed':
        return { 
          color: colors.primary || '#4F46E5', 
          text: 'Completed',
          icon: 'checkmark-done-outline' as const
        };
      default:
        return { 
          color: colors.text || '#4F46E5', 
          text: 'Unknown',
          icon: 'help-circle-outline' as const
        };
    }
  };

  const statusInfo = getStatusInfo();
  
  const viewFullHistory = () => {
    toast({
      title: 'Full History',
      description: 'This would show the complete medication history.',
      type: 'info'
    });
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
                { backgroundColor: statusInfo.color + '15' }
              ]}>
                <Ionicons name={statusInfo.icon} size={22} color={statusInfo.color} />
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
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                  <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {statusInfo.text}
                  </Text>
                </View>
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
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Duration</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Start Date:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatDate(new Date(medication.duration.startDate))}
                </Text>
              </View>
              
              {medication.duration.endDate && !medication.duration.indefinite && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>End Date:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatDate(new Date(medication.duration.endDate))}
                  </Text>
                </View>
              )}
              
              {medication.duration.indefinite && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.text + '80' }]}>Duration:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    Ongoing treatment
                  </Text>
                </View>
              )}
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
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                  <Text style={[styles.instructionText, { color: colors.text }]}>
                    Take {medication.frequency.times} time{medication.frequency.times > 1 ? 's' : ''} per {medication.frequency.period}
                  </Text>
                </View>
                
                {medication.frequency.specificTimes && medication.frequency.specificTimes.length > 0 && (
                  <View style={styles.instructionItem}>
                    <Ionicons name="alarm-outline" size={18} color={colors.primary} />
                    <Text style={[styles.instructionText, { color: colors.text }]}>
                      Scheduled times: {medication.frequency.specificTimes.join(', ')}
                    </Text>
                  </View>
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
                    onPress={viewFullHistory}
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
            {medication.status === 'active' ? (
              <>
                <TouchableOpacity 
                  style={[styles.button, styles.completeButton, { backgroundColor: colors.success || '#4CAF50' }]}
                  onPress={handleMarkCompleted}
                >
                  <Ionicons name="checkmark-outline" size={16} color="white" />
                  <Text style={[styles.buttonText, { color: 'white' }]}>Complete</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.deleteButton, { backgroundColor: colors.error || '#F44336' }]}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={16} color="white" />
                  <Text style={[styles.buttonText, { color: 'white' }]}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={[styles.button, styles.reactivateButton, { backgroundColor: colors.primary || '#4F46E5' }]}
                  onPress={handleReactivate}
                >
                  <Ionicons name="play-outline" size={16} color="white" />
                  <Text style={[styles.buttonText, { color: 'white' }]}>Reactivate</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.deleteButton, { backgroundColor: colors.error || '#F44336' }]}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={16} color="white" />
                  <Text style={[styles.buttonText, { color: 'white' }]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={confirmDialogVisible}
        title="Delete Medication"
        message="Are you sure you want to delete this medication? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmType="danger"
        icon="trash-outline"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialogVisible(false)}
      />
      
      {/* Mark Completed Dialog */}
      <ConfirmationDialog
        visible={markCompletedDialogVisible}
        title="Mark as Completed"
        message="Mark this medication as completed? This will stop all future reminders and automatically delete the medication after 2 days."
        confirmText="Mark Completed"
        cancelText="Cancel"
        confirmType="success"
        icon="checkmark-done-outline"
        onConfirm={confirmMarkCompleted}
        onCancel={() => setMarkCompletedDialogVisible(false)}
      />
      
      {/* Reactivate Dialog */}
      <ConfirmationDialog
        visible={reactivateDialogVisible}
        title="Reactivate Medication"
        message="Reactivate this medication and resume notifications?"
        confirmText="Reactivate"
        cancelText="Cancel"
        confirmType="info"
        icon="refresh-outline"
        onConfirm={confirmReactivate}
        onCancel={() => setReactivateDialogVisible(false)}
      />
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
  completeButton: {
    borderWidth: 1,
  },
  deleteButton: {
    borderWidth: 1,
    backgroundColor: '#F44336',
  },
  reactivateButton: {
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