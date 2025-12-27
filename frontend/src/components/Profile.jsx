import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import useGetUserProfile from '@/hooks/useGetUserProfile';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { X } from 'lucide-react';
import axios from 'axios';
import { setUserProfile, setAuthUser, setSelectedUser } from '@/redux/authSlice';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import Post from './Post';
import ProfilePostGrid from './ProfilePostGrid';

const Profile = () => {
  const params = useParams();
  const userId = params.id;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  useGetUserProfile(userId);
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedImage, setSelectedImage] = useState(null);

  const { userProfile, user } = useSelector(store => store.auth);

  const isLoggedInUserProfile = user?._id === userProfile?._id;
  const isFollowing = user?.following?.some(id => id.toString() === userProfile?._id?.toString()) || false;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  }

  const handleFollowUnfollow = async () => {
    try {
      const res = await axios.post(`https://snapgrid-r8kd.onrender.com/api/v1/user/followorunfollow/${userId}`, {}, { withCredentials: true });
      if (res.data.success) {
        // Refresh user profile
        const profileRes = await axios.get(`https://snapgrid-r8kd.onrender.com/api/v1/user/${userId}/profile`, { withCredentials: true });
        if (profileRes.data.success) {
          dispatch(setUserProfile(profileRes.data.user));
        }
        // Update current user's following array in store
        if (user) {
          const updatedUser = { ...user };
          if (res.data.action === 'follow') {
            updatedUser.following = [...(updatedUser.following || []), userId];
          } else {
            updatedUser.following = (updatedUser.following || []).filter(id => id.toString() !== userId.toString());
          }
          dispatch(setAuthUser(updatedUser));
        }
      }
    } catch (error) {
      console.log('Follow/Unfollow error:', error);
    }
  }


  const displayedPost = activeTab === 'posts' ? userProfile?.posts : userProfile?.bookmarks;

  return (
    <div className='flex max-w-5xl justify-center mx-auto px-4 sm:px-6 lg:pl-10'>
      <div className='flex flex-col gap-8 sm:gap-12 lg:gap-16 py-6 sm:py-8 w-full'>
        {/* Profile Header */}
        <div className='flex flex-col sm:grid sm:grid-cols-3 gap-6 sm:gap-8'>
          {/* Avatar Section */}
          <section className='flex items-center justify-center sm:col-span-1'>
            <div 
              onClick={() => userProfile?.profilePicture && setSelectedImage(userProfile.profilePicture)}
              className='cursor-pointer hover:opacity-80 transition-opacity'
            >
              <Avatar className='h-24 w-24 sm:h-32 sm:w-32 lg:h-36 lg:w-36 border-4 border-gray-100 shadow-lg'>
                <AvatarImage src={userProfile?.profilePicture} alt="profilephoto" />
                <AvatarFallback>{userProfile?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
            </div>
          </section>
          {/* Info Section */}
          <section className='sm:col-span-2'>
            <div className='flex flex-col gap-4 sm:gap-6'>
              {/* Username and Buttons */}
              <div className='flex flex-col sm:flex-row items-center gap-3 sm:gap-4 flex-wrap'>
                <h1 className='text-xl sm:text-2xl font-light'>{userProfile?.username}</h1>
                <div className='flex items-center gap-2 flex-wrap justify-center'>
                {
                  isLoggedInUserProfile ? (
                    <>
                      <Link to="/account/edit"><Button variant='secondary' className='hover:bg-gray-200 h-8 sm:h-9 px-3 sm:px-4 text-sm transition-colors'>Edit profile</Button></Link>
                      <Button variant='secondary' className='hover:bg-gray-200 h-8 sm:h-9 px-3 sm:px-4 text-sm transition-colors hidden sm:inline-flex'>View archive</Button>
                      <Button variant='secondary' className='hover:bg-gray-200 h-8 sm:h-9 px-3 sm:px-4 text-sm transition-colors hidden md:inline-flex'>Ad tools</Button>
                    </>
                  ) : (
                    isFollowing ? (
                      <>
                        <Button variant='secondary' className='h-8 sm:h-9 px-4 sm:px-6 text-sm transition-colors' onClick={handleFollowUnfollow}>Unfollow</Button>
                        <Button 
                          variant='secondary' 
                          className='h-8 sm:h-9 px-4 sm:px-6 text-sm transition-colors'
                          onClick={() => {
                            dispatch(setSelectedUser(userProfile));
                            navigate('/chat');
                          }}
                        >
                          Message
                        </Button>
                      </>
                    ) : (
                      <Button className='bg-[#0095F6] hover:bg-[#3192d2] h-8 sm:h-9 px-4 sm:px-6 text-sm transition-colors shadow-sm' onClick={handleFollowUnfollow}>Follow</Button>
                    )
                  )
                }
                </div>
              </div>
              {/* Stats */}
              <div className='flex items-center justify-center sm:justify-start gap-4 sm:gap-6'>
                <p className='text-sm sm:text-base'><span className='font-semibold'>{userProfile?.posts?.length || 0} </span>posts</p>
                <p className='text-sm sm:text-base'><span className='font-semibold'>{userProfile?.followers?.length || 0} </span>followers</p>
                <p className='text-sm sm:text-base'><span className='font-semibold'>{userProfile?.following?.length || 0} </span>following</p>
              </div>
              {/* Bio */}
              <div className='flex flex-col gap-1 text-center sm:text-left'>
                <span className='font-semibold text-sm sm:text-base'>{userProfile?.username}</span>
                {userProfile?.bio && (
                  <span className='text-sm'>{userProfile.bio}</span>
                )}
                {!userProfile?.bio && (
                  <span className='text-sm text-gray-400 italic'>No bio available</span>
                )}
              </div>
            </div>
          </section>
        </div>
        {/* Tabs and Grid */}
        <div className='border-t border-t-gray-200 pt-4'>
          <div className='flex items-center justify-center gap-6 sm:gap-12 text-xs sm:text-sm border-b border-gray-200'>
            <span 
              className={`py-3 cursor-pointer border-b-2 transition-colors ${
                activeTab === 'posts' 
                  ? 'font-semibold border-black' 
                  : 'text-gray-500 border-transparent hover:text-black'
              }`} 
              onClick={() => handleTabChange('posts')}
            >
              <span className='flex items-center gap-1'>
                POSTS
              </span>
            </span>
            <span 
              className={`py-3 cursor-pointer border-b-2 transition-colors ${
                activeTab === 'saved' 
                  ? 'font-semibold border-black' 
                  : 'text-gray-500 border-transparent hover:text-black'
              }`} 
              onClick={() => handleTabChange('saved')}
            >
              <span className='flex items-center gap-1'>
                SAVED
              </span>
            </span>
            <span className='py-3 cursor-pointer text-gray-500 border-b-2 border-transparent hover:text-black transition-colors hidden sm:block'>REELS</span>
            <span className='py-3 cursor-pointer text-gray-500 border-b-2 border-transparent hover:text-black transition-colors hidden sm:block'>TAGS</span>
          </div>
          <div className='space-y-6 mt-6'>
            {
              displayedPost?.length > 0 ? (
                <ProfilePostGrid posts={displayedPost} />
              ) : (
                <div className='text-center py-12 text-gray-400'>
                  <p>No {activeTab === 'posts' ? 'posts' : 'saved posts'} yet</p>
                </div>
              )
            }
          </div>
        </div>

        {/* Image Lightbox Dialog */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent 
            onInteractOutside={() => setSelectedImage(null)}
            onEscapeKeyDown={() => setSelectedImage(null)}
            className="max-w-fit max-h-fit p-0 bg-transparent border-none overflow-visible flex items-center justify-center"
          >
            <DialogTitle className="sr-only">View Image</DialogTitle>
            <div className='relative flex items-center justify-center'>
              <button 
                onClick={() => setSelectedImage(null)}
                className='absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors'
              >
                <X className='w-6 h-6' />
              </button>
              <img
                src={selectedImage}
                alt="profile_image_full"
                className='w-80 h-80 sm:w-96 sm:h-96 rounded-full object-cover'
              />
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}

export default Profile