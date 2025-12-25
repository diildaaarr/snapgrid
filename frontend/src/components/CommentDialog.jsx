import React, { useEffect, useState, useRef } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from './ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Link, useNavigate } from 'react-router-dom'
import { MoreHorizontal, Heart, Send, MessageCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useDispatch, useSelector } from 'react-redux'
import Comment from './Comment'
import axios from 'axios'
import { toast } from 'sonner'
import { setPosts } from '@/redux/postSlice'
import { setAuthUser, setSelectedUser } from '@/redux/authSlice'

const CommentDialog = ({ open, setOpen }) => {
  const [text, setText] = useState("");
  const { selectedPost, posts } = useSelector(store => store.post);
  const { user } = useSelector(store => store.auth);
  const [comment, setComment] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const commentsEndRef = useRef(null);

  useEffect(() => {
    if (selectedPost) {
      setComment(selectedPost.comments || []);
      setLikeCount(selectedPost.likes?.length || 0);
      setLiked(selectedPost.likes?.includes(user?._id) || false);
      setIsBookmarked(user?.bookmarks?.some(id => id.toString() === selectedPost._id.toString()) || false);
    }
  }, [selectedPost, user?._id, user?.bookmarks]);

  useEffect(() => {
    if (open && commentsEndRef.current && selectedPost) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comment, open, selectedPost]);

  const changeEventHandler = (e) => {
    setText(e.target.value);
  }

  const sendMessageHandler = async () => {
    if (!text.trim() || !selectedPost) return;
    
    try {
      const res = await axios.post(
        `https://snapgrid-r8kd.onrender.com/api/v1/post/${selectedPost?._id}/comment`, 
        { text }, 
        {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );

      if (res.data.success) {
        const updatedCommentData = [...comment, res.data.comment];
        setComment(updatedCommentData);

        const updatedPostData = posts.map(p =>
          p._id === selectedPost._id ? { ...p, comments: updatedCommentData } : p
        );
        dispatch(setPosts(updatedPostData));
        toast.success(res.data.message);
        setText("");
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error(error.response?.data?.message || "Failed to post comment");
    }
  }

  const likeOrDislikeHandler = async () => {
    if (!selectedPost) return;
    
    try {
      const action = liked ? 'dislike' : 'like';
      const res = await axios.get(`https://snapgrid-r8kd.onrender.com/api/v1/post/${selectedPost._id}/${action}`, { withCredentials: true });
      if (res.data.success) {
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
        
        const updatedPostData = posts.map(p =>
          p._id === selectedPost._id ? {
            ...p,
            likes: liked ? p.likes.filter(id => id !== user?._id) : [...(p.likes || []), user?._id]
          } : p
        );
        dispatch(setPosts(updatedPostData));
      }
    } catch (error) {
      console.log(error);
    }
  }

  // Early return if selectedPost is null
  if (!selectedPost) {
    return null; // or return a loading spinner/placeholder
  }

  // Check if current user is the author
  const isAuthor = user && selectedPost?.author?._id === user._id;
  const isFollowing = user?.following?.some(id => 
    id.toString() === selectedPost?.author?._id?.toString()
  ) || false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent onInteractOutside={() => setOpen(false)} className="max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">Comments</DialogTitle>
        <div className='flex flex-1 min-h-0'>
          {/* Image Section */}
          <div className='w-1/2 hidden md:block bg-black'>
            <img
              src={selectedPost?.image}
              alt="post_img"
              className='w-full h-full object-contain'
            />
          </div>
          
          {/* Comments Section */}
          <div className='w-full md:w-1/2 flex flex-col bg-white'>
            {/* Header */}
            <div className='flex items-center justify-between p-4 border-b border-gray-200'>
              <div className='flex gap-3 items-center'>
                <Link to={`/profile/${selectedPost?.author?._id}`} onClick={() => setOpen(false)}>
                  <Avatar className='w-10 h-10 border-2 border-gray-100'>
                    <AvatarImage src={selectedPost?.author?.profilePicture} />
                    <AvatarFallback className='text-sm'>
                      {selectedPost?.author?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link 
                    to={`/profile/${selectedPost?.author?._id}`}
                    onClick={() => setOpen(false)}
                    className='font-semibold text-sm hover:underline block'
                  >
                    {selectedPost?.author?.username}
                  </Link>
                  {selectedPost?.caption && (
                    <p className='text-sm text-gray-600 mt-1 line-clamp-2'>{selectedPost.caption}</p>
                  )}
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <MoreHorizontal className='cursor-pointer hover:text-gray-600 transition-colors' />
                </DialogTrigger>
                <DialogContent className="flex flex-col items-center text-sm text-center gap-2 p-4">
                  <DialogTitle>Post Options</DialogTitle>
                  {!isAuthor && (
                    <Button 
                      variant='ghost' 
                      className={`cursor-pointer w-full font-semibold hover:bg-gray-100 ${
                        isFollowing ? 'text-[#ED4956]' : 'text-[#0095F6]'
                      }`}
                      onClick={async () => {
                        try {
                          const res = await axios.post(
                            `https://snapgrid-r8kd.onrender.com/api/v1/user/followorunfollow/${selectedPost.author._id}`, 
                            {}, 
                            { withCredentials: true }
                          );
                          if (res.data.success) {
                            if (user) {
                              const updatedUser = { ...user };
                              if (res.data.action === 'unfollow') {
                                updatedUser.following = (updatedUser.following || []).filter(
                                  id => id.toString() !== selectedPost.author._id.toString()
                                );
                              } else {
                                updatedUser.following = [...(updatedUser.following || []), selectedPost.author._id];
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
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                  )}
                  <Button 
                    variant='ghost' 
                    className="cursor-pointer w-full font-semibold hover:bg-gray-100"
                    onClick={async () => {
                      try {
                        const res = await axios.get(
                          `https://snapgrid-r8kd.onrender.com/api/v1/post/${selectedPost._id}/bookmark`, 
                          { withCredentials: true }
                        );
                        if (res.data.success) {
                          setIsBookmarked(res.data.type === 'saved');
                          if (user) {
                            const updatedUser = { ...user };
                            if (res.data.type === 'saved') {
                              updatedUser.bookmarks = [...(updatedUser.bookmarks || []), selectedPost._id];
                            } else {
                              updatedUser.bookmarks = (updatedUser.bookmarks || []).filter(
                                bookmarkId => bookmarkId.toString() !== selectedPost._id.toString()
                              );
                            }
                            dispatch(setAuthUser(updatedUser));
                          }
                          toast.success(res.data.message);
                        }
                      } catch (error) {
                        console.error('Bookmark error:', error);
                        toast.error('Failed to update bookmark');
                      }
                    }}
                  >
                    {isBookmarked ? 'Remove from Bookmarks' : 'Save to Bookmarks'}
                  </Button>
                  {isAuthor && (
                    <Button 
                      variant='ghost' 
                      className="cursor-pointer w-full text-[#ED4956] font-bold hover:bg-red-50"
                      onClick={async () => {
                        try {
                          const res = await axios.delete(
                            `https://snapgrid-r8kd.onrender.com/api/v1/post/delete/${selectedPost._id}`, 
                            { withCredentials: true }
                          );
                          if (res.data.success) {
                            toast.success(res.data.message);
                            setOpen(false);
                          }
                        } catch (error) {
                          console.error('Delete error:', error);
                          toast.error('Failed to delete post');
                        }
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {/* Actions Bar */}
            <div className='flex items-center gap-4 px-4 py-3 border-b border-gray-200'>
              <button
                onClick={likeOrDislikeHandler}
                className={`transition-colors ${liked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'}`}
              >
                <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
              </button>
              <MessageCircle className='w-6 h-6 text-gray-600' />
              <span className='font-semibold text-sm text-gray-800'>{likeCount} likes</span>
            </div>

            {/* Comments List */}
            <div className='flex-1 overflow-y-auto p-4 space-y-4'>
              {comment.length > 0 ? (
                <>
                  {comment.map((commentItem) => (
                    <Comment key={commentItem._id} comment={commentItem} />
                  ))}
                  <div ref={commentsEndRef} />
                </>
              ) : (
                <div className='flex flex-col items-center justify-center h-full text-center py-12'>
                  <MessageCircle className='w-16 h-16 text-gray-300 mb-4' />
                  <p className="text-gray-500 font-medium mb-1">No comments yet</p>
                  <p className="text-gray-400 text-sm">Be the first to comment!</p>
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className='p-4 border-t border-gray-200 bg-gray-50'>
              <div className='flex items-center gap-2'>
                <Avatar className='w-8 h-8 flex-shrink-0'>
                  <AvatarImage src={user?.profilePicture} />
                  <AvatarFallback className='text-xs'>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div className='flex-1 flex items-center gap-2 bg-white border border-gray-300 rounded-full px-4 py-2'>
                  <Input 
                    type="text" 
                    value={text} 
                    onChange={changeEventHandler} 
                    placeholder='Add a comment...' 
                    className='flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm p-0 h-auto' 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && text.trim() && !e.shiftKey) {
                        e.preventDefault();
                        sendMessageHandler();
                      }
                    }}
                  />
                  <Button 
                    disabled={!text.trim()} 
                    onClick={sendMessageHandler}
                    size="sm"
                    className='rounded-full bg-[#0095F6] hover:bg-[#3192d2] disabled:opacity-50 disabled:cursor-not-allowed h-8 px-4'
                  >
                    <Send className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CommentDialog