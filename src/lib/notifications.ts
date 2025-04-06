import { io, Socket } from 'socket.io-client';
import { supabase } from './supabase';

let socket: Socket | null = null;

export const initializeNotifications = (userId: string) => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: {
        userId,
      },
    });

    socket.on('connect', () => {
      console.log('Connected to notification server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from notification server');
    });
  }

  return socket;
};

export const sendSMSNotification = async (
  phoneNumber: string,
  message: string
): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('send-sms', {
      body: { phoneNumber, message },
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

export const sendEmailNotification = async (
  email: string,
  subject: string,
  message: string
): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { email, subject, message },
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const subscribeToNotifications = (
  userId: string,
  onNotification: (notification: any) => void
) => {
  if (!socket) {
    initializeNotifications(userId);
  }

  socket?.on('notification', onNotification);

  return () => {
    socket?.off('notification', onNotification);
  };
};

export const unsubscribeFromNotifications = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};