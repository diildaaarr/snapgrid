import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { setSelectedUser } from '@/redux/authSlice';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { MessageCircleCode, Send, Search, ArrowLeft, MoreVertical } from 'lucide-react';
import Messages from './Messages';
import axios from 'axios';
import { 
    setMessages, 
    setConversations, 
    addMessage, 
    removeTempMessage,
    updateConversationLastMessage,
    removeConversation 
} from '@/redux/chatSlice';
import useGetConversations from '@/hooks/useGetConversations';
import useGetRTM from '@/hooks/useGetRTM';
import useGetAllMessage from '@/hooks/useGetAllMessage';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

const ChatPage = () => {
    const [textMessage, setTextMessage] = useState("");
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        action: null,
        actionType: '' // 'clearChat' or 'deleteUser'
    });
    const { user, selectedUser } = useSelector(store => store.auth);
    const { onlineUsers, messages, conversations } = useSelector(store => store.chat);
    const dispatch = useDispatch();

    useGetConversations();
    useGetRTM();
    useGetAllMessage(); // This fetches messages when selectedUser changes

    const deleteUserHandler = async () => {
        if (!selectedUser) return;

        try {
            const res = await axios.delete(
                `https://snapgrid-r8kd.onrender.com/api/v1/message/delete-user/${selectedUser._id}`,
                { withCredentials: true }
            );

            if (res.data.success) {
                // The conversation will be hidden via the clearedBy filter
                // Remove from local state and clear selection
                dispatch(removeConversation(selectedUser._id));
                dispatch(setSelectedUser(null));
                dispatch(setMessages([]));
            }
        } catch (error) {
            console.log('Error deleting user from conversations:', error);
        }
    };

    const clearChatHandler = async () => {
        if (!selectedUser) return;

        try {
            const res = await axios.delete(
                `https://snapgrid-r8kd.onrender.com/api/v1/message/clear-chat/${selectedUser._id}`,
                { withCredentials: true }
            );

            if (res.data.success) {
                // Clear messages for this conversation only
                dispatch(setMessages([]));

                // Update conversation to show "No messages yet"
                dispatch(updateConversationLastMessage({
                    userId: selectedUser._id,
                    lastMessage: ''
                }));
            }
        } catch (error) {
            console.log('Error clearing chat:', error);
        }
    };

    const sendMessageHandler = async (receiverId) => {
        if (!textMessage.trim() || !receiverId) return;

        const messageText = textMessage.trim();
        const tempId = `temp-${Date.now()}`;

        // Create temporary message for instant UI feedback
        const tempMessage = {
            _id: tempId,
            senderId: user._id,
            receiverId: receiverId,
            message: messageText,
            createdAt: new Date().toISOString(),
            isTemp: true // Flag to identify temporary messages
        };

        // Immediately add message to UI
        dispatch(addMessage(tempMessage));
        setTextMessage("");

        // Update conversation list with last message
        dispatch(updateConversationLastMessage({
            userId: receiverId,
            lastMessage: messageText
        }));

        try {
            const res = await axios.post(
                `https://snapgrid-r8kd.onrender.com/api/v1/message/send/${receiverId}`,
                { textMessage: messageText },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                }
            );

            if (res.data.success) {
                // Temporary message will be replaced by real message via socket
                // The real message with proper _id will come via socket
            } else {
                // Remove temporary message if send failed
                dispatch(removeTempMessage(tempId));
                setTextMessage(messageText); // Restore text if failed
            }
        } catch (error) {
            console.log('Error sending message:', error);
            // Remove temporary message if send failed
            dispatch(removeTempMessage(tempId));
            setTextMessage(messageText); // Restore text if failed
        }
    }

    const handleKeyPress = (e, receiverId) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessageHandler(receiverId);
        }
    }

    const [searchQuery, setSearchQuery] = useState('');

    const filteredConversations = (conversations || []).filter(conv => 
        conv.user?.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className='flex h-screen bg-white'>
            {/* Users List Sidebar - Hidden on mobile when user is selected */}
            <section className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-200 flex-col`}>
                <div className='p-3 sm:p-4 border-b border-gray-200 bg-white'>
                    <h1 className='font-bold text-lg sm:text-xl mb-3 sm:mb-4'>{user?.username}</h1>
                    <div className='relative'>
                        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            type="text" 
                            className='pl-9 focus-visible:ring-transparent h-9 text-sm' 
                            placeholder="Search conversations..." 
                        />
                    </div>
                </div>
                <div className='overflow-y-auto flex-1'>
                    {filteredConversations.length > 0 ? (
                        filteredConversations.map((conv) => {
                            const isOnline = onlineUsers.includes(conv.user?._id);
                            const isSelected = selectedUser?._id === conv.user?._id;
                            return (
                                <div 
                                    key={conv._id}
                                    onClick={() => dispatch(setSelectedUser(conv.user))} 
                                    className={`flex gap-3 items-center p-3 sm:p-4 cursor-pointer transition-colors ${
                                        isSelected 
                                            ? 'bg-blue-50 border-l-4 border-l-[#0095F6]' 
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className='relative'>
                                        <Avatar className='w-10 h-10 sm:w-12 sm:h-12 border-2 border-white'>
                                            <AvatarImage src={conv.user?.profilePicture} />
                                            <AvatarFallback>{conv.user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                                        </Avatar>
                                        {isOnline && (
                                            <div className='absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-white rounded-full'></div>
                                        )}
                                    </div>
                                    <div className='flex flex-col flex-1 min-w-0'>
                                        <span className='font-semibold text-sm truncate'>{conv.user?.username}</span>
                                        <span className={`text-xs truncate ${isOnline ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                            {isOnline ? 'Active now' : (conv.lastMessage || 'No messages yet')}
                                        </span>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className='text-center py-8 text-gray-400 text-sm'>
                            <p>No conversations yet</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Chat Area - Takes full width on mobile when user is selected */}
            {
                selectedUser ? (
                    <section className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full bg-white`}>
                        {/* Chat Header */}
                        <div className='flex gap-2 sm:gap-3 items-center px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm'>
                            {/* Back button for mobile */}
                            <button 
                                onClick={() => dispatch(setSelectedUser(null))}
                                className='md:hidden p-1 hover:bg-gray-100 rounded-full transition-colors'
                            >
                                <ArrowLeft className='w-5 h-5' />
                            </button>
                            <Avatar className='w-8 h-8 sm:w-10 sm:h-10 border-2 border-gray-100'>
                                <AvatarImage src={selectedUser?.profilePicture} alt='profile' />
                                <AvatarFallback>{selectedUser?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className='flex flex-col flex-1'>
                                <span className='font-semibold text-sm sm:text-base'>{selectedUser?.username}</span>
                                <span className={`text-xs ${onlineUsers.includes(selectedUser?._id) ? 'text-green-600' : 'text-gray-400'}`}>
                                    {onlineUsers.includes(selectedUser?._id) ? 'Active now' : 'Offline'}
                                </span>
                            </div>
                            {/* 3-dot Menu */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className='p-2 hover:bg-gray-100 rounded-full transition-colors'>
                                        <MoreVertical className='w-5 h-5 text-gray-600' />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className='w-48'>
                                    <div className='flex flex-col gap-2'>
                                        <button
                                            onClick={() => {
                                                setConfirmDialog({
                                                    isOpen: true,
                                                    title: 'Clear Chat',
                                                    message: `Are you sure you want to clear all messages with ${selectedUser?.username}? This action cannot be undone.`,
                                                    action: clearChatHandler,
                                                    actionType: 'clearChat'
                                                });
                                            }}
                                            className='text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors'
                                        >
                                            Clear chat
                                        </button>
                                        <button
                                            onClick={() => {
                                                setConfirmDialog({
                                                    isOpen: true,
                                                    title: 'Delete User',
                                                    message: `Are you sure you want to remove ${selectedUser?.username} from your conversations?`,
                                                    action: deleteUserHandler,
                                                    actionType: 'deleteUser'
                                                });
                                            }}
                                            className='text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors'
                                        >
                                            Delete user
                                        </button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Messages */}
                        <Messages selectedUser={selectedUser} />

                        {/* Message Input */}
                        <div className='flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-t border-gray-200 bg-white'>
                            <Input 
                                value={textMessage} 
                                onChange={(e) => setTextMessage(e.target.value)}
                                onKeyPress={(e) => handleKeyPress(e, selectedUser?._id)}
                                type="text" 
                                className='flex-1 focus-visible:ring-transparent h-10 sm:h-11 rounded-full border-gray-300 text-sm' 
                                placeholder="Type a message..." 
                            />
                            <Button 
                                onClick={() => sendMessageHandler(selectedUser?._id)}
                                disabled={!textMessage.trim()}
                                className='bg-[#0095F6] hover:bg-[#3192d2] h-10 w-10 sm:h-11 sm:w-11 rounded-full p-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                <Send className='w-4 h-4 sm:w-5 sm:h-5' />
                            </Button>
                        </div>
                    </section>
                ) : (
                    <div className='hidden md:flex flex-1 flex-col items-center justify-center bg-gray-50'>
                        <div className='text-center p-8'>
                            <MessageCircleCode className='w-20 h-20 sm:w-24 sm:h-24 mx-auto text-gray-300 mb-4' />
                            <h1 className='font-semibold text-lg sm:text-xl mb-2 text-gray-700'>Your messages</h1>
                            <p className='text-gray-500 text-sm'>Select a conversation to start chatting</p>
                        </div>
                    </div>
                )
            }

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialog.isOpen} onOpenChange={(isOpen) => setConfirmDialog(prev => ({...prev, isOpen}))}>
                <DialogContent className='animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] duration-300'>
                    <DialogHeader>
                        <DialogTitle className='text-xl font-bold text-gray-900'>{confirmDialog.title}</DialogTitle>
                        <DialogDescription className='text-gray-600 mt-2'>
                            {confirmDialog.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className='flex gap-3 mt-6'>
                        <Button
                            variant='outline'
                            onClick={() => setConfirmDialog(prev => ({...prev, isOpen: false}))}
                            className='px-6 hover:bg-gray-100 transition-colors'
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                confirmDialog.action?.();
                                setConfirmDialog(prev => ({...prev, isOpen: false}));
                            }}
                            className={`px-6 text-white transition-all transform hover:scale-105 active:scale-95 ${
                                confirmDialog.actionType === 'clearChat'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-orange-600 hover:bg-orange-700'
                            }`}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default ChatPage