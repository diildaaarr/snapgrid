import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom';
import SuggestedUsers from './SuggestedUsers';

const RightSidebar = () => {
  const { user } = useSelector(store => store.auth);
  return (
    <div className='w-80 my-10 pr-8 sticky top-20'>
      <div className='flex items-center gap-3 mb-6 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 bg-white shadow-sm'>
        <Link to={`/profile/${user?._id}`} className='flex-shrink-0'>
          <Avatar className='w-14 h-14 border-2 border-gray-100'>
            <AvatarImage src={user?.profilePicture} alt="post_image" />
            <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
        </Link>
        <div className='flex-1 min-w-0'>
          <Link to={`/profile/${user?._id}`}>
            <h1 className='font-semibold text-sm hover:underline truncate'>{user?.username}</h1>
          </Link>
          <span className='text-gray-600 text-xs truncate block'>{user?.bio || 'Welcome to SnapGrid'}</span>
        </div>
      </div>
      <SuggestedUsers/>
    </div>
  )
}

export default RightSidebar