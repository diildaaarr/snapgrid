import React, { useState, useCallback } from 'react'
import { Heart, MessageCircle } from 'lucide-react'
import { FaHeart } from 'react-icons/fa'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import CommentDialog from './CommentDialog'

const ProfilePostGrid = ({ posts = [] }) => {
    const [updatedPosts, setUpdatedPosts] = useState({})
    const [commentDialogOpen, setCommentDialogOpen] = useState(false)
    const [selectedPost, setSelectedPost] = useState(null)
    const { user } = useSelector(store => store.auth)
    const dispatch = useDispatch()

    // Get the current state of a post (use updated version if available, otherwise use original)
    const getPostData = useCallback((post) => {
        return updatedPosts[post._id] || post
    }, [updatedPosts])

    const likeOrDislikeHandler = async (e, post) => {
        e.stopPropagation()
        try {
            const currentPost = getPostData(post)
            const isLiked = (currentPost.likes || []).includes(user?._id)
            const action = isLiked ? 'dislike' : 'like'
            const res = await axios.get(
                `https://snapgrid-r8kd.onrender.com/api/v1/post/${post._id}/${action}`,
                { withCredentials: true }
            )
            
            if (res.data.success) {
                // Update the local post data with new likes
                const updatedPost = {
                    ...currentPost,
                    likes: isLiked 
                        ? currentPost.likes.filter(id => id !== user?._id)
                        : [...(currentPost.likes || []), user?._id]
                }
                setUpdatedPosts(prev => ({
                    ...prev,
                    [post._id]: updatedPost
                }))
                toast.success(res.data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error('Failed to update like')
        }
    }

    const handleCommentClick = (e, post) => {
        e.stopPropagation()
        const currentPost = getPostData(post)
        setSelectedPost(currentPost)
        setCommentDialogOpen(true)
    }

    if (!posts || posts.length === 0) {
        return (
            <div className='text-center py-12 text-gray-400'>
                <p>No posts yet</p>
            </div>
        )
    }

    return (
        <>
            <div className='grid grid-cols-3 gap-1 sm:gap-3'>
                {posts.map((post) => {
                    const currentPost = getPostData(post)
                    const isLiked = (currentPost.likes || []).includes(user?._id)
                    const likeCount = currentPost.likes?.length || 0
                    const commentCount = currentPost.comments?.length || 0
                    
                    return (
                    <div
                        key={post._id}
                        className='group relative w-full aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer'
                    >
                        <img
                            src={post.image}
                            alt="post"
                            className='w-full h-full object-cover'
                        />
                        
                        {/* Hover Overlay */}
                        <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 sm:gap-8'>
                            <div
                                onClick={(e) => likeOrDislikeHandler(e, post)}
                                className='flex items-center gap-2 sm:gap-3 text-white cursor-pointer hover:scale-110 transition-transform duration-150'
                            >
                                {isLiked ? (
                                    <FaHeart className='w-6 h-6 sm:w-8 sm:h-8 text-[#ED4956]' />
                                ) : (
                                    <Heart className='w-6 h-6 sm:w-8 sm:h-8' fill='white' />
                                )}
                                <span className='text-sm sm:text-base font-semibold'>
                                    {likeCount}
                                </span>
                            </div>

                            <div
                                onClick={(e) => handleCommentClick(e, post)}
                                className='flex items-center gap-2 sm:gap-3 text-white cursor-pointer hover:scale-110 transition-transform duration-150'
                            >
                                <MessageCircle className='w-6 h-6 sm:w-8 sm:h-8' fill='white' />
                                <span className='text-sm sm:text-base font-semibold'>
                                    {commentCount}
                                </span>
                            </div>
                        </div>
                    </div>
                    )
                })}
            </div>

            {/* Comment Dialog */}
            {selectedPost && (
                <CommentDialog
                    open={commentDialogOpen}
                    setOpen={setCommentDialogOpen}
                    post={selectedPost}
                    onLikeHandler={async (post) => {
                        const currentPost = getPostData(post)
                        const isLiked = (currentPost.likes || []).includes(user?._id)
                        const action = isLiked ? 'dislike' : 'like'
                        try {
                            const res = await axios.get(
                                `https://snapgrid-r8kd.onrender.com/api/v1/post/${post._id}/${action}`,
                                { withCredentials: true }
                            )
                            
                            if (res.data.success) {
                                // Update the local post data with new likes from server response
                                const updatedPost = {
                                    ...currentPost,
                                    likes: res.data.likes || []
                                }
                                setUpdatedPosts(prev => ({
                                    ...prev,
                                    [post._id]: updatedPost
                                }))
                                toast.success(res.data.message)
                            }
                        } catch (error) {
                            console.log(error)
                            toast.error('Failed to update like')
                        }
                    }}
                />
            )}
        </>
    )
}

export default ProfilePostGrid
