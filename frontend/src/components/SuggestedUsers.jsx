import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import axios from 'axios';
import { setAuthUser, setSuggestedUsers } from '@/redux/authSlice';

const SuggestedUsers = () => {
    const { suggestedUsers, user: currentUser } = useSelector(store => store.auth);
    const dispatch = useDispatch();
    const [showAll, setShowAll] = useState(false);
    const [displayedUsers, setDisplayedUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Initialize with first 5 users from suggestedUsers when they're loaded (only if not showing all)
    useEffect(() => {
        if (suggestedUsers.length > 0 && !showAll && displayedUsers.length === 0) {
            setDisplayedUsers(suggestedUsers.slice(0, 5));
        }
    }, [suggestedUsers]);

    // Handle "See All" / "Show Less" toggle
    const handleToggleShowAll = () => {
        setShowAll(prev => {
            const newValue = !prev;
            
            if (newValue) {
                // Fetch all users when "See All" is clicked
                setLoading(true);
                axios.get('https://snapgrid-r8kd.onrender.com/api/v1/user/suggested?limit=0', { withCredentials: true })
                    .then(res => {
                        if (res.data.success) {
                            setDisplayedUsers(res.data.users);
                            dispatch(setSuggestedUsers(res.data.users));
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching all users:', error);
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            } else {
                // When "Show Less" is clicked, fetch only 5 users
                setLoading(true);
                axios.get('https://snapgrid-r8kd.onrender.com/api/v1/user/suggested?limit=5', { withCredentials: true })
                    .then(res => {
                        if (res.data.success) {
                            setDisplayedUsers(res.data.users);
                            dispatch(setSuggestedUsers(res.data.users));
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching limited users:', error);
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            }
            
            return newValue;
        });
    };

    const handleFollow = async (userId) => {
        try {
            const res = await axios.post(`https://snapgrid-r8kd.onrender.com/api/v1/user/followorunfollow/${userId}`, {}, { withCredentials: true });
            if (res.data.success) {
                // Update current user's following array in store
                if (currentUser) {
                    const updatedUser = { ...currentUser };
                    if (res.data.action === 'follow') {
                        updatedUser.following = [...(updatedUser.following || []), userId];
                    } else {
                        updatedUser.following = (updatedUser.following || []).filter(id => id.toString() !== userId.toString());
                    }
                    dispatch(setAuthUser(updatedUser));
                }
                // Refresh displayed users to update follow status
                const limit = showAll ? 0 : 5;
                const suggestedRes = await axios.get(`https://snapgrid-r8kd.onrender.com/api/v1/user/suggested?limit=${limit}`, { withCredentials: true });
                if (suggestedRes.data.success) {
                    if (showAll) {
                        setDisplayedUsers(suggestedRes.data.users);
                    } else {
                        setDisplayedUsers(suggestedRes.data.users.slice(0, 5));
                    }
                    dispatch(setSuggestedUsers(suggestedRes.data.users));
                }
            }
        } catch (error) {
            console.error('Follow/Unfollow error:', error);
        }
    }
    return (
        <div className='my-10'>
            <div className='flex items-center justify-between mb-4'>
                <h1 className='font-semibold text-gray-700 text-base'>Suggested for you</h1>
                <button
                    onClick={handleToggleShowAll}
                    className='font-medium cursor-pointer text-sm text-gray-500 hover:text-gray-700 transition-colors'
                    disabled={loading}
                >
                    {loading ? 'Loading...' : (showAll ? 'Show Less' : 'See All')}
                </button>
            </div>
            {loading ? (
                <div className='text-center py-6 text-gray-400 text-sm'>
                    <p>Loading...</p>
                </div>
            ) : (
                displayedUsers.length > 0 ? (
                    displayedUsers.map((user) => {
                        const isFollowing = currentUser?.following?.some(id => id.toString() === user._id?.toString()) || false;
                        return (
                            <div key={user._id} className='flex items-center justify-between my-4 p-2 rounded-lg hover:bg-gray-50 transition-colors'>
                                <div className='flex items-center gap-3 flex-1 min-w-0'>
                                    <Link to={`/profile/${user?._id}`} className='flex-shrink-0'>
                                        <Avatar className='w-10 h-10 border border-gray-200'>
                                            <AvatarImage src={user?.profilePicture} alt="post_image" />
                                            <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                                        </Avatar>
                                    </Link>
                                    <div className='flex-1 min-w-0'>
                                        <Link to={`/profile/${user?._id}`}>
                                            <h1 className='font-semibold text-sm hover:underline truncate'>{user?.username}</h1>
                                        </Link>
                                        <span className='text-gray-600 text-xs truncate block'>{user?.bio || 'Suggested for you'}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleFollow(user._id)}
                                    className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex-shrink-0 ${
                                        isFollowing
                                            ? 'text-gray-600 hover:text-gray-800'
                                            : 'text-[#3BADF8] hover:text-[#3192d2]'
                                    }`}
                                >
                                    {isFollowing ? 'Unfollow' : 'Follow'}
                                </button>
                            </div>
                        )
                    })
                ) : (
                    <div className='text-center py-6 text-gray-400 text-sm'>
                        <p>No suggestions available</p>
                    </div>
                )
            )}

        </div>
    )
}

export default SuggestedUsers