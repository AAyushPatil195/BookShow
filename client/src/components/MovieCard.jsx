import { StarIcon } from 'lucide-react';
import React from 'react'
import { useNavigate } from 'react-router-dom'
import timeFormat from '../lib/timeFormat.js'
import { useAppContext } from '../context/AppContext.jsx';

const MovieCard = ({movie}) => {

    const { TMDB_image_base_url } = useAppContext();

    const navigate = useNavigate();

  return (
    <article className='group flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/8 bg-panel p-2.5 shadow-[0_16px_50px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1.5 hover:border-white/15 hover:bg-panel-light'>
      <div className='relative overflow-hidden rounded-xl'>
        <img onClick={()=>{navigate(`/movies/${movie._id}`); scrollTo(0,0)}} src={TMDB_image_base_url + movie.backdrop_path} alt={movie.title} className='aspect-[16/11] w-full object-cover cursor-pointer transition duration-500 group-hover:scale-105' />
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent' />
        <p className='absolute right-2.5 top-2.5 flex items-center gap-1 rounded-lg border border-white/10 bg-black/65 px-2 py-1 text-xs font-medium text-white backdrop-blur-md'>
          <StarIcon className='w-3.5 h-3.5 text-primary fill-primary' />
          {(movie.vote_average).toFixed(1)}
        </p>
      </div>

      <div className='flex flex-1 flex-col px-1.5 pb-1 pt-3'>
      <p className='truncate text-base font-semibold tracking-tight text-white'>{movie.title}</p>

      <p className='mt-1.5 truncate text-xs text-zinc-400'>
        {new Date(movie.release_date).getFullYear()} - {movie.genres.slice(0,2).map(genre => genre.name).join(" | ")} - {timeFormat(movie.runtime)}
      </p>

      <div className='mt-4 flex items-center justify-between'>
        {/* Book now button */}
        <button onClick={()=> {navigate(`/movies/${movie._id}`); scrollTo(0,0)}} className='rounded-lg bg-white/8 px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary cursor-pointer'>Buy Tickets</button>
        <span className='text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500'>Book now</span>
      </div>
      </div>
    </article>
  )
}

export default MovieCard
