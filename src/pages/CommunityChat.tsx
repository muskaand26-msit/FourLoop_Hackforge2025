import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Loader2, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  user_name?: string; // This will be added client-side
  user_avatar?: string; // This will be added client-side
}

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export function CommunityChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, { name: string; avatar?: string }>>({});
  const channel = useRef<any>(null);

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
        // Use the function to mark all messages as read
        const { error } = await supabase.rpc('mark_community_messages_as_read', {
          p_user_id: user.id
        });
        
        if (error) throw error;
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };
    
    markAllAsRead();
  }, [user]);

  // Fetch all profiles at once to avoid multiple requests
  const fetchAllProfiles = async () => {
    try {
      // Get all unique user IDs from messages
      const uniqueUserIds = [...new Set(messages.map(m => m.user_id))];
      
      // Skip if there are no users to fetch or all profiles are already loaded
      if (uniqueUserIds.length === 0 || 
          uniqueUserIds.every(id => userProfiles[id])) {
        return;
      }
      
      // Fetch all profiles at once
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', uniqueUserIds);
        
      if (error) throw error;
      
      // Process the results
      if (data && data.length > 0) {
        const newProfiles = { ...userProfiles };
        
        data.forEach((profile: UserProfile) => {
          newProfiles[profile.id] = {
            name: profile.full_name || 'Anonymous User',
            avatar: profile.avatar_url
          };
        });
        
        // For any user IDs that didn't have a profile, set a default
        uniqueUserIds.forEach(id => {
          if (!newProfiles[id]) {
            newProfiles[id] = { name: 'Anonymous User' };
          }
        });
        
        setUserProfiles(newProfiles);
      } else {
        // If no profiles were found, set defaults for all
        const newProfiles = { ...userProfiles };
        uniqueUserIds.forEach(id => {
          if (!newProfiles[id]) {
            newProfiles[id] = { name: 'Anonymous User' };
          }
        });
        setUserProfiles(newProfiles);
      }
    } catch (error) {
      console.error('Error fetching user profiles:', error);
    }
  };

  // Update profiles when messages change
  useEffect(() => {
    if (messages.length > 0) {
      fetchAllProfiles();
    }
  }, [messages]);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('community_chat_messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;

        setMessages(data || []);
        setLoading(false);
        
        // Use setTimeout to ensure the DOM has updated
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
        setLoading(false);
      }
    };

    fetchMessages();
    
    // Set up real-time subscription
    setupRealtimeSubscription();
    
    // Cleanup function
    return () => {
      if (channel.current) {
        channel.current.unsubscribe();
      }
    };
  }, []);

  // Setup real-time subscription
  const setupRealtimeSubscription = () => {
    // If there's an existing subscription, unsubscribe
    if (channel.current) {
      channel.current.unsubscribe();
    }
    
    // Create a new subscription
    channel.current = supabase
      .channel('public:community_chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_chat_messages'
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Check if the message is already in the list to prevent duplicates
          setMessages((current) => {
            if (current.some(msg => msg.id === newMessage.id)) {
              return current;
            }
            return [...current, newMessage];
          });
          
          // Trigger profile fetch if needed
          fetchAllProfiles();
          
          // Scroll to bottom when new message arrives
          scrollToBottom();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });
  };

  // Send new message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setSending(true);
    
    try {
      const { data, error } = await supabase
        .from('community_chat_messages')
        .insert({
          user_id: user.id,
          message: messageText
        })
        .select();

      if (error) {
        setNewMessage(messageText); // Restore message on error
        throw error;
      }
      
      // Add message to the UI immediately for better responsiveness
      if (data && data.length > 0) {
        const addedMessage = data[0] as ChatMessage;
        setMessages(prev => {
          if (prev.some(msg => msg.id === addedMessage.id)) {
            return prev;
          }
          return [...prev, addedMessage];
        });
      }
      
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, 'h:mm a');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-2 mb-6">
          <MessageSquare className="h-6 w-6 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900">Community Chat</h1>
        </div>
        <div className="bg-gray-50 rounded-lg p-6">
          <p className="text-gray-600 mb-4">
            Connect with other blood donors and recipients in the community. Share experiences, ask questions, and support each other.
          </p>
          
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
            {/* Messages Container */}
            <div className="h-96 overflow-y-auto p-4">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                  <span className="ml-2 text-gray-600">Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <p className="text-gray-500">No messages yet. Be the first to start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => {
                    const isCurrentUser = user?.id === message.user_id;
                    const userName = userProfiles[message.user_id]?.name || 'Anonymous User';
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                            isCurrentUser
                              ? 'bg-red-100 text-red-900'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          {!isCurrentUser && (
                            <div className="font-medium text-sm mb-1">{userName}</div>
                          )}
                          <div>{message.message}</div>
                          <div
                            className={`text-xs mt-1 flex items-center justify-end ${
                              isCurrentUser ? 'text-red-700' : 'text-gray-500'
                            }`}
                          >
                            {formatTimestamp(message.created_at)}
                            {isCurrentUser && message.read_at && (
                              <CheckCircle className="h-3 w-3 ml-1" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            {/* Message Input */}
            <div className="border-t border-gray-200 p-3">
              {user ? (
                <form onSubmit={sendMessage} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className={`rounded-md p-2 ${
                      !newMessage.trim() || sending
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </form>
              ) : (
                <div className="bg-yellow-50 p-3 rounded-md text-yellow-800 text-sm">
                  Please <a href="/signin" className="text-blue-600 underline">sign in</a> to join the conversation.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 