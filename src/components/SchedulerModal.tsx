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

interface SchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  donorId: string;
  requestDetails: {
    patient_name: string;
    blood_type: string;
    hospital_name: string;
    hospital_address: string;
  };
}

export const SchedulerModal: React.FC<SchedulerModalProps> = ({
  isOpen,
  onClose,
  requestId,
  donorId,
  requestDetails
}) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create the schedule with fallback field handling
      const scheduleData: any = {
        donor_id: donorId,
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
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: donorId,
              title: 'Blood Donation Scheduled',
              message: `Your blood donation has been scheduled for ${date} at ${time}`,
              type: 'donation_scheduled',
              data: {
                request_id: requestId,
                scheduled_date: date,
                scheduled_time: time,
                patient_name: requestDetails.patient_name,
                blood_type: requestDetails.blood_type,
                hospital_name: requestDetails.hospital_name,
                hospital_address: requestDetails.hospital_address,
                recipient_info: 'donor'
              }
            });

          if (notificationError) {
            console.error('Error creating notification:', notificationError);
          }
        } catch (notifError) {
          console.error('Error in notification process:', notifError);
          // Don't block the main flow for notification errors
        }

        // We got here means the scheduling was successful
        toast({
          title: 'Success',
          description: 'Blood donation has been scheduled successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        onClose();
        window.location.reload();
      } catch (error) {
        console.error('Error scheduling donation:', error);
        toast({
          title: 'Error',
          description: 'Failed to schedule blood donation',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error scheduling donation:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule blood donation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Schedule Blood Donation</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Time</FormLabel>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
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
              type="submit"
              isLoading={isSubmitting}
            >
              Schedule
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}; 