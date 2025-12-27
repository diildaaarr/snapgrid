import React, { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import useGetAllMessage from '@/hooks/useGetAllMessage'
import useGetRTM from '@/hooks/useGetRTM'

const Messages = ({ selectedUser }) => {
    useGetAllMessage();
    const {messages = []} = useSelector(store=>store.chat);
    const {user} = useSelector(store=>store.auth);
    const messagesEndRef = useRef(null);

    // Filter messages to only show messages between current user and selected user
    const filteredMessages = messages.filter(msg => 
        (msg.senderId === user?._id && msg.receiverId === selectedUser?._id) ||
        (msg.senderId === selectedUser?._id && msg.receiverId === user?._id)
    );

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [filteredMessages]);

    const formatTime = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInHours = (now - date) / (1000 * 60 * 60);
            
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            
            if (diffInHours < 24) {
                return `${hours}:${minutes}`;
            } else {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = months[date.getMonth()];
                const day = date.getDate();
                return `${month} ${day}, ${hours}:${minutes}`;
            }
        } catch (error) {
            return '';
        }
    };

    return (
        <div className='overflow-y-auto flex-1 p-4 bg-gray-50'>
            {filteredMessages && Array.isArray(filteredMessages) && filteredMessages.length === 0 && (
                <div className='flex justify-center items-center h-full'>
                    <div className='flex flex-col items-center justify-center text-center p-8'>
                        <Avatar className="h-24 w-24 mb-4 border-4 border-white shadow-lg">
                            <AvatarImage src={selectedUser?.profilePicture} alt='profile' />
                            <AvatarFallback className='text-2xl'>{selectedUser?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <h3 className='font-semibold text-lg mb-1'>{selectedUser?.username}</h3>
                        <p className='text-gray-500 text-sm mb-4'>This is the beginning of your conversation</p>
                        <Link to={`/profile/${selectedUser?._id}`}>
                            <Button variant="outline" className="border-gray-300">
                                View Profile
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
            <div className='flex flex-col gap-3 max-w-4xl mx-auto'>
                {
                   (filteredMessages && Array.isArray(filteredMessages) && filteredMessages.length > 0) && filteredMessages.map((msg, index) => {
                        const isOwnMessage = msg.senderId === user?._id;
                        const showAvatar = !isOwnMessage;
                        const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
                        const showTime = !prevMessage ||
                            new Date(msg.createdAt) - new Date(prevMessage.createdAt) > 5 * 60 * 1000; // 5 minutes
                        
                        return (
                            <div key={msg._id} className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                {showAvatar && (
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarImage src={selectedUser?.profilePicture} alt='profile' />
                                        <AvatarFallback className='text-xs'>{selectedUser?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                )}
                                {!showAvatar && <div className='w-8'></div>}
                                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                    {showTime && (
                                        <span className='text-xs text-gray-400 px-2 mb-1'>
                                            {formatTime(msg.createdAt)}
                                        </span>
                                    )}
                                    <div className={`px-4 py-2 rounded-2xl break-words shadow-sm ${
                                        isOwnMessage 
                                            ? 'bg-[#0095F6] text-white rounded-br-md' 
                                            : 'bg-white text-gray-900 rounded-bl-md border border-gray-200'
                                    }`}>
                                        <p className='text-sm leading-relaxed'>{msg.message}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                }
                <div ref={messagesEndRef} />
            </div>
        </div>  
    )
}

export default Messages