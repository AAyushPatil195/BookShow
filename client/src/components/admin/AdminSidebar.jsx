import React from 'react'
import { assets } from '../../assets/assets'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboardIcon, ListCollapseIcon, ListIcon, PlusSquareIcon } from 'lucide-react'

const AdminSidebar = () => {

    const user = {
        firstName: 'Admin',
        lastName: 'User',
        imageUrl: assets.profile,
    }

    const navigate = useNavigate();

    const adminNavLinks = [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboardIcon },
        { name: 'Add Shows', path: '/admin/add-shows', icon: PlusSquareIcon },
        { name: 'List Shows', path: '/admin/list-shows', icon: ListIcon },
        { name: 'List Bookings', path: '/admin/list-bookings', icon: ListCollapseIcon },
    ]

  return (
    <aside className='h-[calc(100vh-72px)] w-full max-w-16 shrink-0 border-r border-white/8 bg-black/20 pt-6 text-sm md:max-w-64'>
      <img src={user.imageUrl} className='mx-auto h-10 w-10 rounded-xl border border-white/10 object-cover md:h-14 md:w-14 md:rounded-2xl' alt={`${user.firstName} ${user.lastName}`} />
      <p className='mt-3 text-center text-sm font-semibold max-md:hidden'>{user.firstName} {user.lastName}</p>
      <p className='mt-0.5 text-center text-[10px] uppercase tracking-[0.18em] text-zinc-600 max-md:hidden'>Administrator</p>

      <nav className='mt-7 w-full space-y-1 px-2 md:px-3'>
        {/* Menu links */}
        {adminNavLinks.map((link, index)=>(
            <NavLink key={index} to={link.path} end className={({ isActive }) => `relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-zinc-500 transition max-md:justify-center md:px-4 ${isActive ? 'bg-primary/12 text-primary' : 'hover:bg-white/5 hover:text-zinc-200'}`}>
                {({ isActive }) => (
                    <>
                      <link.icon className='h-5 w-5 shrink-0' />
                      <p className='font-medium max-md:hidden'>{link.name}</p>
                      <span className={`absolute left-0 h-5 w-0.5 rounded-full ${isActive ? 'bg-primary' : 'bg-transparent'}`} />
                    </>
                )}
            </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default AdminSidebar
