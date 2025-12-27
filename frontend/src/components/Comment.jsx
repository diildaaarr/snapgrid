import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useSelector } from 'react-redux'

const Comment = ({ comment, onReply }) => {
    const { user } = useSelector(store => store.auth);

    const formatTime = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const day = date.getDate();
            const year = date.getFullYear();
            const hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12; // Convert to 12-hour format

            // Always show full date and time
            return `${month} ${day}, ${year} at ${displayHours}:${minutes} ${ampm}`;
        } catch (error) {
            return '';
        }
    };

    return (
        <div className='flex gap-3 group hover:bg-gray-50 p-2 rounded-lg transition-colors'>
            <Link to={`/profile/${comment?.author?._id}`} className='flex-shrink-0'>
                <Avatar className='w-9 h-9 border border-gray-200'>
                    <AvatarImage src={comment?.author?.profilePicture} />
                    <AvatarFallback className='text-xs'>
                        {comment?.author?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                </Avatar>
            </Link>
            <div className='flex-1 min-w-0'>
                {/* Reply indicator */}
                {comment?.replyTo && (() => {
                    // Check if the current user is the author of the original comment
                    const isReplyingToOwnComment = comment?.replyTo?.author?._id === user?._id;
                    const isOwnComment = comment?.author?._id === user?._id;

                    return (
                        <div className={`mb-2 px-3 py-2 rounded-lg max-w-[80%] overflow-hidden ${
                            isReplyingToOwnComment
                                ? 'bg-blue-50 border-l-4 border-l-[#0095F6]'
                                : 'bg-gray-50 border-l-4 border-l-gray-400'
                        }`}>
                            <div className='flex items-center gap-2 mb-1'>
                                <span className={`text-xs font-medium ${
                                    isReplyingToOwnComment ? 'text-[#0095F6]' : 'text-gray-600'
                                }`}>
                                    Replying to
                                </span>
                                <span className={`text-xs ${
                                    isReplyingToOwnComment ? 'text-[#0095F6]' : 'text-gray-500'
                                }`}>
                                    {comment?.replyTo?.author?.username || 'Unknown'}
                                </span>
                            </div>
                            <div className={`p-2 rounded border-l-2 mb-2 ${
                                isReplyingToOwnComment
                                    ? 'bg-[#0095F6]/10 border-[#0095F6] text-gray-800' // User's comment being replied to
                                    : 'bg-gray-100 border-gray-300 text-gray-700' // Someone else's comment being replied to
                            }`}>
                                <p className='text-sm break-words'
                                   title={comment.replyText || comment.replyTo.text}>
                                    {comment.replyText || comment.replyTo.text}
                                </p>
                            </div>
                        </div>
                    );
                })()}

                <div className='flex items-start gap-2'>
                    <div className='flex-1'>
                        <Link
                            to={`/profile/${comment?.author?._id}`}
                            className='font-semibold text-sm hover:underline inline-block mr-2'
                        >
                            {comment?.author?.username}
                        </Link>
                        <span className='comment-content text-sm text-gray-800 break-words overflow-wrap-break-word word-break-break-all'
                              style={{
                                  wordBreak: 'break-all',
                                  overflowWrap: 'break-word',
                                  maxWidth: '100%'
                              }}>
                            {comment?.text}
                        </span>
                    </div>
                </div>
                <div className='flex items-center justify-between mt-1'>
                    <p className='text-xs text-gray-400'>
                        {formatTime(comment?.createdAt)}
                    </p>
                    {onReply && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onReply(comment);
                            }}
                            className='flex-shrink-0 p-1.5 rounded-full transition-colors duration-200 hover:bg-gray-200 text-gray-400 hover:text-blue-500'
                            title="Reply to this comment"
                        >
                            <MessageCircle className='w-4 h-4' />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Comment