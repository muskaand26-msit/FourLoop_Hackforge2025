import React, { useState } from 'react';
import { Button } from '@chakra-ui/react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '@chakra-ui/react';

const EmergencyRequests = () => {
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const toast = useToast();

  const handleCancel = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('donation_schedules')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id
        })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Schedule cancelled successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error('Error cancelling schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel schedule',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleReschedule = (scheduleId: string) => {
    // Open the SchedulerModal with existing schedule data
    setSelectedSchedule(scheduleId);
    setIsSchedulerOpen(true);
  };

  return (
    <div>
      {/* ... existing request rendering ... */}
      {request.status === 'in_progress' && request.accepted_donor_id && (
        <div>
          <Button
            colorScheme="red"
            size="sm"
            onClick={() => handleCancel(request.schedule_id)}
          >
            Cancel Schedule
          </Button>
          <Button
            colorScheme="blue"
            size="sm"
            ml={2}
            onClick={() => handleReschedule(request.schedule_id)}
          >
            Reschedule
          </Button>
        </div>
      )}
      {/* ... rest of the component ... */}
    </div>
  );
};

export default EmergencyRequests; 