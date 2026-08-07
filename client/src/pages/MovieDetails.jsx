import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { dummyDateTimeData, dummyShowsData } from '../assets/assets';
import BlurCircle from '../components/BlurCircle';
import { Heart, HeartIcon, PlayCircleIcon, StarIcon } from 'lucide-react';
import timeFormat from '../lib/timeFormat';
import DateSelect from '../components/DateSelect';
import MovieCard from '../components/MovieCard';
import Loading from '../components/Loading';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const MovieDetails = () => {

  const { shows, axios, getToken, user, favouriteMovies, fetchFavouriteMovies, TMDB_image_base_url } = useAppContext();

  const navigate = useNavigate();
  const {id} = useParams();
  const [show, setShow] = useState(null);

  const getShow = async ()=> {
    // const show = dummyShowsData.find((show)=>show._id === id);
    // if(show){
    //     setShow({
    //     movie: show,
    //     dateTime: dummyDateTimeData
    //   })
    // }

    try {
      const { data } = await axios.get(`/api/show/${id}`)
      if(data.success){
        setShow(data)
      }
    } catch (error) {
      console.log(error)
    }
  }

  const handleFavorite = async () => {
    try {
      if(!user) return toast.error('Please log in to proceed!');

      const { data } = await axios.post(`/api/user/update-favourite`, {movieId: id}, 
          { headers: { Authorization: `Bearer ${await getToken()}`} }
        )
      
        if(data.success){
          fetchFavouriteMovies();
          toast.success(data.message)
        }
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(()=>{
    getShow();
  }, [id])

  return show ? (
    <main className='relative overflow-hidden pb-20'>
      <div className='absolute inset-x-0 top-0 -z-20 h-[680px] overflow-hidden'>
        <img src={TMDB_image_base_url + show.movie.backdrop_path} alt='' className='h-full w-full object-cover opacity-25 blur-[2px]' />
        <div className='absolute inset-0 bg-gradient-to-b from-black/45 via-canvas/85 to-canvas' />
      </div>

      <div className='mx-auto max-w-7xl px-6 pt-36 sm:px-8 md:pt-44 lg:px-12'>
      <div className='flex flex-col gap-10 md:flex-row md:items-end lg:gap-14'>
        {/* Movie poster & details */}
        <div className='mx-auto shrink-0 md:mx-0'>
          <img src={TMDB_image_base_url + show.movie.poster_path} alt={`${show.movie.title} poster`} className='aspect-[2/3] w-64 rounded-2xl border border-white/10 object-cover shadow-[0_28px_80px_rgba(0,0,0,0.55)] sm:w-72' />
        </div>
        <div className='relative flex max-w-2xl flex-col'>
          <BlurCircle top='-100px' left='-100px' />
          <p className='text-xs font-semibold uppercase tracking-[0.24em] text-primary'>{show.movie.original_language || 'English'}</p>
          <h1 className='mt-3 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl lg:text-6xl'>{show.movie.title}</h1>
          <div className='mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-300'>
            {/* Star icon & rating */}
            <span className='flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/7 px-3 py-1.5'>
              <StarIcon className='w-4 h-4 text-primary fill-primary' />
              {show.movie.vote_average} User Rating
            </span>
            <span>{timeFormat(show.movie.runtime)}</span>
            <span className='h-1 w-1 rounded-full bg-zinc-600' />
            <span>{show.movie.release_date.split("-")[0]}</span>
          </div>
          <p className='mt-5 max-w-xl text-sm leading-7 text-zinc-400'>{show.movie.overview}</p>
          <div className='mt-4 flex flex-wrap gap-2'>
            {show.movie.genres.map(genre => (
              <span key={genre.id} className='rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-400'>{genre.name}</span>
            ))}
          </div>
          
          <div className='mt-7 flex flex-wrap items-center gap-3'>
            {/* Trailer & Ticket & Fav */}
            <button className='flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-5 py-3 text-sm font-semibold transition hover:bg-white/12 active:scale-95 cursor-pointer'>
              <PlayCircleIcon className='w-5 h-5' /> Watch Trailer
            </button>
            <a href="#dateselect" className='rounded-xl bg-primary px-7 py-3 text-sm font-semibold shadow-lg shadow-primary/20 transition hover:bg-primary-dull active:scale-95 cursor-pointer'>Buy Tickets</a>
            <button onClick={handleFavorite} aria-label='Add to favourites' className='rounded-xl border border-white/10 bg-white/8 p-3 transition hover:bg-white/12 active:scale-95 cursor-pointer'>
              <Heart className={`w-5 h-5 ${favouriteMovies.find((movie) => movie._id === id) ? 'fill-primary text-primary' : 'text-zinc-300'}`} />
            </button>
          </div>
        </div>
      </div>

      <section className='mt-24'>
        <p className='text-xs font-semibold uppercase tracking-[0.22em] text-primary'>Meet the cast</p>
        <h2 className='mt-2 text-2xl font-semibold tracking-tight'>Movie Cast</h2>
        <div className='no-scrollbar mt-7 overflow-x-auto pb-4'>
          {/* List of Cast */}
          <div className='flex w-max items-start gap-5'>
            {show.movie.casts.slice(0, 12).map((cast, index)=>(
              <div key={index} className='w-22 text-center'>
                <img src={TMDB_image_base_url + cast.profile_path} alt={cast.name} className='mx-auto aspect-square h-20 rounded-full border-2 border-white/10 object-cover grayscale-[20%] transition hover:border-primary/60 hover:grayscale-0' />
                <p className='mt-3 line-clamp-2 text-xs font-medium text-zinc-300'>{cast.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DateSelect dateTime={show.dateTime} id={id} />

      <section className='mt-24'>
        <p className='text-xs font-semibold uppercase tracking-[0.22em] text-primary'>More to explore</p>
        <h2 className='mb-8 mt-2 text-2xl font-semibold tracking-tight'>You may also like</h2>
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
          {shows.slice(0,4).map((movie, index)=>(
            <MovieCard movie={movie} key={index} />
          ))}
        </div>

        <div className='flex justify-center mt-12'>
          <button onClick={()=>{navigate('/movies'); scrollTo(0,0)}} className='rounded-xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-semibold transition hover:border-primary/40 hover:bg-primary cursor-pointer'>Explore all movies</button>
        </div>
      </section>
      </div>
    </main>
  ) : (
    <Loading />
  )
}

export default MovieDetails
