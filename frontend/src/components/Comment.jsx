import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Link } from 'react-router-dom'

const Comment = ({ comment }) => {
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
                <div className='flex items-start gap-2'>
                    <div className='flex-1'>
                        <Link 
                            to={`/profile/${comment?.author?._id}`}
                            className='font-semibold text-sm hover:underline inline-block mr-2'
                        >
                            {comment?.author?.username}
                        </Link>
                        <span className='text-sm text-gray-800 break-words'>{comment?.text}</span>
                    </div>
                </div>
                <p className='text-xs text-gray-400 mt-1 ml-0'>
                    {formatTime(comment?.createdAt)}
                </p>
            </div>
        </div>
    )
}

export default Comment