import React, { useState, useEffect, useRef } from 'react'
import { Input } from './ui/input'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Search as SearchIcon } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { setAuthUser } from '@/redux/authSlice'

const Search = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true); // Start with loading for initial load
    const isInitialMount = useRef(true);
    const { user: currentUser } = useSelector(store => store.auth);
    const dispatch = useDispatch();

    useEffect(() => {
        const searchUsers = async () => {
            setLoading(true);
            try {
                const queryParam = searchQuery.trim() === '' ? '' : `?query=${encodeURIComponent(searchQuery.trim())}`;
                const res = await axios.get(`https://snapgrid-r8kd.onrender.com/api/v1/user/search${queryParam}`, {
                    withCredentials: true
                });
                if (res.data.success) {
                    // Sort results by username alphabetically
                    const sortedUsers = res.data.users.sort((a, b) => {
                        return a.username.localeCompare(b.username);
                    });
                    setSearchResults(sortedUsers);
                }
            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
            } finally {
                setLoading(false);
                isInitialMount.current = false;
            }
        };

        // On initial mount, load immediately. For subsequent searches, debounce by 300ms
        const delay = isInitialMount.current ? 0 : 300;
        
        const timer = setTimeout(() => {
            searchUsers();
        }, delay);

        return () => clearTimeout(timer);
    }, [searchQuery]);

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
                // Refresh search results to update follow status
                const queryParam = searchQuery.trim() === '' ? '' : `?query=${encodeURIComponent(searchQuery.trim())}`;
                const searchRes = await axios.get(`https://snapgrid-r8kd.onrender.com/api/v1/user/search${queryParam}`, {
                    withCredentials: true
                });
                if (searchRes.data.success) {
                    const sortedUsers = searchRes.data.users.sort((a, b) => {
                        return a.username.localeCompare(b.username);
                    });
                    setSearchResults(sortedUsers);
                }
            }
        } catch (error) {
            console.error('Follow/Unfollow error:', error);
        }
    }

    return (
        <div className='flex max-w-5xl justify-center mx-auto px-3 sm:px-6 lg:pl-10'>
            <div className='flex flex-col gap-4 sm:gap-6 py-4 sm:p-8 w-full'>
                <div className='relative'>
                    <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5' />
                    <Input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-9 sm:pl-10 focus-visible:ring-transparent h-10 sm:h-12 text-sm sm:text-base'
                    />
                </div>

                {loading && (
                    <div className='text-center py-8 sm:py-12 text-gray-500'>
                        <div className='inline-block animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-gray-400'></div>
                        <p className='mt-2 text-sm'>Searching...</p>
                    </div>
                )}

                {!loading && searchQuery.trim() !== '' && searchResults.length === 0 && (
                    <div className='text-center py-8 sm:py-12'>
                        <p className='text-gray-500 text-base sm:text-lg'>No users found</p>
                        <p className='text-gray-400 text-xs sm:text-sm mt-1'>Try a different search term</p>
                    </div>
                )}

                {!loading && searchQuery.trim() === '' && searchResults.length === 0 && (
                    <div className='text-center py-8 sm:py-12'>
                        <SearchIcon className='mx-auto text-gray-300 w-12 h-12 sm:w-16 sm:h-16 mb-4' />
                        <p className='text-gray-500 text-base sm:text-lg'>No users found</p>
                    </div>
                )}

                {!loading && searchResults.length > 0 && (
                    <div className='flex flex-col gap-2 sm:gap-3'>
                        <p className='text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2'>
                            {searchQuery.trim() === '' 
                                ? `All users (${searchResults.length} ${searchResults.length === 1 ? 'user' : 'users'})`
                                : `${searchResults.length} ${searchResults.length === 1 ? 'result' : 'results'} found`
                            }
                        </p>
                        {searchResults.map((user) => {
                            const isFollowing = currentUser?.following?.some(id => id.toString() === user._id?.toString()) || false;
                            return (
                                <div key={user._id} className='flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 shadow-sm hover:shadow-md'>
                                    <div className='flex items-center gap-2 sm:gap-3 flex-1 min-w-0'>
                                        <Link to={`/profile/${user._id}`} className='flex-shrink-0'>
                                            <Avatar className='w-10 h-10 sm:w-14 sm:h-14 border-2 border-gray-100'>
                                                <AvatarImage src={user?.profilePicture} alt="profile" />
                                                <AvatarFallback>CN</AvatarFallback>
                                            </Avatar>
                                        </Link>
                                        <div className='flex-1 min-w-0'>
                                            <Link to={`/profile/${user._id}`}>
                                                <h3 className='font-semibold hover:underline text-sm sm:text-base truncate'>{user?.username}</h3>
                                            </Link>
                                            <p className='text-xs sm:text-sm text-gray-600 truncate'>{user?.bio || 'No bio available'}</p>
                                        </div>
                                    </div>
                                    {user._id !== currentUser?._id && (
                                        <button
                                            onClick={() => handleFollow(user._id)}
                                            className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 flex-shrink-0 ml-2 ${
                                                isFollowing
                                                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                                                    : 'bg-[#0095F6] hover:bg-[#3192d2] text-white shadow-sm hover:shadow'
                                            }`}
                                        >
                                            {isFollowing ? 'Unfollow' : 'Follow'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Search

