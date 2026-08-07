import React, { useState } from 'react'
import BlurCircle from './BlurCircle'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const DateSelect = ({dateTime, id}) => {

    const navigate = useNavigate();
    const [selected, setSelected] = useState(null);

    const onBookHandler = ()=> {
        if(!selected) return toast('Please select a date')
        navigate(`/movies/${id}/${selected}`);
        scrollTo(0,0);
    }

  return (
    <section id='dateselect' className='scroll-mt-24 pt-24'>
      <div className='relative flex flex-col items-stretch justify-between gap-8 overflow-hidden rounded-3xl border border-white/10 bg-panel p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-8 md:flex-row md:items-end lg:p-10'>
       <BlurCircle top='-100px' left='-100px' />
       <BlurCircle top='100px' right='0px' />
       <div>
        <p className='text-xs font-semibold uppercase tracking-[0.22em] text-primary'>Select your show</p>
        <h2 className='mt-2 text-2xl font-semibold'>Choose a date</h2>
        <div className='mt-6 flex items-center gap-2 text-sm sm:gap-4'>
            <ChevronLeftIcon width={24} className='shrink-0 text-zinc-500' />
            <span className='grid flex-1 grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3'>
                {Object.keys(dateTime).map((date)=>(
                    <button onClick={()=>setSelected(date)} key={date} className={`flex h-16 min-w-16 flex-col items-center justify-center rounded-xl border transition cursor-pointer ${selected === date ? "border-primary bg-primary text-white shadow-lg shadow-primary/20" : "border-white/10 bg-white/5 text-zinc-300 hover:border-primary/50 hover:bg-white/8"}`}>
                        <span className='text-lg font-semibold leading-none'>{new Date(date).getDate()}</span>
                        <span className='mt-1 text-[10px] font-semibold uppercase tracking-wider'>{new Date(date).toLocaleString("en-US", {month: "short"})}</span>
                    </button>
                ))}
            </span>
            <ChevronRightIcon width={24} className='shrink-0 text-zinc-500' />
        </div>
       </div>
       <button onClick={onBookHandler} className='shrink-0 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-dull active:scale-95 cursor-pointer'>
        {/* Book Now */}
        Book Now
       </button>
      </div>
    </section>
  )
}

export default DateSelect
