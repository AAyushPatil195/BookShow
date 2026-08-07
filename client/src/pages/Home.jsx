import React from 'react'
import HeroSection from '../components/HeroSection'
import FeaturedSection from '../components/FeaturedSection'
import TrailersSecton from '../components/TrailersSecton'

const Home = () => {
  return (
    <main className='overflow-hidden'>
     <HeroSection />
     <FeaturedSection />
     <TrailersSecton />
    </main>
  )
}

export default Home
