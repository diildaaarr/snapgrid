import { useEffect, useRef } from 'react'
import ChatPage from './components/ChatPage'
import EditProfile from './components/EditProfile'
import Home from './components/Home'
import Login from './components/Login'
import MainLayout from './components/MainLayout'
import Profile from './components/Profile'
import Signup from './components/Signup'
import Search from './components/Search'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { io } from "socket.io-client";
import { useDispatch, useSelector } from 'react-redux'
import { setSocket } from './redux/socketSlice'
import { setOnlineUsers } from './redux/chatSlice'
import { setLikeNotification } from './redux/rtnSlice'
import ProtectedRoutes from './components/ProtectedRoutes'

const browserRouter = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoutes><MainLayout /></ProtectedRoutes>,
    children: [
      {
        path: '/',
        element: <ProtectedRoutes><Home /></ProtectedRoutes>
      },
      {
        path: '/profile/:id',
        element: <ProtectedRoutes><Profile /></ProtectedRoutes>
      },
      {
        path: '/account/edit',
        element: <ProtectedRoutes><EditProfile /></ProtectedRoutes>
      },
      {
        path: '/chat',
        element: <ProtectedRoutes><ChatPage /></ProtectedRoutes>
      },
      {
        path: '/search',
        element: <ProtectedRoutes><Search /></ProtectedRoutes>
      },
    ]
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/signup',
    element: <Signup />
  },
])

function App() {
  const { user } = useSelector(store => store.auth);
  const socketRef = useRef(null); // Use ref to store socket instance
  const dispatch = useDispatch();

  useEffect(() => {
    if (user) {
      // Create socket connection
      socketRef.current = io('https://snapgrid-r8kd.onrender.com', {
        query: {
          userId: user?._id
        },
        transports: ['websocket']
      });
      
      // Store socket in Redux (but it's blacklisted from persistence)
      dispatch(setSocket(socketRef.current));

      // Listen to all the events
      socketRef.current.on('getOnlineUsers', (onlineUsers) => {
        dispatch(setOnlineUsers(onlineUsers));
      });

      socketRef.current.on('notification', (notification) => {
        dispatch(setLikeNotification(notification));
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.close();
        }
        dispatch(setSocket(null));
      }
    } else if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      dispatch(setSocket(null));
    }
  }, [user, dispatch]);

  return (
    <>
      <RouterProvider router={browserRouter} />
    </>
  )
}

export default App