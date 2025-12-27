import React, { useState, useCallback } from 'react'
import { Heart, MessageCircle, X } from 'lucide-react'
import { FaHeart } from 'react-icons/fa'
import api from '@/lib/api'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import CommentDialog from './CommentDialog'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

const ProfilePostGrid = ({ posts = [] }) => {
    const [updatedPosts, setUpdatedPosts] = useState({})
    const [commentDialogOpen, setCommentDialogOpen] = useState(false)
    const [selectedPost, setSelectedPost] = useState(null)
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
    const [selectedPhoto, setSelectedPhoto] = useState(null)
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
            const res = await api.get(`/post/${post._id}/${action}`)
            
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

    const handlePhotoClick = (post) => {
        setSelectedPhoto(post)
        setPhotoViewerOpen(true)
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
                        onClick={() => handlePhotoClick(post)}
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
                            const res = await api.get(`/post/${post._id}/${action}`)

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

            {/* Photo Viewer Modal */}
            <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] max-h-[95vh] p-0 bg-transparent border-none overflow-hidden">
                    <DialogTitle className="sr-only">View Photo</DialogTitle>
                    <div className='relative flex items-center justify-center w-full h-full'>
                        <button
                            onClick={() => setPhotoViewerOpen(false)}
                            className='absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors'
                        >
                            <X className='w-6 h-6' />
                        </button>
                        {selectedPhoto && (
                            <img
                                src={selectedPhoto.image}
                                alt="post_img_full"
                                className='max-w-full max-h-[90vh] object-contain rounded-lg'
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default ProfilePostGrid
