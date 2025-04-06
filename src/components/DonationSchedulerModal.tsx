import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast
} from './ChakraUtils';
import { supabase } from '../lib/supabase';

interface DonationSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  donorId: string;
  requesterId: string;
  requestDetails: {
    patientName: string;
    bloodType: string;
    hospitalName: string;
    hospitalAddress: string;
  };
}

export const DonationSchedulerModal: React.FC<DonationSchedulerModalProps> = ({
  isOpen,
  onClose,
  requestId,
  donorId,
  requesterId,
  requestDetails
}) => {
  const toast = useToast();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!date || !time) {
      toast({
        title: 'Error',
        description: 'Please select both date and time',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create donation schedule with fallback field handling
      const scheduleData: any = {
        donor_id: donorId,
        requester_id: requesterId,
        scheduled_date: date,
        scheduled_time: time,
        status: 'scheduled'
      };
      
      // Try both field names to ensure compatibility with different DB versions
      try {
        scheduleData.emergency_request_id = requestId;
        
        const { error: scheduleError } = await supabase
          .from('donation_schedules')
          .insert(scheduleData);

        if (scheduleError) {
          // If error suggests wrong column name, try with request_id
          if (scheduleError.message && scheduleError.message.includes("column \"emergency_request_id\" of relation \"donation_schedules\" does not exist")) {
            console.log("Using request_id instead of emergency_request_id");
            delete scheduleData.emergency_request_id;
            scheduleData.request_id = requestId;
            
            const { error: retryError } = await supabase
              .from('donation_schedules')
              .insert(scheduleData);
              
            if (retryError) {
              throw retryError;
            }
          } else {
            throw scheduleError;
          }
        }

        // Create notification for donor
        try {
          // First try with recipient_type
          const notificationData: {
            user_id: string;
            title: string;
            message: string;
            type: string;
            recipient_type?: string;
            data: {
              request_id: string;
              scheduled_date: string;
              scheduled_time: string;
              patient_name: string;
              blood_type: string;
              hospital_name: string;
              hospital_address: string;
              recipient_info: string;
            }
          } = {
            user_id: donorId,
            title: 'Blood Donation Scheduled',
            message: `Blood donation scheduled for ${date} at ${time}`,
            type: 'donation_scheduled',
            recipient_type: 'donor',
            data: {
              request_id: requestId,
              scheduled_date: date,
              scheduled_time: time,
              patient_name: requestDetails.patientName,
              blood_type: requestDetails.bloodType,
              hospital_name: requestDetails.hospitalName,
              hospital_address: requestDetails.hospitalAddress,
              recipient_info: 'donor'
            }
          };

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notificationData);

          if (notificationError) {
            // If we get a 42703 error (column doesn't exist)
            if (notificationError.code === '42703') {
              console.log('Falling back to notification without recipient_type');
              // Try again without recipient_type
              delete notificationData.recipient_type;
              
              const { error: fallbackError } = await supabase
                .from('notifications')
                .insert(notificationData);
                
              if (fallbackError) {
                console.error('Error creating notification (fallback):', fallbackError);
              } else {
                console.log('Successfully created notification (fallback)');
              }
            } else {
              console.error('Error creating notification:', notificationError);
            }
          } else {
            console.log('Successfully created notification');
          }
        } catch (notifError) {
          console.error('Error in notification process:', notifError);
          // Don't block the main flow for notification errors
        }

        // We got here means the scheduling was successful  
        toast({
          title: 'Success',
          description: 'Donation schedule created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        onClose();
        window.location.reload();
      } catch (error) {
        console.error('Error creating donation schedule:', error);
        toast({
          title: 'Error',
          description: 'Failed to create donation schedule',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error creating donation schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create donation schedule',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Schedule Blood Donation</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Date</FormLabel>
              <Input
                type="date"
                value={date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Time</FormLabel>
              <Input
                type="time"
                value={time}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTime(e.target.value)}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            Schedule
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 