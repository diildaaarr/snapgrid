import React from 'react'
import Feed from './Feed'
import { Outlet } from 'react-router-dom'
import RightSidebar from './RightSidebar'
import useGetAllPost from '@/hooks/useGetAllPost'
import useGetSuggestedUsers from '@/hooks/useGetSuggestedUsers'

const Home = () => {
    useGetAllPost();
    useGetSuggestedUsers();
    return (
        <div className='flex min-h-screen bg-gray-50'>
            <div className='flex-grow w-full lg:max-w-4xl mx-auto'>
                <Feed />
                <Outlet />
            </div>
            <div className='hidden xl:block'>
                <RightSidebar />
            </div>
        </div>
    )
}

export default Home