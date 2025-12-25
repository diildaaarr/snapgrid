import React from 'react'
import { Outlet } from 'react-router-dom'
import LeftSidebar from './LeftSidebar'

const MainLayout = () => {
  return (
    <div className='min-h-screen bg-gray-50'>
      <LeftSidebar/>
      {/* Add padding bottom for mobile bottom nav, left margin for larger screens */}
      <div className='pb-16 md:pb-0 md:ml-[70px] lg:ml-[16%]'>
        <Outlet/>
      </div>
    </div>
  )
}

export default MainLayout