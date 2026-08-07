import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { HeartIcon, MenuIcon, SearchIcon, TicketPlus, XIcon } from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/react'
import { useAppContext } from '../context/AppContext'

const NavBar = () => {
  const { favouriteMovies } = useAppContext()
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { user } = useUser()
  const { openSignIn } = useClerk()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Movies', path: '/movies' },
    { name: 'Theatres', path: '/movies' },
    { name: 'Releases', path: '/movies' },
  ]

  const isActive = (name) => {
    if (name === 'Home') return location.pathname === '/'
    if (name === 'Movies') return location.pathname.startsWith('/movies')
    return false
  }

  const closeMenu = () => {
    scrollTo(0, 0)
    setIsOpen(false)
  }

  return (
    <header className={`fixed left-0 top-0 z-50 w-full border-b transition-all duration-300 ${isScrolled ? 'border-white/8 bg-canvas/88 shadow-[0_10px_35px_rgba(0,0,0,0.2)] backdrop-blur-xl' : 'border-transparent bg-transparent'}`}>
      <div className='mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-12'>
        <Link to='/' onClick={closeMenu} className='relative z-50 flex shrink-0 items-center' aria-label='QuickShow home'>
          <img src={assets.logo} className='h-auto w-32 sm:w-36' alt='QuickShow' />
        </Link>

        <nav className={`z-40 flex items-center max-md:fixed max-md:inset-0 max-md:h-screen max-md:flex-col max-md:justify-center max-md:gap-4 max-md:overflow-hidden max-md:bg-canvas/98 max-md:text-lg max-md:font-medium max-md:backdrop-blur-2xl max-md:transition-[width,opacity] max-md:duration-300 md:absolute md:left-1/2 md:-translate-x-1/2 md:gap-9 ${isOpen ? 'max-md:w-full max-md:opacity-100' : 'max-md:w-0 max-md:opacity-0'}`}>
          <div className='absolute left-8 top-8 md:hidden'>
            <img src={assets.logo} className='w-32' alt='QuickShow' />
          </div>
          <button aria-label='Close menu' className='absolute right-8 top-8 rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:text-white md:hidden cursor-pointer' onClick={() => setIsOpen(false)}>
            <XIcon className='h-5 w-5' />
          </button>

          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={closeMenu}
              className={`relative py-2 text-sm font-medium transition ${isActive(link.name) ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {link.name}
              {isActive(link.name) && <span className='absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary' />}
            </Link>
          ))}

          {favouriteMovies.length > 0 && (
            <Link to='/favourite' onClick={closeMenu} className={`relative flex items-center gap-2 py-2 text-sm font-medium transition ${location.pathname === '/favourite' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              <HeartIcon className='h-3.5 w-3.5 fill-primary text-primary' />
              Favourites
              {location.pathname === '/favourite' && <span className='absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary' />}
            </Link>
          )}
        </nav>

        <div className='relative z-50 flex items-center gap-2 sm:gap-3'>
          <button aria-label='Search' className='hidden h-10 w-10 items-center justify-center text-zinc-400 transition hover:text-white md:flex cursor-pointer'>
            <SearchIcon className='h-4.5 w-4.5' />
          </button>

          {!user ? (
            <button onClick={openSignIn} className='rounded-full bg-primary px-5 py-2.5 text-sm font-semibold transition hover:bg-primary-dull active:scale-95 cursor-pointer'>
              Log In
            </button>
          ) : (
            <div className='flex h-10 items-center px-1'>
              <UserButton>
                <UserButton.MenuItems>
                  <UserButton.Action label='My Bookings' labelIcon={<TicketPlus width={15} />} onClick={() => navigate('/my-bookings')} />
                </UserButton.MenuItems>
              </UserButton>
            </div>
          )}

          <button aria-label='Open menu' className='flex h-10 w-10 items-center justify-center text-zinc-200 transition hover:text-white md:hidden cursor-pointer' onClick={() => setIsOpen(true)}>
            <MenuIcon className='h-5 w-5' />
          </button>
        </div>
      </div>
    </header>
  )
}

export default NavBar
