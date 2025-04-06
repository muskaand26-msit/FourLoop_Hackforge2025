import React, { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Chat } from './Chat';
import toast from 'react-hot-toast';

interface ChatButtonProps {
  donorId: string;
  donorName: string;
  requestId?: string;
  className?: string;
}

export function ChatButton({ donorId, donorName, requestId, className = '' }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && !roomId) {
      initializeChat();
    }
  }, [isOpen, roomId]);

  const initializeChat = async () => {
    if (!user) {
      toast.error('Please sign in to start a chat');
      return;
    }

    setIsLoading(true);
    try {
      // First, check if the donor exists in the donors table to get the user_id
      const { data: donorData, error: donorError } = await supabase
        .from('donors')
        .select('id, user_id')
        .eq('id', donorId)
        .single();

      if (donorError || !donorData) {
        console.error('Donor error:', donorError);
        throw new Error('Donor not found');
      }

      // Get the donor's user_id which we'll use for chat room creation
      const donorUserId = donorData.user_id;
      
      // Check if a chat room already exists between these users
      // Using the proper Supabase filter syntax for complex queries
      let existingRooms = null;
      let fetchError = null;
      
      // First check case 1: donor_id = donorUserId and requester_id = user.id
      const { data: rooms1, error: error1 } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('donor_id', donorUserId)
        .eq('requester_id', user.id);
      
      if (error1) {
        fetchError = error1;
      } else if (rooms1 && rooms1.length > 0) {
        existingRooms = rooms1;
      } else {
        // Check case 2: donor_id = user.id and requester_id = donorUserId
        const { data: rooms2, error: error2 } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('donor_id', user.id)
          .eq('requester_id', donorUserId);
        
        if (error2) {
          fetchError = error2;
        } else if (rooms2 && rooms2.length > 0) {
          existingRooms = rooms2;
        }
      }

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      if (existingRooms && existingRooms.length > 0) {
        // Use the existing chat room
        setRoomId(existingRooms[0].id);
      } else {
        // Create a new chat room
        console.log("Creating new chat room with donor_id:", donorUserId);
        
        const { data: newRoom, error: insertError } = await supabase
          .from('chat_rooms')
          .insert({
            donor_id: donorUserId,  // Using donor's user_id 
            requester_id: user.id,
            request_id: requestId || null,
            status: 'active'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        
        if (newRoom) {
          setRoomId(newRoom.id);
        } else {
          throw new Error('Failed to create chat room');
        }
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error('Failed to start chat. Please try again.');
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (!user) {
      toast.error('Please sign in to start a chat');
      return;
    }

    // Check if this button is for the current user (prevent chatting with self)
    const checkSelfChat = async () => {
      try {
        const { data: donorData, error: donorError } = await supabase
          .from('donors')
          .select('user_id')
          .eq('id', donorId)
          .single();

        if (donorError) {
          console.error('Error checking donor:', donorError);
          throw new Error('Could not verify donor identity');
        }

        // If the donor's user_id matches the current user's id, this is a self-chat
        if (donorData && donorData.user_id === user.id) {
          toast.error('You cannot chat with yourself');
          return;
        }

        // If not a self-chat, proceed to open chat
        setIsOpen(true);
      } catch (error) {
        console.error('Error in self-chat check:', error);
        toast.error('Failed to start chat. Please try again.');
      }
    };

    checkSelfChat();
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition ${className}`}
        aria-label="Open chat with donor"
      >
        <MessageSquare className="h-5 w-5" />
        <span>Chat</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Chat with {donorName}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                </div>
              ) : roomId ? (
                <Chat roomId={roomId} otherUserName={donorName} />
              ) : (
                <div className="text-center text-gray-500 p-4">Failed to load chat</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 