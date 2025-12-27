import React, { useEffect, useState, useMemo, useRef } from 'react'
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
    const [replyTo, setReplyTo] = useState(null); // { messageId, text, senderId, senderUsername }
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        action: null,
        actionType: '' // 'clearChat' or 'deleteUser'
    });
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
    const messageInputRef = useRef(null);
    const { user, selectedUser } = useSelector(store => store.auth);
    const { onlineUsers, messages, conversations } = useSelector(store => store.chat);
    const dispatch = useDispatch();

    useGetConversations();
    useGetRTM();
    useGetAllMessage(); // This fetches messages when selectedUser changes

    // Handle mobile keyboard detection and viewport adjustments
    useEffect(() => {
        let keyboardCheckTimeout;

        const updateKeyboardState = (isOpen) => {
            setIsKeyboardOpen(isOpen);
            if (isOpen) {
                const currentHeight = window.innerHeight;
                document.documentElement.style.setProperty('--vh', `${currentHeight * 0.01}px`);
                // Only scroll to bottom when actually sending a message, not when just opening keyboard
            } else {
                document.documentElement.style.setProperty('--vh', '1vh');
            }
        };

        const handleResize = () => {
            const currentHeight = window.innerHeight;
            const heightDifference = viewportHeight - currentHeight;

            // Clear any pending keyboard checks
            if (keyboardCheckTimeout) {
                clearTimeout(keyboardCheckTimeout);
            }

            // Detect keyboard open (significant height reduction on mobile)
            if (heightDifference > 150 && window.innerWidth < 768) {
                updateKeyboardState(true);
            } else if (heightDifference < 50) {
                // Only close keyboard if height difference is minimal (keyboard fully closed)
                keyboardCheckTimeout = setTimeout(() => {
                    updateKeyboardState(false);
                }, 200); // Small delay to prevent flickering
            }

            setViewportHeight(currentHeight);
        };

        const handleFocus = (e) => {
            // Only handle mobile focus events
            if (window.innerWidth >= 768) return;

            // Clear any pending keyboard checks
            if (keyboardCheckTimeout) {
                clearTimeout(keyboardCheckTimeout);
            }

            // Immediate keyboard detection for better UX
            keyboardCheckTimeout = setTimeout(() => {
                const currentHeight = window.innerHeight;
                const initialHeight = window.screen.height;
                const heightRatio = currentHeight / initialHeight;

                // Consider keyboard open if height is significantly reduced
                if (heightRatio < 0.75) {
                    updateKeyboardState(true);
                }
            }, 150); // Reduced delay for faster detection
        };

        const handleBlur = () => {
            // Delay keyboard close to prevent flickering when switching between inputs
            if (keyboardCheckTimeout) {
                clearTimeout(keyboardCheckTimeout);
            }
            keyboardCheckTimeout = setTimeout(() => {
                updateKeyboardState(false);
            }, 300);
        };

        // Use visual viewport API if available for better keyboard detection
        const handleVisualViewportChange = () => {
            if (window.visualViewport) {
                const heightRatio = window.visualViewport.height / window.innerHeight;
                if (heightRatio < 0.8 && window.innerWidth < 768) {
                    updateKeyboardState(true);
                } else if (heightRatio > 0.9) {
                    updateKeyboardState(false);
                }
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        // Add visual viewport listener if supported
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleVisualViewportChange);
        }

        // Listen for input focus/blur events - use event delegation for dynamic inputs
        const handleInputFocus = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                handleFocus(e);
            }
        };

        const handleInputBlur = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                handleBlur();
            }
        };

        document.addEventListener('focusin', handleInputFocus);
        document.addEventListener('focusout', handleInputBlur);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
            }
            document.removeEventListener('focusin', handleInputFocus);
            document.removeEventListener('focusout', handleInputBlur);
            if (keyboardCheckTimeout) {
                clearTimeout(keyboardCheckTimeout);
            }
        };
    }, [viewportHeight]);

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

    const handleReply = (message) => {
        const replyData = {
            messageId: message._id,
            text: message.message,
            senderId: message.senderId,
            senderUsername: message.senderId === user._id ? 'You' : selectedUser?.username || 'Unknown'
        };
        setReplyTo(replyData);
        // Focus input immediately for better UX
        requestAnimationFrame(() => {
            if (messageInputRef.current) {
                messageInputRef.current.focus();
            }
        });
    };

    const cancelReply = () => {
        setReplyTo(null);
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
        setReplyTo(null); // Clear reply state

        // Scroll to bottom to show the new message
        setTimeout(() => {
            const messagesContainer = document.querySelector('.overflow-y-auto');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);

        // Keep input focused immediately to prevent keyboard from hiding on mobile
        // Use requestAnimationFrame for immediate execution without setTimeout delay
        requestAnimationFrame(() => {
            if (messageInputRef.current) {
                messageInputRef.current.focus();
            }
        });

        // Update conversation list with last message
        dispatch(updateConversationLastMessage({
            userId: receiverId,
            lastMessage: messageText
        }));

        try {
            const res = await axios.post(
                `https://snapgrid-r8kd.onrender.com/api/v1/message/send/${receiverId}`,
                {
                    textMessage: messageText,
                    replyTo: replyTo?.messageId || null,
                    replyText: replyTo?.text || null
                },
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
                // Keep input focused immediately even on error
                requestAnimationFrame(() => {
                    if (messageInputRef.current) {
                        messageInputRef.current.focus();
                    }
                });
            }
        } catch (error) {
            console.log('Error sending message:', error);
            // Remove temporary message if send failed
            dispatch(removeTempMessage(tempId));
            setTextMessage(messageText); // Restore text if failed
            // Keep input focused even on error
            setTimeout(() => {
                if (messageInputRef.current) {
                    messageInputRef.current.focus();
                }
            }, 100);
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
        <div className={`flex bg-white ${isKeyboardOpen ? 'h-[calc(var(--vh,1vh)*100)]' : 'h-screen'} overflow-hidden`}>
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
                    <section className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white ${isKeyboardOpen ? 'h-[calc(var(--vh,1vh)*100)] overflow-hidden' : 'h-full'} relative`}>
                        {/* Chat Header */}
                        <div className={`flex gap-2 sm:gap-3 items-center px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white sticky top-0 shadow-sm ${isKeyboardOpen ? 'z-30 relative' : 'z-10'}`}>
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
                        <Messages
                            selectedUser={selectedUser}
                            isKeyboardOpen={isKeyboardOpen}
                            onReply={handleReply}
                            replyTo={replyTo}
                        />

                        {/* Message Input */}
                        <div className={`flex flex-col border-t border-gray-200 bg-white overflow-hidden ${isKeyboardOpen ? 'absolute bottom-0 left-0 right-0 z-20 pb-safe' : 'relative'}`}>
                            {/* Reply Preview */}
                            {replyTo && (
                                <div className='flex items-start justify-between p-3 bg-blue-50 border-b border-blue-100 overflow-hidden'>
                                    <div className='flex-1 min-w-0 mr-2'>
                                        <div className='flex items-center gap-2 mb-1'>
                                            <span className='text-sm font-medium text-blue-700 truncate'>Replying to</span>
                                            <span className='text-sm text-blue-600 truncate'>{replyTo.senderUsername}</span>
                                        </div>
                                        <div className='relative'>
                                            <p className='text-sm text-blue-800 break-words'
                                               style={{
                                                 wordBreak: 'break-all',
                                                 overflowWrap: 'break-word'
                                               }}
                                               title={replyTo.text}>
                                                {replyTo.text}
                                            </p>
                                            {replyTo.text.length > 100 && (
                                                <span className='text-xs text-blue-500 mt-1 block'>
                                                    {replyTo.text.length} characters
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={cancelReply}
                                        className='flex-shrink-0 p-1.5 hover:bg-blue-100 rounded-full transition-colors mt-0.5'
                                        title="Cancel reply"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            )}

                            <div className='flex items-center gap-2 sm:gap-3 p-3 sm:p-4 overflow-hidden'>
                            <Input
                                ref={messageInputRef}
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