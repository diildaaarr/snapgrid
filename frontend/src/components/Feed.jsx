import React from 'react'
import Posts from './Posts'
import { useSelector } from 'react-redux'
import { Loader2 } from 'lucide-react'

const Feed = () => {
  const { posts } = useSelector(store => store.post);
  const { user } = useSelector(store => store.auth);
  
  return (
    <div className='flex-1 flex flex-col items-center pt-4 sm:pt-6 pb-12 px-2 sm:px-4'>
      {/* Welcome Header */}
      {user && (
        <div className='w-full max-w-2xl mb-4 sm:mb-6 px-2 sm:px-0'>
          <h1 className='text-xl sm:text-2xl font-semibold text-gray-800 mb-1'>
            Welcome back, {user.username}! 
          </h1>
          <p className='text-gray-500 text-xs sm:text-sm'>Discover what's happening in your network</p>
        </div>
      )}

      {/* Posts Section */}
      <div className='w-full max-w-2xl px-1 sm:px-0'>
        {posts.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-16 text-center'>
            <div className='w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4'>
              <svg className='w-12 h-12 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' />
              </svg>
            </div>
            <h3 className='text-lg font-semibold text-gray-700 mb-2'>No posts yet</h3>
            <p className='text-gray-500 text-sm max-w-sm'>
              Start following people to see their posts in your feed, or create your own post!
            </p>
          </div>
        ) : (
          <Posts />
        )}
      </div>
    </div>
  )
}

export default Feed