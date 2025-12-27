import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import useGetAllMessage from '@/hooks/useGetAllMessage'
import useGetRTM from '@/hooks/useGetRTM'

const Messages = ({ selectedUser, isKeyboardOpen = false, onReply, replyTo }) => {
    useGetAllMessage();
    const {messages = []} = useSelector(store=>store.chat);
    const {user} = useSelector(store=>store.auth);
    const messagesEndRef = useRef(null);
    const [touchStates, setTouchStates] = useState({});
    const [hoveredMessageId, setHoveredMessageId] = useState(null);
    const lastMessageCountRef = useRef(0);

    // CSS for preventing overflow in all message elements
    const overflowPreventionStyle = {
        maxWidth: '100%',
        overflow: 'hidden',
        wordBreak: 'break-all',
        overflowWrap: 'break-word',
        textOverflow: 'clip'
    };

    // JavaScript-based overflow prevention - selective to preserve scrolling
    const preventOverflow = useCallback((element) => {
        if (!element) return;

        // Skip the main scrollable container to preserve scrolling
        if (element.classList.contains('overflow-y-auto')) {
            element.style.overflowY = 'auto';
            element.style.overflowX = 'hidden';
            return;
        }

        // Force the element to respect its container bounds
        element.style.maxWidth = '100%';
        element.style.overflowX = 'hidden';
        element.style.wordBreak = 'break-all';
        element.style.overflowWrap = 'break-word';
        element.style.whiteSpace = 'pre-wrap';
        element.style.textOverflow = 'clip';
        element.style.boxSizing = 'border-box';

        // Only apply overflow: hidden to text elements, not containers
        if (element.tagName === 'P' || element.tagName === 'SPAN' || element.tagName === 'DIV') {
            element.style.overflow = 'hidden';
        }

        // Force parent containers to constrain width only (preserve their overflow settings)
        let parent = element.parentElement;
        let depth = 0;
        while (parent && depth < 5 && !parent.classList.contains('overflow-y-auto')) {
            parent.style.maxWidth = '100%';
            parent.style.overflowX = 'hidden';
            parent.style.boxSizing = 'border-box';
            // Don't set overflow: hidden on parent containers to preserve scrolling
            parent = parent.parentElement;
            depth++;
        }
    }, []);

    // Ref callback for immediate overflow prevention
    const messageRef = useCallback((node) => {
        if (node) {
            // Apply to all text elements in this message
            const textElements = node.querySelectorAll('p, span, div');
            textElements.forEach(preventOverflow);

            // Apply to the message container itself
            preventOverflow(node);
        }
    }, [preventOverflow]);

    // Filter messages to only show messages between current user and selected user
    const filteredMessages = messages.filter(msg =>
        (msg.senderId === user?._id && msg.receiverId === selectedUser?._id) ||
        (msg.senderId === selectedUser?._id && msg.receiverId === user?._id)
    );

    // Sort by time (oldest first) - create a copy to avoid mutating read-only arrays
    const sortedMessages = [...filteredMessages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Only scroll to bottom when new messages are actually added
        const currentCount = sortedMessages.length;
        if (currentCount > lastMessageCountRef.current && currentCount > 0) {
            scrollToBottom();
        }
        lastMessageCountRef.current = currentCount;
    }, [sortedMessages]); // Keep dependency on sortedMessages to detect new messages

    // Apply overflow prevention to all message elements
    useEffect(() => {
        const messageContainer = document.querySelector('.overflow-y-auto');
        if (!messageContainer) return;

        const applyOverflowPrevention = () => {
            // Target specific message content elements only (avoid main container)
            const messageBubbles = messageContainer.querySelectorAll('.rounded-2xl');
            messageBubbles.forEach(bubble => {
                // Apply to text content within message bubbles
                const textElements = bubble.querySelectorAll('p, span');
                textElements.forEach(preventOverflow);

                // Apply to reply indicators
                const replyIndicators = bubble.querySelectorAll('.reply-indicator, [class*="border-l-"]');
                replyIndicators.forEach(preventOverflow);
            });

            // Apply to input preview area
            const replyPreview = messageContainer.querySelector('[class*="bg-blue-50"]');
            if (replyPreview) {
                const previewTexts = replyPreview.querySelectorAll('p, span');
                previewTexts.forEach(preventOverflow);
            }
        };

        // Apply immediately
        applyOverflowPrevention();

        // Use MutationObserver to handle dynamic content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'subtree') {
                    applyOverflowPrevention();
                }
            });
        });

        observer.observe(messageContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });

        // Also observe window resize to reapply constraints
        const handleResize = () => applyOverflowPrevention();
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, [preventOverflow]);

    // Touch handlers for mobile reply (right slide) - per message
    const handleTouchStart = (e, message) => {
        const touchStartX = e.touches[0].clientX;
        const touchStartY = e.touches[0].clientY;

        setTouchStates(prev => ({
            ...prev,
            [message._id]: {
                isDragging: true,
                touchStartX,
                touchStartY,
                slideOffset: 0
            }
        }));
    };

    const handleTouchMove = (e, message) => {
        const messageState = touchStates[message._id];
        if (!messageState?.isDragging) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - messageState.touchStartX;
        const deltaY = Math.abs(currentY - messageState.touchStartY);

        // Only allow right sliding if it's mostly horizontal
        if (deltaY < 30 && deltaX > 0) {
            // Limit the slide offset to prevent excessive movement
            const maxSlide = 80; // Maximum slide distance in pixels
            const offset = Math.min(deltaX, maxSlide);

            setTouchStates(prev => ({
                ...prev,
                [message._id]: {
                    ...prev[message._id],
                    slideOffset: offset
                }
            }));
        }
    };

    const handleTouchEnd = (e, message) => {
        const messageState = touchStates[message._id];
        if (!messageState?.isDragging) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - messageState.touchStartX;
        const deltaY = Math.abs(touchEndY - messageState.touchStartY);

        // Check if it's a right swipe (deltaX > 50) and not too much vertical movement
        if (deltaX > 50 && deltaY < 30) {
            e.preventDefault();
            onReply && onReply(message);
        }

        // Reset slide offset for this message
        setTouchStates(prev => ({
            ...prev,
            [message._id]: {
                ...prev[message._id],
                isDragging: false,
                slideOffset: 0
            }
        }));
    };

    const handleMouseEnter = (messageId) => {
        setHoveredMessageId(messageId);
    };

    const handleMouseLeave = () => {
        setHoveredMessageId(null);
    };

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
        <>
            {/* Global overflow prevention styles - selective to avoid breaking scroll */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    .messages-container .message-content,
                    .messages-container .message-content *,
                    .messages-container .reply-indicator,
                    .messages-container .reply-indicator * {
                        max-width: 100% !important;
                        overflow-x: hidden !important;
                        word-break: break-all !important;
                        overflow-wrap: break-word !important;
                        box-sizing: border-box !important;
                    }
                    .messages-container .message-content p,
                    .messages-container .message-content span,
                    .messages-container .reply-indicator p,
                    .messages-container .reply-indicator span {
                        text-overflow: clip !important;
                        white-space: pre-wrap !important;
                        overflow: hidden !important;
                    }
                    /* Preserve scrolling on main container */
                    .messages-container.overflow-y-auto {
                        overflow-y: auto !important;
                        overflow-x: hidden !important;
                    }
                `
            }} />
            <div className={`messages-container overflow-y-auto overflow-x-hidden bg-gray-50 ${isKeyboardOpen ? 'p-4 pb-24 pt-20 max-h-[calc(100vh-8rem)]' : 'flex-1 p-4'}`}
                 style={{
                   overflowY: 'auto',
                   overflowX: 'hidden',
                   contain: 'layout',
                   maxWidth: '100vw'
                 }}>
            {sortedMessages && Array.isArray(sortedMessages) && sortedMessages.length === 0 && (
                <div className={`flex justify-center items-center ${isKeyboardOpen ? 'h-[calc(100vh-8rem)]' : 'h-full'}`}>
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
            <div className='flex flex-col gap-3 w-full max-w-none px-2 sm:px-4 overflow-hidden'
                 style={{
                   maxWidth: '100%',
                   contain: 'layout',
                   overflowX: 'hidden',
                   overflowY: 'auto'
                 }}>
                {
                   (sortedMessages && Array.isArray(sortedMessages) && sortedMessages.length > 0) && sortedMessages.map((msg, index) => {
                        const isOwnMessage = msg.senderId === user?._id;
                        const showAvatar = !isOwnMessage;
                        const prevMessage = index > 0 ? sortedMessages[index - 1] : null;
                        const showTime = !prevMessage ||
                            new Date(msg.createdAt) - new Date(prevMessage.createdAt) > 5 * 60 * 1000; // 5 minutes

                        return (
                            <div
                                key={`${msg._id}-responsive`}
                                ref={messageRef}
                                className={`flex items-end gap-2 overflow-hidden ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                style={{
                                    maxWidth: '100%',
                                    contain: 'layout',
                                    transform: touchStates[msg._id]?.slideOffset > 0 ? `translateX(${touchStates[msg._id].slideOffset}px)` : 'none',
                                    transition: touchStates[msg._id]?.slideOffset === 0 ? 'transform 0.2s ease-out' : 'none'
                                }}
                            >
                                {showAvatar && (
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarImage src={selectedUser?.profilePicture} alt='profile' />
                                        <AvatarFallback className='text-xs'>{selectedUser?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                )}
                                {!showAvatar && <div className='w-8'></div>}
                                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} w-full max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[75%] xl:max-w-[70%] overflow-hidden`}
                                     style={{maxWidth: '90%', contain: 'layout', overflow: 'hidden'}}>
                                    {showTime && (
                                        <span className='text-xs text-gray-400 px-2 mb-1' style={overflowPreventionStyle}>
                                            {formatTime(msg.createdAt)}
                                        </span>
                                    )}
                                    {/* Reply indicator */}
                                    {msg.replyTo && (
                                        <div className={`reply-indicator mb-2 px-3 py-2 rounded-lg max-w-[85%] sm:max-w-[80%] overflow-hidden ${
                                            // Style based on who the original message belongs to
                                            msg.replyTo.senderId === user._id
                                                ? 'bg-blue-50 border-l-4 border-l-[#0095F6] ml-2'
                                                : isOwnMessage
                                                    ? 'bg-blue-50 border-l-4 border-l-[#0095F6] ml-2'
                                                    : 'bg-gray-50 border-l-4 border-l-gray-400 mr-2'
                                        }`} style={{maxWidth: '85%', wordBreak: 'break-word'}}>
                                            <div className='flex items-center gap-2 mb-1 min-w-0'>
                                                <span className={`text-xs font-medium truncate ${
                                                    msg.replyTo.senderId === user._id ? 'text-[#0095F6]' : isOwnMessage ? 'text-[#0095F6]' : 'text-gray-600'
                                                }`}>
                                                    Replying to
                                                </span>
                                                <span className={`text-xs truncate ${
                                                    msg.replyTo.senderId === user._id ? 'text-[#0095F6]' : isOwnMessage ? 'text-[#0095F6]' : 'text-gray-500'
                                                }`}>
                                                    {msg.replyTo.senderId === user._id ? 'You' : selectedUser?.username}
                                                </span>
                                            </div>
                                            <div className={`p-2 rounded border-l-2 mb-2 ${
                                                // Style the quoted text based on who the original message belongs to
                                                msg.replyTo.senderId === user._id
                                                    ? 'bg-[#0095F6]/10 border-[#0095F6] text-gray-800' // User's message being replied to
                                                    : 'bg-gray-100 border-gray-300 text-gray-700' // Someone else's message being replied to
                                            }`}>
                                                <p className='text-sm break-words'
                                                   style={overflowPreventionStyle}
                                                   title={msg.replyText || msg.replyTo.message}>
                                                    {msg.replyText || msg.replyTo.message}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        className={`message-content group relative rounded-2xl shadow-sm cursor-pointer transition-all duration-200 overflow-hidden ${
                                            isOwnMessage
                                                ? 'bg-[#0095F6] text-white rounded-br-md hover:bg-[#0088E6]'
                                                : 'bg-white text-gray-900 rounded-bl-md border border-gray-200 hover:bg-gray-50'
                                        } ${hoveredMessageId === msg._id ? 'ring-1 ring-blue-300' : ''} ${touchStates[msg._id]?.slideOffset > 0 ? 'ring-2 ring-blue-400 shadow-lg' : ''} ${msg.replyTo ? 'ring-1 ring-blue-200' : ''}`}
                                        onTouchStart={(e) => handleTouchStart(e, msg)}
                                        onTouchMove={(e) => handleTouchMove(e, msg)}
                                        onTouchEnd={(e) => handleTouchEnd(e, msg)}
                                        onMouseEnter={() => handleMouseEnter(msg._id)}
                                        onMouseLeave={handleMouseLeave}
                                    >
                                        <div className='flex items-start gap-2 px-3 py-2 sm:px-4 sm:py-2'>
                                            {/* Desktop Reply Icon - Always visible on left */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onReply && onReply(msg);
                                                }}
                                                className={`flex-shrink-0 p-1.5 rounded-full transition-colors duration-200 mt-0.5 ${
                                                    isOwnMessage
                                                        ? 'hover:bg-white/20 text-white/70 hover:text-white'
                                                        : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                                                } hidden md:block`}
                                                title="Reply to this message"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"/>
                                                </svg>
                                            </button>

                                            <p className='text-sm leading-relaxed break-all overflow-wrap-break-word word-break-break-all hyphens-auto flex-1 max-w-full'
                                               style={{
                                                   wordBreak: 'break-all',
                                                   overflowWrap: 'break-word',
                                                   maxWidth: '100%',
                                                   overflow: 'hidden',
                                                   whiteSpace: 'pre-wrap',
                                                   textOverflow: 'clip',
                                                   contain: 'layout'
                                               }}>
                                                {msg.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                }
                <div ref={messagesEndRef} />
            </div>
        </div>
        </>
    )
}

export default Messages