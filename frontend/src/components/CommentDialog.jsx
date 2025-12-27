import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from './ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Link, useNavigate } from 'react-router-dom'
import { MoreHorizontal, Heart, Send, MessageCircle, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useDispatch, useSelector } from 'react-redux'
import Comment from './Comment'
import axios from 'axios'
import { toast } from 'sonner'
import { setPosts } from '@/redux/postSlice'
import { setAuthUser, setSelectedUser } from '@/redux/authSlice'

const CommentDialog = ({ open, setOpen, post, onLikeChange, onLikeHandler }) => {
  const [text, setText] = useState("");
  const { selectedPost: reduxSelectedPost, posts } = useSelector(store => store.post);
  const { user } = useSelector(store => store.auth);
  const [comment, setComment] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [replyTo, setReplyTo] = useState(null); // { commentId, text, authorId, authorUsername }
  const commentInputRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const commentsEndRef = useRef(null);

  // CSS for preventing overflow in all comment elements
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
  const commentRef = useCallback((node) => {
      if (node) {
          // Apply to all text elements in this comment
          const textElements = node.querySelectorAll('p, span, div');
          textElements.forEach(preventOverflow);

          // Apply to the comment container itself
          preventOverflow(node);
      }
  }, [preventOverflow]);

  // Use post prop if provided, otherwise fallback to Redux selectedPost
  const selectedPost = post || reduxSelectedPost;

  // Fetch complete post data when dialog opens
  useEffect(() => {
    if (open && selectedPost?._id) {
      const fetchCompletePost = async () => {
        try {
          setIsLoading(true);
          const res = await axios.get(
            `https://snapgrid-r8kd.onrender.com/api/v1/post/${selectedPost._id}`,
            { withCredentials: true }
          );
          if (res.data.success && res.data.post) {
            const completePost = res.data.post;
            // Sort comments by creation time (oldest first, so newest appear at bottom)
            const sortedComments = [...(completePost.comments || [])].sort((a, b) =>
              new Date(a.createdAt) - new Date(b.createdAt)
            );
            setComment(sortedComments);
            setLikeCount(completePost.likes?.length || 0);
            setLiked(completePost.likes?.includes(user?._id) || false);
            setIsBookmarked(user?.bookmarks?.some(id => id.toString() === completePost._id.toString()) || false);
          }
        } catch (error) {
          console.error("Error fetching post:", error);
          // Fallback to selectedPost data if fetch fails
          setComment(selectedPost.comments || []);
          setLikeCount(selectedPost.likes?.length || 0);
          setLiked(selectedPost.likes?.includes(user?._id) || false);
          setIsBookmarked(user?.bookmarks?.some(id => id.toString() === selectedPost._id.toString()) || false);
        } finally {
          setIsLoading(false);
        }
      };

      fetchCompletePost();
    }
  }, [open, selectedPost?._id, user?._id, user?.bookmarks]);

  useEffect(() => {
    if (open && commentsEndRef.current && selectedPost) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comment, open, selectedPost]);

  // Handle mobile keyboard detection and viewport adjustments - Enhanced version
  useEffect(() => {
    let keyboardCheckTimeout;

    const updateKeyboardState = (isOpen) => {
      setIsKeyboardOpen(isOpen);
      if (isOpen) {
        const currentHeight = window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${currentHeight * 0.01}px`);
      } else {
        document.documentElement.style.setProperty('--vh', '1vh');
      }
    };

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = viewportHeight - currentHeight;

      // Clear any pending keyboard checks
      if (keyboardCheckTimeout) {
        clearTimeout(keyboardCheckTimeout);
      }

      // Detect keyboard open (significant height reduction on mobile)
      if (heightDifference > 150 && window.innerWidth < 768) {
        updateKeyboardState(true);
      } else if (heightDifference < 50) {
        // Only close keyboard if height difference is minimal (keyboard fully closed)
        keyboardCheckTimeout = setTimeout(() => {
          updateKeyboardState(false);
        }, 200); // Small delay to prevent flickering
      }

      setViewportHeight(currentHeight);
    };

    const handleFocus = (e) => {
      // Only handle mobile focus events
      if (window.innerWidth >= 768) return;

      // Clear any pending keyboard checks
      if (keyboardCheckTimeout) {
        clearTimeout(keyboardCheckTimeout);
      }

      // Immediate keyboard detection for better UX
      keyboardCheckTimeout = setTimeout(() => {
        const currentHeight = window.innerHeight;
        const initialHeight = window.screen.height;
        const heightRatio = currentHeight / initialHeight;

        // Consider keyboard open if height is significantly reduced
        if (heightRatio < 0.75) {
          updateKeyboardState(true);
        }
      }, 150); // Reduced delay for faster detection
    };

    const handleBlur = () => {
      // Delay keyboard close to prevent flickering when switching between inputs
      if (keyboardCheckTimeout) {
        clearTimeout(keyboardCheckTimeout);
      }
      keyboardCheckTimeout = setTimeout(() => {
        updateKeyboardState(false);
      }, 300);
    };

    // Use visual viewport API if available for better keyboard detection
    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const heightRatio = window.visualViewport.height / window.innerHeight;
        if (heightRatio < 0.8 && window.innerWidth < 768) {
          updateKeyboardState(true);
        } else if (heightRatio > 0.9) {
          updateKeyboardState(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Add visual viewport listener if supported
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }

    // Listen for input focus/blur events within the dialog - use event delegation for dynamic inputs
    const dialogElement = document.querySelector('[data-radix-dialog-content]');
    if (dialogElement) {
      const handleInputFocus = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          handleFocus(e);
        }
      };

      const handleInputBlur = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          handleBlur();
        }
      };

      dialogElement.addEventListener('focusin', handleInputFocus);
      dialogElement.addEventListener('focusout', handleInputBlur);

      return () => {
        dialogElement.removeEventListener('focusin', handleInputFocus);
        dialogElement.removeEventListener('focusout', handleInputBlur);
      };
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
      if (keyboardCheckTimeout) {
        clearTimeout(keyboardCheckTimeout);
      }
    };
  }, [viewportHeight]);

  // Apply overflow prevention to all comment elements
  useEffect(() => {
      const commentContainer = document.querySelector('[data-radix-dialog-content]');
      if (!commentContainer) return;

      const applyOverflowPrevention = () => {
          // Target specific comment content elements only (avoid main container)
          const commentBubbles = commentContainer.querySelectorAll('.comment-content');
          commentBubbles.forEach(bubble => {
              // Apply to text content within comment bubbles
              const textElements = bubble.querySelectorAll('p, span');
              textElements.forEach(preventOverflow);

              // Apply to reply indicators
              const replyIndicators = bubble.querySelectorAll('.reply-indicator, [class*="border-l-"]');
              replyIndicators.forEach(preventOverflow);
          });

          // Apply to input preview area
          const replyPreview = commentContainer.querySelector('[class*="bg-blue-50"]');
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

      observer.observe(commentContainer, {
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

  const changeEventHandler = (e) => {
    setText(e.target.value);
  }

  const handleReply = (comment) => {
    const replyData = {
      commentId: comment._id,
      text: comment.text,
      authorId: comment.author._id,
      authorUsername: comment.author.username
    };
    setReplyTo(replyData);
    // Focus input immediately for better UX
    requestAnimationFrame(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
      }
    });
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const sendMessageHandler = async () => {
    if (!text.trim() || !selectedPost) return;

    // Create optimistic comment object
    const optimisticComment = {
      _id: `temp-${Date.now()}`, // Temporary ID
      text: text.trim(),
      author: user, // Current user
      createdAt: new Date().toISOString(),
      replyTo: replyTo?.commentId || null,
      replyText: replyTo?.text || null,
      isOptimistic: true // Flag to identify optimistic updates
    };

    // Immediately add comment to UI (optimistic update)
    const updatedCommentData = [...comment, optimisticComment];
    // Sort comments by creation time (oldest first, so newest appear at bottom)
    const sortedComments = [...updatedCommentData].sort((a, b) =>
      new Date(a.createdAt) - new Date(b.createdAt)
    );
    setComment(sortedComments);
    const currentText = text;
    setText(""); // Clear input immediately
    setReplyTo(null); // Clear reply state

    // Keep input focused immediately to prevent keyboard from hiding on mobile
    requestAnimationFrame(() => {
        if (commentInputRef.current) {
            commentInputRef.current.focus();
        }
    });

    try {
      const res = await axios.post(
        `https://snapgrid-r8kd.onrender.com/api/v1/post/${selectedPost?._id}/comment`,
        {
          text: currentText,
          replyTo: replyTo?.commentId || null,
          replyText: replyTo?.text || null
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );

      if (res.data.success) {
        // Replace optimistic comment with real comment from server
        const finalCommentData = updatedCommentData.map(comment =>
          comment.isOptimistic ? res.data.comment : comment
        );
        // Sort comments by creation time (oldest first, so newest appear at bottom)
        const sortedComments = [...finalCommentData].sort((a, b) =>
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        setComment(sortedComments);
      } else {
        // Remove optimistic comment on failure
        setComment(comment);
        setText(currentText); // Restore text
        toast.error("Failed to post comment");
        // Keep input focused immediately even on error
        requestAnimationFrame(() => {
            if (commentInputRef.current) {
                commentInputRef.current.focus();
            }
        });
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      // Remove optimistic comment on error
      setComment(comment);
      setText(currentText); // Restore text
      toast.error("Failed to post comment");
      // Keep input focused immediately even on error
      requestAnimationFrame(() => {
          if (commentInputRef.current) {
              commentInputRef.current.focus();
          }
      });
    }
  }

  const likeOrDislikeHandler = async () => {
    if (!selectedPost || !user?._id) return;
    
    // If a custom like handler is provided (from ProfilePostGrid), use it
    if (onLikeHandler) {
      const currentLiked = liked;
      try {
        await onLikeHandler(selectedPost);
        // Update local state immediately for UI feedback
        setLiked(!currentLiked);
        setLikeCount(prev => currentLiked ? prev - 1 : prev + 1);
        
        // Then fetch the latest data to ensure accuracy
        setTimeout(async () => {
          try {
            const postRes = await axios.get(
              `https://snapgrid-r8kd.onrender.com/api/v1/post/${selectedPost._id}`,
              { withCredentials: true }
            );
            if (postRes.data.success && postRes.data.post) {
              setLikeCount(postRes.data.post.likes?.length || 0);
              setLiked(postRes.data.post.likes?.includes(user._id) || false);
            }
          } catch (error) {
            console.log('Error fetching updated post:', error);
          }
        }, 100);
      } catch (error) {
        console.log('Like handler error:', error);
        toast.error('Failed to update like');
      }
      return;
    }
    
    // Otherwise, use the default handler for Redux posts
    try {
      const action = liked ? 'dislike' : 'like';
      const res = await axios.get(
        `https://snapgrid-r8kd.onrender.com/api/v1/post/${selectedPost._id}/${action}`, 
        { withCredentials: true }
      );
      
      if (res.data.success) {
        // Update like count from response
        const updatedLikes = res.data.likes || [];
        setLikeCount(updatedLikes.length);
        setLiked(updatedLikes.includes(user._id));
        
        // Update Redux store with new likes
        const updatedPostData = posts.map(p =>
          p._id === selectedPost._id ? {
            ...p,
            likes: updatedLikes
          } : p
        );
        dispatch(setPosts(updatedPostData));
        
        // Notify parent component about the like change
        if (onLikeChange) {
          onLikeChange({
            postId: selectedPost._id,
            likes: updatedLikes,
            liked: updatedLikes.includes(user._id)
          });
        }
      }
    } catch (error) {
      console.log('Like/Dislike error:', error);
      toast.error('Failed to update like');
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
      <>
        {/* Global overflow prevention styles - selective to avoid breaking scroll */}
        <style dangerouslySetInnerHTML={{
            __html: `
                [data-radix-dialog-content] .comment-content,
                [data-radix-dialog-content] .comment-content *,
                [data-radix-dialog-content] .reply-indicator,
                [data-radix-dialog-content] .reply-indicator * {
                    max-width: 100% !important;
                    overflow-x: hidden !important;
                    word-break: break-all !important;
                    overflow-wrap: break-word !important;
                    box-sizing: border-box !important;
                }
                [data-radix-dialog-content] .comment-content p,
                [data-radix-dialog-content] .comment-content span,
                [data-radix-dialog-content] .reply-indicator p,
                [data-radix-dialog-content] .reply-indicator span {
                    text-overflow: clip !important;
                    white-space: pre-wrap !important;
                    overflow: hidden !important;
                }
                /* Preserve scrolling on main container */
                [data-radix-dialog-content] .overflow-y-auto {
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                }
            `
        }} />
        <DialogContent
          onInteractOutside={() => setOpen(false)}
          className={`comment-dialog-content max-w-[95vw] md:max-w-6xl p-0 flex flex-col overflow-hidden ${isKeyboardOpen ? 'h-[calc(var(--vh,1vh)*90)]' : 'h-[85vh] md:h-[90vh]'}`}
          onEscapeKeyDown={() => setOpen(false)}
        >
        <DialogTitle className="sr-only">Comments</DialogTitle>
        <div className='flex flex-1 min-h-0 flex-col md:flex-row'>
          {/* Image Section */}
          <div className='w-full h-48 md:w-1/2 md:h-auto hidden md:block bg-black'>
            <img
              src={selectedPost?.image}
              alt="post_img"
              className='w-full h-full object-contain'
            />
          </div>
          
          {/* Comments Section */}
          <div className='w-full md:w-1/2 flex flex-col bg-white flex-1 min-h-0'>
            {/* Header */}
            <div className='flex items-center justify-between p-3 sm:p-4 border-b border-gray-200'>
              <div className='flex gap-2 sm:gap-3 items-center flex-1 min-w-0'>
                <Link to={`/profile/${selectedPost?.author?._id}`} onClick={() => setOpen(false)}>
                  <Avatar className='w-8 h-8 sm:w-10 sm:h-10 border-2 border-gray-100'>
                    <AvatarImage src={selectedPost?.author?.profilePicture} />
                    <AvatarFallback className='text-xs sm:text-sm'>
                      {selectedPost?.author?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className='min-w-0'>
                  <Link
                    to={`/profile/${selectedPost?.author?._id}`}
                    onClick={() => setOpen(false)}
                    className='font-semibold text-xs sm:text-sm hover:underline block truncate'
                  >
                    {selectedPost?.author?.username}
                  </Link>
                  {selectedPost?.caption && (
                    <p className='text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-2'>{selectedPost.caption}</p>
                  )}
                </div>
              </div>
              <div className='flex items-center gap-2'>
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
              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                className='p-2 hover:bg-gray-100 rounded-full transition-colors'
              >
                <X className='w-5 h-5 text-gray-600' />
              </button>
              </div>
            </div>

            {/* Actions Bar */}
            <div className='flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200'>
              <button
                onClick={likeOrDislikeHandler}
                className={`transition-colors ${liked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'}`}
              >
                <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${liked ? 'fill-current' : ''}`} />
              </button>
              <MessageCircle className='w-5 h-5 sm:w-6 sm:h-6 text-gray-600' />
              <span className='font-semibold text-xs sm:text-sm text-gray-800'>{likeCount} likes</span>
            </div>

            {/* Comments List */}
            <div className={`flex-1 overflow-y-auto space-y-3 sm:space-y-4 ${isKeyboardOpen ? 'pb-24 p-3' : 'p-3 sm:p-4'}`}>
              {isLoading ? (
                <div className='flex items-center justify-center h-full'>
                  <p className='text-gray-500 text-sm'>Loading comments...</p>
                </div>
              ) : comment.length > 0 ? (
                <>
                  {comment.map((commentItem) => (
                    <div key={commentItem._id} ref={commentRef}>
                      <Comment comment={commentItem} onReply={handleReply} />
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </>
              ) : (
                <div className='flex flex-col items-center justify-center h-full text-center py-8 sm:py-12'>
                  <MessageCircle className='w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mb-3 sm:mb-4' />
                  <p className="text-gray-500 font-medium text-sm mb-1">No comments yet</p>
                  <p className="text-gray-400 text-xs">Be the first to comment!</p>
                </div>
              )}
            </div>

            {/* Reply Preview */}
            {replyTo && (
                <div className='border-t border-gray-200 bg-blue-50'>
                    <div className='flex items-start justify-between p-3 overflow-hidden'>
                        <div className='flex-1 min-w-0 mr-2'>
                            <div className='flex items-center gap-2 mb-1'>
                                <span className='text-sm font-medium text-blue-700 truncate'>Replying to</span>
                                <span className='text-sm text-blue-600 truncate'>{replyTo.authorUsername}</span>
                            </div>
                            <div className='relative'>
                                <p className='text-sm text-blue-800 break-words'
                                   style={{
                                     wordBreak: 'break-all',
                                     overflowWrap: 'break-word'
                                   }}
                                   title={replyTo.text}>
                                    {replyTo.text}
                                </p>
                                {replyTo.text.length > 100 && (
                                    <span className='text-xs text-blue-500 mt-1 block'>
                                        {replyTo.text.length} characters
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={cancelReply}
                            className='flex-shrink-0 p-1.5 hover:bg-blue-100 rounded-full transition-colors mt-0.5'
                            title="Cancel reply"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Comment Input */}
            <div className={`border-t border-gray-200 bg-gray-50 ${isKeyboardOpen ? 'absolute bottom-0 left-0 right-0 z-20 p-3 pb-safe' : 'p-3 sm:p-4'}`}>
              <div className='flex items-center gap-2'>
                <Avatar className='w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0'>
                  <AvatarImage src={user?.profilePicture} />
                  <AvatarFallback className='text-xs'>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div className='flex-1 flex items-center gap-2 bg-white border border-gray-300 rounded-full px-3 sm:px-4 py-1.5 sm:py-2'>
                  <Input
                    ref={commentInputRef}
                    type="text"
                    value={text}
                    onChange={changeEventHandler}
                    placeholder='Add a comment...'
                    className='flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs sm:text-sm p-0 h-auto'
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
                    className='rounded-full bg-[#0095F6] hover:bg-[#3192d2] disabled:opacity-50 disabled:cursor-not-allowed h-7 sm:h-8 px-3 sm:px-4'
                  >
                    <Send className='w-3 h-3 sm:w-4 sm:h-4' />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      </>
    </Dialog>
  )
}

export default CommentDialog