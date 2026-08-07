import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarIcon, ClockIcon, StarIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import timeFormat from '../lib/timeFormat'

const fallbackMovie = {
  _id: null,
  title: 'Guardian of the Galaxy',
  overview: 'A group of unlikely heroes must stand together to protect the galaxy from a threat powerful enough to destroy it.',
  backdrop_path: null,
  genres: [{ name: 'Action' }, { name: 'Adventure' }, { name: 'Sci-Fi' }],
  release_date: '2018-01-01',
  original_language: 'en',
  vote_average: 8.1,
  runtime: 156,
}

const HeroSection = () => {
  const { shows, TMDB_image_base_url } = useAppContext()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)

  const heroMovies = shows.slice(0, 5)
  const movie = heroMovies.length > 0 ? heroMovies[currentIndex % heroMovies.length] : fallbackMovie

  useEffect(() => {
    if (heroMovies.length < 2) return

    const interval = setInterval(() => {
      setCurrentIndex((previous) => (previous + 1) % heroMovies.length)
    }, 7000)

    return () => clearInterval(interval)
  }, [heroMovies.length])

  const changeSlide = (direction) => {
    if (heroMovies.length < 2) return
    setCurrentIndex((previous) => (previous + direction + heroMovies.length) % heroMovies.length)
  }

  const backgroundImage = movie.backdrop_path
    ? `${TMDB_image_base_url}${movie.backdrop_path}`
    : '/backgroundImage.png'

  const openMovie = () => {
    navigate(movie._id ? `/movies/${movie._id}` : '/movies')
    scrollTo(0, 0)
  }

  return (
    <section className='relative isolate flex h-screen min-h-[760px] items-center overflow-hidden bg-canvas'>
      <div
        key={backgroundImage}
        className='absolute inset-0 -z-30 bg-cover bg-[68%_center] transition-opacity duration-700 md:bg-center'
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className='absolute inset-0 -z-20 bg-gradient-to-r from-black via-black/72 to-black/10' />
      <div className='absolute inset-0 -z-20 bg-gradient-to-t from-canvas via-transparent to-black/30' />
      <div className='absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-black via-black/60 to-transparent' />
      <div className='absolute inset-y-0 right-0 -z-10 hidden w-1/3 bg-gradient-to-l from-black/15 to-transparent lg:block' />

      <div className='relative mx-auto flex h-full w-full max-w-7xl items-center px-6 pt-20 sm:px-8 lg:px-12'>
        <div className='max-w-2xl translate-y-6 sm:translate-y-8'>
          <div className='mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-zinc-200 backdrop-blur-md'>
            <span className='h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(248,69,101,0.9)]' />
            Now in theatres
          </div>

          <p className='text-xs font-semibold uppercase tracking-[0.28em] text-primary'>
            {movie.original_language?.toUpperCase()} · Featured presentation
          </p>
          <h1 className='mt-4 max-w-2xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl'>
            {movie.title}
          </h1>

          <div className='mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-300 sm:text-base'>
            <span>{movie.genres.slice(0, 3).map((genre) => genre.name).join(' · ')}</span>
            <span className='flex items-center gap-1.5'>
              <CalendarIcon className='h-4 w-4 text-zinc-400' />
              {movie.release_date?.split('-')[0]}
            </span>
            <span className='flex items-center gap-1.5'>
              <ClockIcon className='h-4 w-4 text-zinc-400' />
              {timeFormat(movie.runtime)}
            </span>
            <span className='flex items-center gap-1.5'>
              <StarIcon className='h-4 w-4 fill-primary text-primary' />
              {Number(movie.vote_average).toFixed(1)}
            </span>
          </div>

          <p className='mt-5 line-clamp-3 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base'>{movie.overview}</p>

          <div className='mt-8 flex items-center gap-3'>
            <button className='group flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold shadow-[0_12px_32px_rgba(248,69,101,0.28)] transition hover:bg-primary-dull active:scale-95 cursor-pointer' onClick={openMovie}>
              Explore Movie
              <ArrowRight className='h-4.5 w-4.5 transition-transform group-hover:translate-x-1'/>
            </button>
            {heroMovies.length > 1 && (
              <div className='flex items-center gap-2'>
                <button onClick={() => changeSlide(-1)} aria-label='Previous featured movie' className='flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-black/30 text-zinc-300 backdrop-blur-md transition hover:border-white/25 hover:bg-white/10 hover:text-white cursor-pointer'>
                  <ArrowLeft className='h-4.5 w-4.5' />
                </button>
                <button onClick={() => changeSlide(1)} aria-label='Next featured movie' className='flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-black/30 text-zinc-300 backdrop-blur-md transition hover:border-white/25 hover:bg-white/10 hover:text-white cursor-pointer'>
                  <ArrowRight className='h-4.5 w-4.5' />
                </button>
              </div>
            )}
          </div>
        </div>

        {heroMovies.length > 1 && (
          <div className='absolute bottom-14 left-6 flex items-center gap-2 sm:left-8 lg:left-12'>
            {heroMovies.map((item, index) => (
              <button
                key={item._id}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Show ${item.title}`}
                className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${currentIndex === index ? 'w-10 bg-primary' : 'w-5 bg-white/30 hover:bg-white/60'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default HeroSection
