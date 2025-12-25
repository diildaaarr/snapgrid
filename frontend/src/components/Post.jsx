import React, { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from './ui/dialog'
import { Bookmark, MessageCircle, MoreHorizontal, Send, X } from 'lucide-react'
import { Button } from './ui/button'
import { FaHeart, FaRegHeart } from "react-icons/fa";
import CommentDialog from './CommentDialog'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'sonner'
import { setPosts, setSelectedPost } from '@/redux/postSlice'
import { setAuthUser, setSelectedUser } from '@/redux/authSlice'
import { Badge } from './ui/badge'

const Post = ({ post }) => {
    const [text, setText] = useState("");
    const [open, setOpen] = useState(false);
    const [imageOpen, setImageOpen] = useState(false);
    const { user } = useSelector(store => store.auth);
    const { posts } = useSelector(store => store.post);
    const [liked, setLiked] = useState(post.likes.includes(user?._id) || false);
    const [postLike, setPostLike] = useState(post.likes.length);
    const [comment, setComment] = useState(post.comments);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Check if post is bookmarked
    useEffect(() => {
        if (user?.bookmarks) {
            const bookmarked = user.bookmarks.some(bookmarkId => bookmarkId.toString() === post._id.toString());
            setIsBookmarked(bookmarked);
        }
    }, [user?.bookmarks, post._id]);

    const changeEventHandler = (e) => {
        const inputText = e.target.value;
        if (inputText.trim()) {
            setText(inputText);
        } else {
            setText("");
        }
    }

    const likeOrDislikeHandler = async () => {
        try {
            const action = liked ? 'dislike' : 'like';
            const res = await axios.get(`https://snapgrid-r8kd.onrender.com/api/v1/post/${post._id}/${action}`, { withCredentials: true });
            console.log(res.data);
            if (res.data.success) {
                const updatedLikes = liked ? postLike - 1 : postLike + 1;
                setPostLike(updatedLikes);
                setLiked(!liked);

                // Don't dispatch setPosts to avoid changing the global order of posts
                // The posts order should be maintained as received from the backend
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
        }
    }

    const commentHandler = async () => {

        try {
            const res = await axios.post(`https://snapgrid-r8kd.onrender.com/api/v1/post/${post._id}/comment`, { text }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            });
            console.log(res.data);
            if (res.data.success) {
                const updatedCommentData = [...comment, res.data.comment];
                setComment(updatedCommentData);

                // Don't dispatch setPosts to avoid changing the global order of posts
                // The posts order should be maintained as received from the backend
                // Removed toast success message as requested
                setText("");
            }
        } catch (error) {
            console.log(error);
        }
    }

    const deletePostHandler = async () => {
        try {
            const res = await axios.delete(`https://snapgrid-r8kd.onrender.com/api/v1/post/delete/${post?._id}`, { withCredentials: true })
            if (res.data.success) {
                const updatedPostData = posts.filter((postItem) => postItem?._id !== post?._id);
                dispatch(setPosts(updatedPostData));
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response.data.messsage);
        }
    }

    const bookmarkHandler = async () => {
        try {
            const res = await axios.get(`https://snapgrid-r8kd.onrender.com/api/v1/post/${post?._id}/bookmark`, {withCredentials:true});
            if(res.data.success){
                // Update bookmark state
                setIsBookmarked(res.data.type === 'saved');
                
                // Update user's bookmarks in Redux
                if (user) {
                    const updatedUser = { ...user };
                    if (res.data.type === 'saved') {
                        // Add to bookmarks
                        updatedUser.bookmarks = [...(updatedUser.bookmarks || []), post._id];
                    } else {
                        // Remove from bookmarks
                        updatedUser.bookmarks = (updatedUser.bookmarks || []).filter(
                            bookmarkId => bookmarkId.toString() !== post._id.toString()
                        );
                    }
                    dispatch(setAuthUser(updatedUser));
                }
                
                // Don't dispatch setPosts to avoid changing the global order of posts
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error('Failed to update bookmark');
        }
    }
    return (
        <div className='w-full border border-gray-200 rounded-xl p-3 sm:p-5 bg-white shadow-sm hover:shadow-md transition-shadow duration-200'>
            <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                    <Link to={`/profile/${post.author?._id}`} className='flex-shrink-0'>
                        <Avatar className='border border-gray-200 w-8 h-8 sm:w-10 sm:h-10 cursor-pointer'>
                            <AvatarImage src={post.author?.profilePicture} alt="post_image" />
                            <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                    </Link>
                    <div className='flex items-center gap-2 sm:gap-3'>
                        <Link to={`/profile/${post.author?._id}`} className='font-semibold text-sm sm:text-base hover:underline cursor-pointer'>{post.author?.username}</Link>
                       {user?._id === post.author._id &&  <Badge variant="secondary" className='text-xs'>Author</Badge>}
                    </div>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <MoreHorizontal className='cursor-pointer hover:text-gray-600 transition-colors' />
                    </DialogTrigger>
                    <DialogContent className="flex flex-col items-center text-sm text-center gap-2 p-4 max-w-[90vw] sm:max-w-md">
                        <DialogTitle className="sr-only">Post Options</DialogTitle>
                        {
                        post?.author?._id !== user?._id && (
                            <>
                                <Button 
                                    variant='ghost' 
                                    className={`cursor-pointer w-full font-semibold hover:bg-gray-100 ${
                                        user?.following?.some(id => id.toString() === post.author._id.toString()) 
                                            ? 'text-[#ED4956]' 
                                            : 'text-[#0095F6]'
                                    }`}
                                    onClick={async () => {
                                        try {
                                            const res = await axios.post(`https://snapgrid-r8kd.onrender.com/api/v1/user/followorunfollow/${post.author._id}`, {}, { withCredentials: true });
                                            if (res.data.success) {
                                                if (user) {
                                                    const updatedUser = { ...user };
                                                    if (res.data.action === 'unfollow') {
                                                        updatedUser.following = (updatedUser.following || []).filter(id => id.toString() !== post.author._id.toString());
                                                    } else {
                                                        updatedUser.following = [...(updatedUser.following || []), post.author._id];
                                                    }
                                                    dispatch(setAuthUser(updatedUser));
                                                }
                                                toast.success(res.data.message);
                                            }
                                        } catch (error) {
                                            console.error('Follow/Unfollow error:', error);
                                            toast.error('Failed to update follow status');
                                        }
                                    }}
                                >
                                    {user?.following?.some(id => id.toString() === post.author._id.toString()) ? 'Unfollow' : 'Follow'}
                                </Button>
                                <Button 
                                    variant='ghost' 
                                    className="cursor-pointer w-full font-semibold hover:bg-gray-100"
                                    onClick={bookmarkHandler}
                                >
                                    {isBookmarked ? 'Remove from Bookmarks' : 'Save to Bookmarks'}
                                </Button>
                            </>
                        )
                        }
                        {
                            user && user?._id === post?.author._id && (
                                <>
                                    <Button 
                                        variant='ghost' 
                                        className="cursor-pointer w-full font-semibold hover:bg-gray-100"
                                        onClick={bookmarkHandler}
                                    >
                                        {isBookmarked ? 'Remove from Bookmarks' : 'Save to Bookmarks'}
                                    </Button>
                                    <Button 
                                        onClick={deletePostHandler} 
                                        variant='ghost' 
                                        className="cursor-pointer w-full text-[#ED4956] font-bold hover:bg-red-50"
                                    >
                                        Delete
                                    </Button>
                                </>
                            )
                        }
                    </DialogContent>
                </Dialog>
            </div>
            {/* Image with click to view full size */}
            <div className='relative my-2'>
                <img
                    className='rounded-lg w-full max-h-[500px] object-contain bg-gray-100 cursor-pointer shadow-sm'
                    src={post.image}
                    alt="post_img"
                    onClick={() => setImageOpen(true)}
                />
            </div>

            {/* Image Lightbox Dialog */}
            <Dialog open={imageOpen} onOpenChange={setImageOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] max-h-[95vh] p-0 bg-transparent border-none overflow-hidden">
                    <DialogTitle className="sr-only">View Image</DialogTitle>
                    <div className='relative flex items-center justify-center w-full h-full'>
                        <button 
                            onClick={() => setImageOpen(false)}
                            className='absolute top-2 right-2 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors'
                        >
                            <X className='w-6 h-6' />
                        </button>
                        <img
                            src={post.image}
                            alt="post_img_full"
                            className='max-w-full max-h-[90vh] object-contain rounded-lg'
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <div className='flex items-center justify-between my-2'>
                <div className='flex items-center gap-2 sm:gap-3'>
                    {
                        liked ? <FaHeart onClick={likeOrDislikeHandler} size={'24'} className='cursor-pointer text-red-600' /> : <FaRegHeart onClick={likeOrDislikeHandler} size={'22px'} className='cursor-pointer hover:text-gray-600' />
                    }

                    <MessageCircle onClick={() => {
                        dispatch(setSelectedPost(post));
                        setOpen(true);
                    }} className='cursor-pointer hover:text-gray-600' />
                    <Send className='cursor-pointer hover:text-gray-600' />
                </div>
                <Bookmark 
                    onClick={bookmarkHandler} 
                    className={`cursor-pointer transition-colors ${
                        isBookmarked 
                            ? 'fill-black text-black' 
                            : 'hover:text-gray-600'
                    }`}
                />
            </div>
            <span className='font-medium block mb-2 text-sm sm:text-base'>{postLike} likes</span>
            <p className='text-sm sm:text-base'>
                <span className='font-medium mr-2'>{post.author?.username}</span>
                {post.caption}
            </p>
            {
                comment.length > 0 && (
                    <span onClick={() => {
                        dispatch(setSelectedPost(post));
                        setOpen(true);
                    }} className='cursor-pointer text-sm text-gray-400'>View all {comment.length} comments</span>
                )
            }
            <CommentDialog open={open} setOpen={setOpen} />
            <div className='flex items-center justify-between'>
                <input
                    type="text"
                    placeholder='Add a comment...'
                    value={text}
                    onChange={changeEventHandler}
                    className='outline-none text-sm w-full'
                />
                {
                    text && <span onClick={commentHandler} className='text-[#3BADF8] cursor-pointer'>Post</span>
                }

            </div>
        </div>
    )
}

export default Post