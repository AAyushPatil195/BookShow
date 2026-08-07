import React from 'react'
import AdminNavbar from '../../components/admin/AdminNavbar'
import AdminSidebar from '../../components/admin/AdminSidebar'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useEffect } from 'react'
import Loading from '../../components/Loading'

const Layout = () => {

  const {isAdmin, fetchIsAdmin} = useAppContext()

  useEffect(()=>{
    fetchIsAdmin()
  }, [])

  return isAdmin ? (
    <div className='min-h-screen bg-canvas'>
     <AdminNavbar />
     <div className='flex'>
        <AdminSidebar /> 

        <main className='h-[calc(100vh-72px)] flex-1 overflow-y-auto px-5 py-8 sm:px-8 md:px-10 lg:px-12 lg:py-10'>
            <Outlet />
        </main>
     </div>
    </div>
  ) : (
    <Loading />
  )
}

export default Layout
