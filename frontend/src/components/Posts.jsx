import React from 'react'
import Post from './Post'
import { useSelector } from 'react-redux'
import { Loader2 } from 'lucide-react'

const Posts = () => {
  const {posts} = useSelector(store=>store.post);
  
  return (
    <div className='space-y-6'>
        {posts.length > 0 ? (
          posts.map((post) => (
            <div key={post._id} className='animate-fade-in'>
              <Post post={post} />
            </div>
          ))
        ) : (
          <div className='text-center py-12 text-gray-500'>
            <p>No posts available</p>
          </div>
        )}
    </div>
  )
}

export default Posts