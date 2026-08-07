import React, { useEffect, useState } from 'react'
import { dummyShowsData } from '../../assets/assets'
import Loading from '../../components/Loading'
import Title from '../../components/admin/Title'
import { CheckIcon, DeleteIcon, StarIcon } from 'lucide-react'
import { kConverter } from '../../lib/kConverter'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'

const AddShows = () => {

    // Get user & token
    const {axios, getToken, user, TMDB_image_base_url} = useAppContext()

    const currency = import.meta.env.VITE_CURRENCY
    const [nowPlayingMovies, setNowPlayingMovies] = useState([])
    const [selectedMovie, setSelectedMovie] = useState(null)
    const [dateTimeSelection, setDateTimeSelection] = useState({})
    const [dateTimeInput, setDateTimeInput] = useState("")
    const [showPrice, setShowPrice] = useState("")
    const [addingShow, setAddingShow] = useState(false)

    const fetchNowPlayingMovies = async () => {
        // setNowPlayingMovies(dummyShowsData)
        // Get data from API
        try {
            const token = await getToken();
            const { data } = await axios.get('/api/show/now-playing', 
                                {
                                    headers: { Authorization: `Bearer ${token}`}
                                }
                            )
            if(data.success){
                setNowPlayingMovies(data.movies)
            }
            else{
                console.log(data.message)
            }
        } catch (error) {
            console.error('Error fetching movies: ', error)
        }
    };

    const handleDateTimeAdd = () => {
        if(!dateTimeInput) return;
        const [date, time] = dateTimeInput.split("T");
        if(!date || !time) return;

        setDateTimeSelection((prev) => {
            const times = prev[date] || [];
            if(!times.includes(time)) {
                return {...prev, [date]: [...times, time]};
            }
            return prev;
        })
    }

    const handleRemoveTime = (date, time) => {
        setDateTimeSelection((prev) => {
            const filteredTimes = prev[date].filter((t) => t !== time);
            if(filteredTimes.length === 0) {
                const { [date]: _, ...rest } = prev;
                return rest;
            }
            return {
                ...prev,
                [date]: filteredTimes,
            }
        })
    }

    const handleSubmit = async () => {
        try {
            setAddingShow(true);

            if(!selectedMovie || Object.keys(dateTimeSelection).length === 0 || !showPrice){
                return toast('Missing required fields')
            }
            const showsInput = Object.entries(dateTimeSelection).map(([date, time])=>({date, time}))
            
            const payload = {
                movieId: selectedMovie,
                showsInput,
                showPrice: Number(showPrice)
            }

            const { data } = axios.post('/api/show/add',
                                            payload,
                                            { headers: 
                                                {Authorization: `Bearer ${await getToken()}`}
                                            }
                                        );
            if(data.success){
                toast.success(data.message);
                setSelectedMovie(null);
                setDateTimeSelection({});
                setShowPrice('');
            }
            else{
                toast.error(data.message);
            }

        } catch (error) {
            console.error("Submission Error:", error)
            // if(!data.success) toast.error('An error occurred. Please try again!');
            // else toast.success(data.message);
            toast.error('An error occurred. Please try again!');
        }
        setAddingShow(false)
    }

    useEffect(() => {
        if(user){
            fetchNowPlayingMovies();
        }
    }, [user])

  return nowPlayingMovies.length > 0 ? (
    <>
     <Title text1="Add" text2="Shows" /> 
     <div className='mt-10 flex items-end justify-between gap-4'>
       <div>
         <p className='text-xs font-semibold uppercase tracking-[0.2em] text-primary'>Step 01</p>
         <h2 className='mt-1 text-xl font-semibold'>Choose a movie</h2>
       </div>
       <p className='text-xs text-zinc-500'>Now playing</p>
     </div>
     <div className='no-scrollbar overflow-x-auto pb-4'>
        <div className='group mt-5 flex w-max gap-4'>
            {nowPlayingMovies.map((movie)=>(
                <div key={movie.id} onClick={()=>setSelectedMovie(movie.id)} className={`relative w-36 cursor-pointer transition duration-300 hover:-translate-y-1 sm:w-40 ${selectedMovie && selectedMovie !== movie.id ? 'opacity-45 hover:opacity-100' : ''}` }>
                    <div className={`relative overflow-hidden rounded-2xl border bg-panel p-1.5 transition ${selectedMovie === movie.id ? 'border-primary shadow-lg shadow-primary/20' : 'border-white/8 hover:border-white/20'}`}>
                        <img src={TMDB_image_base_url + movie.poster_path} className='aspect-[2/3] w-full rounded-xl object-cover brightness-90' alt={movie.title} />
                        <div className='absolute inset-x-1.5 bottom-1.5 flex items-center justify-between rounded-b-xl bg-black/75 p-2 text-[11px] backdrop-blur-md'>
                            <p className='flex items-center gap-1 text-zinc-300'>
                                <StarIcon className='w-4 h-4 text-primary fill-primary' />
                                {(movie.vote_average).toFixed(1)}
                            </p>
                            <p className='text-zinc-400'>{kConverter(movie.vote_count)} Votes</p>
                        </div>
                    </div>
                    
                    {selectedMovie === movie.id && (
                        <div className='absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/25'>
                            <CheckIcon className='w-4 h-4 text-white' strokeWidth={2.5} />
                        </div>
                    )}
                    <p className='mt-3 truncate text-sm font-semibold'>{movie.title}</p>
                    <p className='mt-1 text-xs text-zinc-500'>{movie.release_date}</p>
                </div>
            ))}
        </div>
     </div>

     <div className='mt-8 max-w-3xl rounded-2xl border border-white/8 bg-panel p-6 sm:p-8'>
     <div className='mb-7'>
       <p className='text-xs font-semibold uppercase tracking-[0.2em] text-primary'>Step 02</p>
       <h2 className='mt-1 text-xl font-semibold'>Schedule your show</h2>
     </div>

     {/* Show Price Input */}
     <div>
        <label className='mb-2 block text-sm font-medium text-zinc-300'>Show Price</label>
        <div className='flex max-w-sm items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-4 py-3 transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10'>
            <p className='text-sm text-zinc-500'>{currency}</p>
            <input min={0} type='number' value={showPrice} onChange={(e) => setShowPrice(e.target.value)} placeholder='Enter Show Price' className='w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600' />
        </div>
     </div>

     {/* Date & Time Selection */}
     <div className='mt-6'>
        <label className='mb-2 block text-sm font-medium text-zinc-300'>Select Date & Time</label>
        <div className='flex max-w-lg flex-col gap-3 rounded-xl border border-white/10 bg-white/4 p-2 pl-4 focus-within:border-primary/60 sm:flex-row'>
            <input type='datetime-local' value={dateTimeInput} onChange={(e)=>setDateTimeInput(e.target.value)} className='min-w-0 flex-1 bg-transparent py-2 text-sm outline-none' />
            <button onClick={handleDateTimeAdd} className='rounded-lg bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary cursor-pointer' >Add Time</button>
        </div>
     </div>

     {/* Display Selected Times */}
     {Object.keys(dateTimeSelection).length > 0 && (
        <div className='mt-7 border-t border-white/8 pt-6'>
            <h3 className='mb-3 text-sm font-medium text-zinc-300'>Selected showtimes</h3>
            <ul className='space-y-4'>
                {Object.entries(dateTimeSelection).map(([date,times]) => (
                    <li key={date}>
                        <div className='text-xs font-semibold uppercase tracking-wider text-zinc-500'>{date}</div>
                        <div className='mt-2 flex flex-wrap gap-2 text-sm'>
                            {
                                times.map((time) => (
                                    <div key={time} className='flex items-center rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5 text-zinc-200' >
                                        <span>{time}</span>
                                        <DeleteIcon onClick={()=>handleRemoveTime(date, time)} width={15} className='ml-2 text-primary transition hover:text-white cursor-pointer' />
                                    </div>
                                ))
                            }
                        </div>
                    </li>
                ))}
            </ul>
        </div>
     )}

     {/* Add Show */}
     <button onClick={handleSubmit} disabled={addingShow} className='mt-8 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-dull disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'>Add Show</button>
     </div>
    </>
  ) : (
    <Loading />
  )
}

export default AddShows
