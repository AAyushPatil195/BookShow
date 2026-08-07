import React, { useState } from 'react'
import { dummyTrailers } from '../assets/assets'
import ReactPlayer from 'react-player'
import BlurCircle from './BlurCircle';
import { PlayCircleIcon } from 'lucide-react';

const TrailersSecton = () => {

    const [currentTrailer, setCurrentTrailer] = useState(dummyTrailers[0]);

  return (
    <section className='overflow-hidden px-6 py-20 sm:px-8 lg:px-12'>
      <div className='mx-auto max-w-7xl'>
      {/* <p className='font-medium text-gray-300 text-lg max-w-[960px] mx-auto'>Trailers</p> */}
      <div className='mx-auto max-w-5xl'>
        <p className='text-xs font-semibold uppercase tracking-[0.24em] text-primary'>Sneak peek</p>
        <h2 className='mt-2 text-2xl font-semibold tracking-tight sm:text-3xl'>Watch the trailers</h2>
      </div>

      <div className='relative mx-auto mt-8 aspect-video max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)]'>
        {/* Player */}
        <BlurCircle top='-100px' right='-100px' />
        <ReactPlayer src={currentTrailer.videoUrl} controls={false} className='h-full! w-full!' width="100%" height="100%" />
      </div>

      <div className='group mx-auto mt-6 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
        {/* Other trailer photos */}
        {dummyTrailers.map((trailer)=>(
            <div key={trailer.image} className={`relative aspect-video overflow-hidden rounded-xl border bg-panel transition duration-300 hover:-translate-y-1 cursor-pointer ${currentTrailer.image === trailer.image ? 'border-primary shadow-lg shadow-primary/15' : 'border-white/8 opacity-70 hover:border-white/20 hover:opacity-100'}`}
            onClick={()=>setCurrentTrailer(trailer)}>
                <img src={trailer.image} alt="Trailer" className='h-full w-full object-cover brightness-75' />
                <PlayCircleIcon strokeWidth={1.6} className='absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg' />
            </div>
        ))}
      </div>
      </div>
    </section>
  )
}

export default TrailersSecton
