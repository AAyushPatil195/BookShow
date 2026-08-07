import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets, dummyDateTimeData, dummyShowsData } from '../assets/assets';
import Loading from '../components/Loading';
import { ArrowRightIcon, ClockIcon } from 'lucide-react';
import isoTimeFormat from '../lib/isoTimeFormat';
import BlurCircle from '../components/BlurCircle';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';

const SeatLayout = () => {

  const { axios, getToken, user } = useAppContext();

  const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]];

  const {id, date} = useParams();
  const naviagte = useNavigate();

  const [selectedSeats, setSelectedSeats] = useState([])
  const [selectedTime, setSelectedTime] = useState(null)
  const [show, setShow] = useState(null)
  const [occupiedSeats, setOccupiedSeats] = useState([])

  // Fetch show data
  const getShow = async () => {
    // const show = dummyShowsData.find((show)=>show._id===id)
    // if(show){
    //   setShow({
    //     movie: show,
    //     dateTime: dummyDateTimeData
    //   });
    // }
    try {
      // if(!user) return toast.error('Please log in to continue booking!');

      const { data } = await axios.get(`/api/show/${id}`)
      if(data.success){
        setShow(data)
      }
    } catch (error) {
      
    }
  }

  const handleSeatClick = (seatId) => {
    if(!selectedTime) return toast('Please select the time for booking')
    if(!selectedSeats.includes(seatId) && selectedSeats.length>4 ) return toast("You can only select 5 seats")
    if(occupiedSeats.includes(seatId)) return toast("Seat is occupied!")
    setSelectedSeats(prev => prev.includes(seatId) ? prev.filter(seat=>seat!==seatId) : [...prev, seatId]);
  }

  const renderSeats = (row, count=9) => (
    <div key={row} className='mt-2 flex gap-2'>
      <div className='flex flex-wrap items-center justify-center gap-2'>
        {
          Array.from({ length: count }, (_, i) => {
            const seatId = `${row}${i+1}`;
            return (
              <button key={seatId} className={`h-8 w-8 rounded-md border text-[10px] font-medium transition cursor-pointer sm:h-9 sm:w-9 ${selectedSeats.includes(seatId) ? "border-primary bg-primary text-white shadow-md shadow-primary/20" : "border-white/15 bg-white/4 text-zinc-400 hover:border-primary/70 hover:text-white"} ${occupiedSeats.includes(seatId) && "border-zinc-800 bg-zinc-900/80 text-zinc-700 opacity-60"} `} onClick={() => handleSeatClick(seatId)}>
                {seatId}
              </button>
            )
          })
        }

      </div>

    </div>
  )

  const getOccupiedSeats = async () => {
    try {
      const { data } = await axios.get(`/api/booking/seats/${selectedTime.showId}`)

      if(data.success){
        setOccupiedSeats(data.occupiedSeats)
      }else{
        toast.error(data.message)
      }
    } catch (error) {
      
    }
  }

  const bookTickets = async () => {
    try {
      if(!user) return toast.error("Please log in to proceed!")
      if(!selectedTime || !selectedSeats.length) return toast.error("Please select a time & seats!")
      
      const { data } = await axios.post('/api/booking/create', 
                          {showId: selectedTime.showId, selectedSeats}, 
                          { headers: { Authorization: `Bearer ${await getToken()}`}}
                        )

      if(data.success){
        // toast.success(data.message)
        // naviagte('/my-bookings')
        window.location.href = data.url;
        
      } else{
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(()=>{
    getShow();
  }, [])

  useEffect(()=>{
    if(selectedTime){
      getOccupiedSeats();
    }
  }, [selectedTime])

  return show ? (
    <main className='mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 pb-24 pt-36 sm:px-8 md:flex-row md:pt-44 lg:gap-16 lg:px-12'>
      
      {/* Available Timings */}
      <aside className='h-max w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-[0_18px_60px_rgba(0,0,0,0.25)] md:sticky md:top-28 md:w-64'>
       <div className='border-b border-white/8 px-6 py-5'>
         <p className='text-xs font-semibold uppercase tracking-[0.2em] text-primary'>Showtime</p>
         <h2 className='mt-1 text-lg font-semibold'>Available Timings</h2>
         <p className='mt-1 text-xs text-zinc-500'>{date}</p>
       </div>
       <div className='space-y-1 p-3'>
        {show.dateTime[date].map((item)=>(
          <div key={item.time} onClick={()=>setSelectedTime(item)} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${selectedTime?.time === item.time ? "border-primary bg-primary text-white shadow-lg shadow-primary/15" : "border-transparent text-zinc-400 hover:border-white/8 hover:bg-white/5 hover:text-white"}`}>
            <ClockIcon className='w-4 h-4' />
            <p className='text-sm font-medium'>{isoTimeFormat(item.time)}</p>
          </div>
        ))}
       </div>
      </aside>

      {/* Seat Layout */}
      <section className='relative flex min-w-0 flex-1 flex-col items-center'>
        <BlurCircle top='-100px' left='-100px' />
        <BlurCircle bottom='0px' right='0px' />
        <p className='text-xs font-semibold uppercase tracking-[0.22em] text-primary'>Your seats</p>
        <h1 className='mt-2 text-3xl font-semibold tracking-tight'>Select your seat</h1>
        <p className='mt-2 text-sm text-zinc-500'>Choose up to 5 seats for this show.</p>

        <div className='mt-10 w-full max-w-3xl'>
          <img src={assets.screenImage} alt="Cinema screen" className='mx-auto w-full opacity-80' />
          <p className='mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.35em] text-zinc-600'>Screen this way</p>
        </div>

        <div className='no-scrollbar mt-10 w-full overflow-x-auto pb-4'>
        <div className='mx-auto flex w-max min-w-[620px] flex-col items-center px-4 text-xs text-zinc-300'>

          <div className='mb-6 grid grid-cols-2 gap-10 md:grid-cols-1 md:gap-2'>
            {groupRows[0].map(row => renderSeats(row))}
          </div>

          <div className='grid grid-cols-2 gap-12'>
            {groupRows.slice(1).map((group, ind)=>(
              <div key={ind}>
                {group.map(row => renderSeats(row))}
              </div>
            ))}
          </div>

        </div>
        </div>

        <div className='mt-6 flex flex-wrap justify-center gap-5 text-xs text-zinc-500'>
          <span className='flex items-center gap-2'><span className='h-3 w-3 rounded-sm border border-white/20 bg-white/5' /> Available</span>
          <span className='flex items-center gap-2'><span className='h-3 w-3 rounded-sm bg-primary' /> Selected</span>
          <span className='flex items-center gap-2'><span className='h-3 w-3 rounded-sm bg-zinc-800' /> Occupied</span>
        </div>

        <button onClick={bookTickets} className={`mt-10 flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold shadow-lg shadow-primary/20 transition hover:bg-primary-dull active:scale-95 cursor-pointer ${selectedSeats.length===0 ? "hidden" : ""}`}>
          Proceed to checkout · {selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'}
          <ArrowRightIcon strokeWidth={3} className='w-4 h-4' />
        </button>

      </section>

    </main>
  ) : (
    <Loading />
  )
}

export default SeatLayout
