import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../../assets/assets'

const AdminNavbar = () => {
  return (
    <header className='sticky top-0 z-40 flex h-18 items-center justify-between border-b border-white/8 bg-black/60 px-5 backdrop-blur-xl sm:px-8 md:px-10'>
      <Link to="/">
        <img className='h-auto w-32 sm:w-36' src={assets.logo} alt="QuickShow" />
      </Link>
      <div className='flex items-center gap-3'>
        <span className='hidden text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 sm:block'>Admin console</span>
        <span className='h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]' />
      </div>
    </header>
  )
}

export default AdminNavbar
