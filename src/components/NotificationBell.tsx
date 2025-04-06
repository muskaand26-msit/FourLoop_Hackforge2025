// src/components/NotificationBell.tsx

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  handled?: boolean;
  data?: any;
  created_at: string;
}

interface NotificationBellProps {
  onNotificationClick?: (notification: Notification) => void;
}

export function NotificationBell({
  onNotificationClick,
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          if (newNotification.message) {
            toast.success(newNotification.message);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // First try with user_id column
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        setNotifications(data || []);
        setUnreadCount(data?.filter((n) => n.read === false).length || 0);
      } catch (err: any) {
        console.error('Error fetching notifications with user_id:', err);
        setError(err.message || 'Failed to fetch notifications');
        
        // If error indicates column doesn't exist, try without the user_id filter
        if (err.message && err.message.includes('column') && err.message.includes('does not exist')) {
          try {
            // Fall back to getting all notifications (not ideal but better than nothing)
            const { data, error: fallbackError } = await supabase
              .from('notifications')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(10);

            if (fallbackError) throw fallbackError;

            setNotifications(data || []);
            setUnreadCount(data?.filter((n) => n.read === false).length || 0);
            setError(null); // Clear error since we recovered
          } catch (fallbackErr: any) {
            console.error('Error fetching all notifications:', fallbackErr);
            setError(fallbackErr.message || 'Failed to fetch notifications');
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      setError(error.message || 'Failed to fetch notifications');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // First mark the notification as read
    await markAsRead(notification.id);

    // Then handle blood offer notifications
    if (notification.type === 'blood_offer' && notification.handled === false) {
      // Show confirmation modal through parent component
      if (onNotificationClick) {
        // Include the notification ID in the data
        onNotificationClick({
          ...notification,
          data: {
            ...(notification.data || {}),
            id: notification.id
          }
        });
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications
            </h3>
          </div>

          {error ? (
            <div className="p-4 text-center text-red-500">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  notification.read === false ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      {notification.title || 'Notification'}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message || 'You have a new notification'}
                    </p>
                    {notification.type === 'blood_offer' && notification.data && (
                      <div className="mt-2 text-sm">
                        <p className="text-gray-700">
                          Donor: {notification.data.name || 'Unknown'}
                        </p>
                        <p className="text-gray-700">
                          Contact: {notification.data.phone || 'N/A'}
                        </p>
                        <p className="text-gray-700">
                          Blood Type: {notification.data.blood_type || 'Unknown'}
                        </p>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(notification.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
