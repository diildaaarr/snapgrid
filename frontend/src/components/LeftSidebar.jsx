import { Heart, Home, LogOut, MessageCircle, PlusSquare, Search, TrendingUp } from 'lucide-react'
import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { toast } from 'sonner'
import axios from 'axios'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setAuthUser } from '@/redux/authSlice'
import CreatePost from './CreatePost'
import { setPosts, setSelectedPost } from '@/redux/postSlice'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

const LeftSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector(store => store.auth);
    const { likeNotification } = useSelector(store => store.realTimeNotification);
    const dispatch = useDispatch();
    const [open, setOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);


    const logoutHandler = async () => {
        try {
            const res = await axios.get('https://snapgrid-r8kd.onrender.com/api/v1/user/logout', { withCredentials: true });
            if (res.data.success) {
                dispatch(setAuthUser(null));
                dispatch(setSelectedPost(null));
                dispatch(setPosts([]));
                navigate("/login");
                toast.success(res.data.message);
            }
        } catch (error) {
            toast.error(error.response.data.message);
        }
    }

    const sidebarHandler = (textType) => {
        if (textType === 'Logout') {
            setShowLogoutDialog(true);
        } else if (textType === "Create") {
            setOpen(true);
        } else if (textType === "Profile") {
            navigate(`/profile/${user?._id}`);
        } else if (textType === "Home") {
            navigate("/");
        } else if (textType === 'Messages') {
            navigate("/chat");
        } else if (textType === 'Search') {
            navigate("/search");
        }
    }

    // Check if current route matches
    const isActive = (text) => {
        if (text === 'Home' && location.pathname === '/') return true;
        if (text === 'Search' && location.pathname === '/search') return true;
        if (text === 'Messages' && location.pathname === '/chat') return true;
        if (text === 'Profile' && location.pathname.includes('/profile')) return true;
        return false;
    }

    const sidebarItems = [
        { icon: <Home />, text: "Home" },
        { icon: <Search />, text: "Search" },
        { icon: <TrendingUp />, text: "Explore" },
        { icon: <MessageCircle />, text: "Messages" },
        { icon: <Heart />, text: "Notifications" },
        { icon: <PlusSquare />, text: "Create" },
        {
            icon: (
                <Avatar className='w-6 h-6'>
                    <AvatarImage src={user?.profilePicture} alt="@shadcn" />
                    <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
            ),
            text: "Profile"
        },
        { icon: <LogOut />, text: "Logout" },
    ]

    // Mobile bottom navigation items (subset of sidebar items)
    const mobileNavItems = [
        { icon: <Home />, text: "Home" },
        { icon: <Search />, text: "Search" },
        { icon: <PlusSquare />, text: "Create" },
        { icon: <MessageCircle />, text: "Messages" },
        {
            icon: (
                <Avatar className='w-6 h-6'>
                    <AvatarImage src={user?.profilePicture} alt="@shadcn" />
                    <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
            ),
            text: "Profile"
        },
    ]

    return (
        <>
            {/* Desktop & Tablet Sidebar */}
            <div className='hidden md:flex fixed top-0 z-10 left-0 px-2 lg:px-4 border-r border-gray-300 w-[70px] lg:w-[16%] h-screen bg-white'>
                <div className='flex flex-col w-full'>
                    {/* Logo */}
                    <div className='my-6 lg:my-8 flex items-center justify-center lg:justify-start lg:pl-3 gap-3'>
                        <img 
                            src="/snapgrid.jpeg" 
                            alt="SnapGrid Logo" 
                            className="h-8 w-8 lg:h-10 lg:w-10 object-cover rounded-lg"
                        />
                        <h1 className='font-bold text-xl hidden lg:block'>snapgrid</h1>
                    </div>
                    {/* Nav Items */}
                    <div className='flex-1'>
                        {
                            sidebarItems.map((item, index) => {
                                const active = isActive(item.text);
                                return (
                                    <div 
                                        onClick={() => sidebarHandler(item.text)} 
                                        key={index} 
                                        className={`flex items-center justify-center lg:justify-start gap-3 relative hover:bg-gray-100 cursor-pointer rounded-lg p-3 my-1 lg:my-3 transition-colors ${active ? 'bg-gray-100 font-semibold' : ''}`}
                                    >
                                        <span className={`${active ? 'text-black' : 'text-gray-700'}`}>{item.icon}</span>
                                        <span className='hidden lg:block'>{item.text}</span>
                                        {
                                            item.text === "Notifications" && likeNotification.length > 0 && (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button size='icon' className="rounded-full h-5 w-5 bg-red-600 hover:bg-red-600 absolute bottom-6 left-6 lg:left-6">{likeNotification.length}</Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent>
                                                        <div>
                                                            {
                                                                likeNotification.length === 0 ? (<p>No new notification</p>) : (
                                                                    likeNotification.map((notification) => {
                                                                        return (
                                                                            <div key={notification.userId} className='flex items-center gap-2 my-2'>
                                                                                <Avatar>
                                                                                    <AvatarImage src={notification.userDetails?.profilePicture} />
                                                                                    <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                                                                                </Avatar>
                                                                                <p className='text-sm'><span className='font-bold'>{notification.userDetails?.username}</span> liked your post</p>
                                                                            </div>
                                                                        )
                                                                    })
                                                                )
                                                            }
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            )
                                        }
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className='md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-2 py-2 safe-area-inset-bottom'>
                <div className='flex justify-around items-center'>
                    {
                        mobileNavItems.map((item, index) => {
                            const active = isActive(item.text);
                            return (
                                <div 
                                    onClick={() => sidebarHandler(item.text)} 
                                    key={index} 
                                    className={`flex flex-col items-center justify-center p-2 cursor-pointer rounded-lg transition-colors ${active ? 'text-black' : 'text-gray-500'}`}
                                >
                                    <span className={`${active ? 'scale-110' : ''} transition-transform`}>{item.icon}</span>
                                </div>
                            )
                        })
                    }
                </div>
            </div>

            {/* CreatePost Dialog - Outside containers so it works on all screen sizes */}
            <CreatePost open={open} setOpen={setOpen} />

            {/* Logout Confirmation Dialog */}
            <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <DialogContent className="sm:max-w-md mx-4">
                    <DialogTitle className="text-center text-xl font-semibold mb-4">
                        Confirm Logout
                    </DialogTitle>
                    <div className="text-center mb-6">
                        <p className="text-gray-600 mb-2">Are you sure you want to logout?</p>
                        <div className="flex justify-center mb-4">
                            <LogOut className="w-12 h-12 text-red-500 animate-pulse" />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <Button
                            variant="outline"
                            onClick={() => setShowLogoutDialog(false)}
                            className="px-6 py-2 hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                        >
                            No
                        </Button>
                        <Button
                            onClick={() => {
                                setShowLogoutDialog(false);
                                logoutHandler();
                            }}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                            Yes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default LeftSidebar