import React, { useEffect, useState } from 'react'
import { dummyBookingData } from '../assets/assets';
import Loading from '../components/Loading';
import BlurCircle from '../components/BlurCircle';
import { dateFormat } from '../lib/dateFormat';
import timeFormat from '../lib/timeFormat';
import { useAppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';

const MyBookings = () => {

  const { axios, getToken, user, TMDB_image_base_url } = useAppContext();
  
  const currency = import.meta.env.VITE_CURRENCY;
  
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getMyBookings = async () => {
    // setBookings(dummyBookingData)
    // setIsLoading(false)
    try {
      if(!user) toast.error('Please log in!');

      const { data } = await axios.get('/api/user/bookings', {
        headers: { Authorization: `Bearer ${await getToken()}`}
      })
      if(data.success){
        setBookings(data.bookings)
      }
    } catch (error) {
      console.log(error)
    }
    setIsLoading(false)
  }

  useEffect(()=>{
    if(user){
      getMyBookings();
    }
  }, [user])

  return !isLoading ? (
    <main className='relative min-h-[80vh] overflow-hidden px-6 pb-24 pt-36 sm:px-8 md:pt-44 lg:px-12'>
      <BlurCircle top='100px' left='100px' />
      <div>
        <BlurCircle bottom='0px' left='600px' />
      </div>
      <div className='mx-auto max-w-5xl'>
      <p className='text-xs font-semibold uppercase tracking-[0.24em] text-primary'>Your tickets</p>
      <h1 className='mt-2 text-3xl font-semibold tracking-tight sm:text-4xl'>My Bookings</h1>
      <p className='mt-3 text-sm text-zinc-500'>View your upcoming cinema experiences and payment status.</p>

      <div className='mt-10 space-y-4'>
      {bookings.map((item, index)=>(
        <article key={index} className='group flex max-w-4xl flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-[0_16px_50px_rgba(0,0,0,0.2)] transition hover:border-white/15 md:flex-row'>
          <div className='flex min-w-0 flex-col sm:flex-row'>
            <img src={TMDB_image_base_url + item.show.movie.poster_path} alt={`${item.show.movie.title} poster`} className='aspect-video h-44 w-full object-cover object-center sm:aspect-[4/5] sm:h-auto sm:w-40' />
            <div className='flex min-w-0 flex-col p-5'>
              <div className='flex items-center gap-2'>
                <span className={`h-1.5 w-1.5 rounded-full ${item.isPaid ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <p className='text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500'>{item.isPaid ? 'Payment complete' : 'Payment pending'}</p>
              </div>
              <p className='mt-2 truncate text-xl font-semibold'>{item.show.movie.title}</p>
              <p className='mt-1 text-sm text-zinc-500'>{timeFormat(item.show.movie.runtime)}</p>
              <p className='mt-5 text-sm font-medium text-zinc-300 sm:mt-auto'>{dateFormat(item.show.showDateTime)}</p>
            </div>
          </div>

        <div className='flex flex-col justify-between border-t border-white/8 p-5 sm:min-w-60 md:items-end md:border-l md:border-t-0 md:text-right'>
          <div className='flex w-full items-center justify-between gap-4 md:w-auto md:justify-end'>
            <p className='text-2xl font-semibold'>{currency}{item.amount}</p>
            {!item.isPaid && <Link to={item.paymentLink} className='rounded-lg bg-primary px-4 py-2 text-sm font-semibold shadow-lg shadow-primary/15 transition hover:bg-primary-dull cursor-pointer'>Pay Now</Link>}
          </div>
          <div className='mt-5 space-y-1 text-sm'>
            <p><span className='text-zinc-500'>Total Tickets: </span> {item.bookedSeats.length}</p>
            <p><span className='text-zinc-500'>Seat Number: </span> {item.bookedSeats.join(", ")}</p>
          </div>
        </div>

        </article>
      ))}
      </div>

      {bookings.length === 0 && (
        <div className='mt-10 rounded-2xl border border-dashed border-white/10 bg-white/3 px-6 py-16 text-center'>
          <h2 className='text-xl font-semibold'>No bookings yet</h2>
          <p className='mt-2 text-sm text-zinc-500'>Your booked shows will appear here.</p>
        </div>
      )}
      </div>
    </main>
  ) : (
    <Loading />
  )
}

export default MyBookings
