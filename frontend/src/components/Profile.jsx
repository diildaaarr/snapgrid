import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import useGetUserProfile from '@/hooks/useGetUserProfile';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AtSign, Heart, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { setUserProfile, setAuthUser, setSelectedUser } from '@/redux/authSlice';

const Profile = () => {
  const params = useParams();
  const userId = params.id;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  useGetUserProfile(userId);
  const [activeTab, setActiveTab] = useState('posts');

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
      console.error('Follow/Unfollow error:', error);
    }
  }

  const displayedPost = activeTab === 'posts' ? userProfile?.posts : userProfile?.bookmarks;

  return (
    <div className='flex max-w-5xl justify-center mx-auto pl-10'>
      <div className='flex flex-col gap-16 p-8'>
        <div className='grid grid-cols-2 gap-8'>
          <section className='flex items-center justify-center'>
            <Avatar className='h-36 w-36 border-4 border-gray-100 shadow-lg'>
              <AvatarImage src={userProfile?.profilePicture} alt="profilephoto" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </section>
          <section>
            <div className='flex flex-col gap-6'>
              <div className='flex items-center gap-3 flex-wrap'>
                <h1 className='text-2xl font-light'>{userProfile?.username}</h1>
                {
                  isLoggedInUserProfile ? (
                    <>
                      <Link to="/account/edit"><Button variant='secondary' className='hover:bg-gray-200 h-9 px-4 transition-colors'>Edit profile</Button></Link>
                      <Button variant='secondary' className='hover:bg-gray-200 h-9 px-4 transition-colors'>View archive</Button>
                      <Button variant='secondary' className='hover:bg-gray-200 h-9 px-4 transition-colors'>Ad tools</Button>
                    </>
                  ) : (
                    isFollowing ? (
                      <>
                        <Button variant='secondary' className='h-9 px-6 transition-colors' onClick={handleFollowUnfollow}>Unfollow</Button>
                        <Button 
                          variant='secondary' 
                          className='h-9 px-6 transition-colors'
                          onClick={() => {
                            // Set the selected user in Redux and navigate to chat
                            dispatch(setSelectedUser(userProfile));
                            navigate('/chat');
                          }}
                        >
                          Message
                        </Button>
                      </>
                    ) : (
                      <Button className='bg-[#0095F6] hover:bg-[#3192d2] h-9 px-6 transition-colors shadow-sm' onClick={handleFollowUnfollow}>Follow</Button>
                    )
                  )
                }
              </div>
              <div className='flex items-center gap-6'>
                <p className='text-base'><span className='font-semibold'>{userProfile?.posts?.length || 0} </span>posts</p>
                <p className='text-base'><span className='font-semibold'>{userProfile?.followers?.length || 0} </span>followers</p>
                <p className='text-base'><span className='font-semibold'>{userProfile?.following?.length || 0} </span>following</p>
              </div>
              <div className='flex flex-col gap-2'>
                <span className='font-semibold text-base'>{userProfile?.username}</span>
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
        <div className='border-t border-t-gray-200 pt-4'>
          <div className='flex items-center justify-center gap-12 text-sm border-b border-gray-200'>
            <span 
              className={`py-3 cursor-pointer border-b-2 transition-colors ${
                activeTab === 'posts' 
                  ? 'font-semibold border-black' 
                  : 'text-gray-500 border-transparent hover:text-black'
              }`} 
              onClick={() => handleTabChange('posts')}
            >
              <span className='flex items-center gap-1'>
                <span className='hidden sm:inline'>📷</span> POSTS
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
                <span className='hidden sm:inline'>🔖</span> SAVED
              </span>
            </span>
            <span className='py-3 cursor-pointer text-gray-500 border-b-2 border-transparent hover:text-black transition-colors'>REELS</span>
            <span className='py-3 cursor-pointer text-gray-500 border-b-2 border-transparent hover:text-black transition-colors'>TAGS</span>
          </div>
          <div className='grid grid-cols-3 gap-1 mt-4'>
            {
              displayedPost?.length > 0 ? (
                displayedPost.map((post) => {
                  return (
                    <div key={post?._id} className='relative group cursor-pointer overflow-hidden rounded-sm'>
                      <img src={post.image} alt='postimage' className='w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105' />
                      <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300'>
                        <div className='flex items-center text-white space-x-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                          <div className='flex items-center gap-2'>
                            <Heart className='w-5 h-5' />
                            <span className='font-semibold'>{post?.likes?.length || 0}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <MessageCircle className='w-5 h-5' />
                            <span className='font-semibold'>{post?.comments?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className='col-span-3 text-center py-12 text-gray-400'>
                  <p>No {activeTab === 'posts' ? 'posts' : 'saved posts'} yet</p>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile