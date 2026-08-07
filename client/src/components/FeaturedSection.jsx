import { ArrowRight } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import BlurCircle from './BlurCircle';
// import { dummyShowsData } from '../assets/assets';
import MovieCard from './MovieCard';
import { useAppContext } from '../context/AppContext';

const FeaturedSection = () => {
  
    const { shows } = useAppContext();

    const navigate = useNavigate();
    
  return (
    <section className='overflow-hidden px-6 py-16 sm:px-8 lg:px-12'>
      <div className='mx-auto max-w-7xl'>

      <div className='relative flex items-end justify-between pb-8'>
        {/* Title */}
        <BlurCircle top='0' right='-80px' />
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.24em] text-primary'>On the big screen</p>
          <h2 className='mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl'>Now Showing</h2>
        </div>
        <button onClick={()=> {navigate('/movies'); scrollTo(0,0)} } className='group flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white cursor-pointer'> View All
            <ArrowRight  className='group-hover:translate-x-0.5 transition w-4.5 h-4.5'/> 
        </button>
      </div>

      <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
        {/* Movie List */}
        {/* {dummyShowsData.slice(0,4).map((show)=>( <MovieCard key={show._id} movie={show} />))} */}
        {shows.slice(0,4).map((show)=>( <MovieCard key={show._id} movie={show} />))}
      </div>

      <div className='flex justify-center mt-12'>
        {/* Button - Show More */}
        <button onClick={()=> {navigate('/movies'); scrollTo(0,0)}} className='rounded-xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-semibold text-zinc-200 transition hover:border-primary/40 hover:bg-primary hover:text-white cursor-pointer'>Explore all movies</button>
      </div>

      </div>
    </section>
  )
}

export default FeaturedSection
