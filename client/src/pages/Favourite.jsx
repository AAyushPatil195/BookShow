import React from 'react'
import { dummyShowsData } from '../assets/assets'
import MovieCard from '../components/MovieCard'
import BlurCircle from '../components/BlurCircle'
import { useAppContext } from '../context/AppContext'

const Favourite = () => {

  const { favouriteMovies } = useAppContext();
  
  return favouriteMovies.length > 0 ? (
    <main className='relative min-h-[80vh] overflow-hidden px-6 pb-24 pt-36 sm:px-8 md:pt-44 lg:px-12'>

      <BlurCircle top='150px' left='0px' />
      <BlurCircle bottom='150px' right='0px' />
      <div className='mx-auto max-w-7xl'>
      <p className='text-xs font-semibold uppercase tracking-[0.24em] text-primary'>Your collection</p>
      <h1 className='mt-2 text-3xl font-semibold tracking-tight sm:text-4xl'>Favourite Movies</h1>
      <p className='mt-3 max-w-xl text-sm leading-6 text-zinc-400'>All the stories you saved, ready whenever you are.</p>
      <div className='mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
        {/* List of movies */}
        {/* {dummyShowsData.map((movie)=>(
          <MovieCard movie={movie} key={movie._id} />
        ))} */}
        {favouriteMovies.map((movie)=>(
          <MovieCard movie={movie} key={movie._id} />
        ))}
      </div>
      </div>
    </main>
  ) : (
    <main className='flex min-h-screen flex-col items-center justify-center px-6 text-center'>
      {/* In case no movies are available */}
      <span className='mb-5 text-4xl text-primary'>♡</span>
      <h1 className='text-3xl font-semibold tracking-tight'>No favourites yet</h1>
      <p className='mt-3 max-w-sm text-sm text-zinc-500'>Save movies you love and they will appear here.</p>
    </main>
  )
}

export default Favourite
