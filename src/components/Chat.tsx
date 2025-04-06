import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface ChatProps {
  roomId: string;
  otherUserName: string;
  className?: string;
}

export function Chat({ roomId, otherUserName, className = '' }: ChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(true);
  const lastMessageIdRef = useRef<string | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Mark all messages as read when the chat is opened
  useEffect(() => {
    const markAllAsRead = async () => {
      if (!user) return;
      
      try {
        // Use the special function to mark all messages as read
        const { error } = await supabase.rpc('mark_room_messages_as_read', {
          p_room_id: roomId,
          p_user_id: user.id
        });
        
        if (error) throw error;
        
        // Update local state to reflect read status
        setMessages(prevMessages => prevMessages.map(msg => {
          if (msg.sender_id !== user.id && !msg.read_at) {
            return { ...msg, read_at: new Date().toISOString() };
          }
          return msg;
        }));
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };
    
    markAllAsRead();
  }, [roomId, user]);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setMessages(data || []);
        
        // Store the ID of the last message for deduplication
        if (data && data.length > 0) {
          lastMessageIdRef.current = data[data.length - 1].id;
        }
        
        setIsLoading(false);
        
        // Use setTimeout to ensure the DOM has updated
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [roomId]);

  // Handle marking a message as read
  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    // This function sets up realtime subscription and returns the cleanup function
    const setupRealtimeSubscription = () => {
      setIsConnected(true);
      
      const channel = supabase
        .channel(`room:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            const newMessage = payload.new as Message;
            
            // Avoid adding the same message twice, especially our own recently sent messages
            setMessages((current) => {
              // Check if the message is already in the list to prevent duplicates
              if (current.some(msg => msg.id === newMessage.id) || 
                  lastMessageIdRef.current === newMessage.id) {
                return current;
              }
              
              // Update last message id reference
              lastMessageIdRef.current = newMessage.id;
              
              return [...current, newMessage];
            });
            
            // Mark message as read if it's from the other user
            if (newMessage.sender_id !== user?.id) {
              markMessageAsRead(newMessage.id);
            }
            
            // Scroll to bottom when new message arrives
            scrollToBottom();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            const updatedMessage = payload.new as Message;
            // Update the message in the list
            setMessages((current) => 
              current.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to chat room:', roomId);
            setIsConnected(true);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to chat room:', roomId);
            setIsConnected(false);
            
            // Try to reconnect after a short delay
            setTimeout(() => {
              console.log('Attempting to reconnect...');
              channel.subscribe();
            }, 3000);
          }
        });

      // Return the cleanup function
      return () => {
        channel.unsubscribe();
      };
    };

    // Set up the subscription and store the cleanup function
    const cleanup = setupRealtimeSubscription();

    // Clean up on unmount
    return cleanup;
  }, [roomId, user?.id]);

  // Send new message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setIsSending(true);
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          message: messageText,
        })
        .select()
        .single();

      if (error) {
        setNewMessage(messageText); // Restore message on error
        throw error;
      }

      // Store the ID of the last message we sent for deduplication
      lastMessageIdRef.current = data.id;

      // For immediate feedback, add to local state even though realtime will also update
      setMessages((current) => {
        // Avoid duplicates
        if (current.some(msg => msg.id === data.id)) {
          return current;
        }
        return [...current, data];
      });
      
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[500px] bg-white rounded-lg shadow ${className}`}>
      {/* Connection status indicator - removed duplicate header */}
      {!isConnected && (
        <div className="p-2 bg-yellow-50 border-b border-yellow-100 text-yellow-800 text-xs text-center">
          Reconnecting to chat server...
        </div>
      )}

      {/* Messages container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender_id === user?.id
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="break-words">{message.message}</p>
                <div
                  className={`text-xs mt-1 flex items-center justify-end ${
                    message.sender_id === user?.id ? 'text-red-100' : 'text-gray-500'
                  }`}
                >
                  <span>{formatTimestamp(message.created_at)}</span>
                  {message.sender_id === user?.id && (
                    <span className="ml-2">
                      {message.read_at ? (
                        <Check className="h-3 w-3 text-green-200" />
                      ) : (
                        <Check className="h-3 w-3 opacity-50" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-red-500"
            disabled={isSending || !isConnected}
          />
          <button
            type="submit"
            disabled={isSending || !newMessage.trim() || !isConnected}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 