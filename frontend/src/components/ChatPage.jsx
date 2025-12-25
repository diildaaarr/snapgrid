import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { setSelectedUser } from '@/redux/authSlice';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { MessageCircleCode, Send, Search } from 'lucide-react';
import Messages from './Messages';
import axios from 'axios';
import { setMessages } from '@/redux/chatSlice';

const ChatPage = () => {
    const [textMessage, setTextMessage] = useState("");
    const { user, suggestedUsers, selectedUser } = useSelector(store => store.auth);
    const { onlineUsers, messages } = useSelector(store => store.chat);
    const dispatch = useDispatch();

    const sendMessageHandler = async (receiverId) => {
        if (!textMessage.trim()) return;
        
        try {
            const res = await axios.post(`https://snapgrid-r8kd.onrender.com/api/v1/message/send/${receiverId}`, { textMessage }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            });
            if (res.data.success) {
                dispatch(setMessages([...messages, res.data.newMessage]));
                setTextMessage("");
            }
        } catch (error) {
            console.log(error);
        }
    }

    const handleKeyPress = (e, receiverId) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessageHandler(receiverId);
        }
    }

    useEffect(() => {
        // If a user is already selected (e.g., from Profile page), keep it
        // Only clear on unmount if navigating away from chat
        return () => {
            // Don't clear selectedUser here to allow navigation from Profile
        }
    },[]);

    const [searchQuery, setSearchQuery] = useState('');

    // Combine suggestedUsers with selectedUser if it's not in the list
    const allUsers = useMemo(() => {
        const usersMap = new Map();
        suggestedUsers.forEach(user => {
            usersMap.set(user._id.toString(), user);
        });
        // Add selectedUser if it exists and is not in suggestedUsers
        if (selectedUser && !usersMap.has(selectedUser._id?.toString())) {
            return [selectedUser, ...suggestedUsers];
        }
        return suggestedUsers;
    }, [suggestedUsers, selectedUser]);

    const filteredUsers = allUsers.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className='flex ml-[16%] h-screen bg-white'>
            {/* Users List Sidebar */}
            <section className='w-full md:w-80 border-r border-gray-200 flex flex-col'>
                <div className='p-4 border-b border-gray-200 bg-white'>
                    <h1 className='font-bold text-xl mb-4'>{user?.username}</h1>
                    <div className='relative'>
                        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            type="text" 
                            className='pl-9 focus-visible:ring-transparent h-9' 
                            placeholder="Search conversations..." 
                        />
                    </div>
                </div>
                <div className='overflow-y-auto flex-1'>
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map((suggestedUser) => {
                            const isOnline = onlineUsers.includes(suggestedUser?._id);
                            const isSelected = selectedUser?._id === suggestedUser?._id;
                            return (
                                <div 
                                    key={suggestedUser._id}
                                    onClick={() => dispatch(setSelectedUser(suggestedUser))} 
                                    className={`flex gap-3 items-center p-4 cursor-pointer transition-colors ${
                                        isSelected 
                                            ? 'bg-blue-50 border-l-4 border-l-[#0095F6]' 
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className='relative'>
                                        <Avatar className='w-12 h-12 border-2 border-white'>
                                            <AvatarImage src={suggestedUser?.profilePicture} />
                                            <AvatarFallback>{suggestedUser?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                                        </Avatar>
                                        {isOnline && (
                                            <div className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full'></div>
                                        )}
                                    </div>
                                    <div className='flex flex-col flex-1 min-w-0'>
                                        <span className='font-semibold text-sm truncate'>{suggestedUser?.username}</span>
                                        <span className={`text-xs ${isOnline ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                            {isOnline ? 'Active now' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className='text-center py-8 text-gray-400 text-sm'>
                            <p>No users found</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Chat Area */}
            {
                selectedUser ? (
                    <section className='flex-1 flex flex-col h-full bg-white'>
                        {/* Chat Header */}
                        <div className='flex gap-3 items-center px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm'>
                            <Avatar className='w-10 h-10 border-2 border-gray-100'>
                                <AvatarImage src={selectedUser?.profilePicture} alt='profile' />
                                <AvatarFallback>{selectedUser?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className='flex flex-col flex-1'>
                                <span className='font-semibold'>{selectedUser?.username}</span>
                                <span className={`text-xs ${onlineUsers.includes(selectedUser?._id) ? 'text-green-600' : 'text-gray-400'}`}>
                                    {onlineUsers.includes(selectedUser?._id) ? 'Active now' : 'Offline'}
                                </span>
                            </div>
                        </div>

                        {/* Messages */}
                        <Messages selectedUser={selectedUser} />

                        {/* Message Input */}
                        <div className='flex items-center gap-3 p-4 border-t border-gray-200 bg-white'>
                            <Input 
                                value={textMessage} 
                                onChange={(e) => setTextMessage(e.target.value)}
                                onKeyPress={(e) => handleKeyPress(e, selectedUser?._id)}
                                type="text" 
                                className='flex-1 focus-visible:ring-transparent h-11 rounded-full border-gray-300' 
                                placeholder="Type a message..." 
                            />
                            <Button 
                                onClick={() => sendMessageHandler(selectedUser?._id)}
                                disabled={!textMessage.trim()}
                                className='bg-[#0095F6] hover:bg-[#3192d2] h-11 w-11 rounded-full p-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                <Send className='w-5 h-5' />
                            </Button>
                        </div>
                    </section>
                ) : (
                    <div className='flex-1 flex flex-col items-center justify-center bg-gray-50'>
                        <div className='text-center p-8'>
                            <MessageCircleCode className='w-24 h-24 mx-auto text-gray-300 mb-4' />
                            <h1 className='font-semibold text-xl mb-2 text-gray-700'>Your messages</h1>
                            <p className='text-gray-500'>Select a conversation to start chatting</p>
                        </div>
                    </div>
                )
            }
        </div>
    )
}

export default ChatPage