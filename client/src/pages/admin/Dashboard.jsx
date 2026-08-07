import { ChartLineIcon, CircleDollarSignIcon, PlayCircleIcon, StarIcon, UserIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { dummyDashboardData } from '../../assets/assets';
import Loading from '../../components/Loading';
import Title from '../../components/admin/Title';
import BlurCircle from '../../components/BlurCircle';
import { dateFormat } from '../../lib/dateFormat';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const Dashboard = () => {

    const {axios, getToken, user, TMDB_image_base_url} = useAppContext()

    const currency = import.meta.env.VITE_CURRENCY

    const [dashboardData, setDashboardData] = useState({
        totalBookings: 0,
        totalRevenue: 0, 
        activeShows: [],
        totalUser: 0
    });

    const [loading, setLoading] = useState(true)

    const dashboardCards = [
        { title: "Total Bookings", value: dashboardData.totalBookings || "0", icon: ChartLineIcon},
        { title: "Total Revenue", value: currency + dashboardData.totalRevenue || "0", icon: CircleDollarSignIcon},
        { title: "Active Shows", value: dashboardData.activeShows.length || "0", icon: PlayCircleIcon},
        { title: "Total Users", value: dashboardData.totalUser || "0", icon: UserIcon}
    ]

    const fetchDashboardData = async () => {
        // setDashboardData(dummyDashboardData)
        // setLoading(false)
        try {
            const { data } = await axios.get('/api/admin/dashboard', {headers: {Authorization: `Bearer ${await getToken()}`}})

            if(data.success){
                setDashboardData(data.dashboardData)
                setLoading(false)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error);
            toast.error("error fetching dashboard data: ", error)
        }
    }

    useEffect(()=>{
        if(user){
            fetchDashboardData();
        }
    }, [user])
    
  return !loading ? (
    <>
     <Title text1={"Admin"} text2="Dashboard" />
     <div className='relative mt-8 flex flex-wrap gap-4'>
        <BlurCircle top='-100px' left='0' />
        <div className='grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {dashboardCards.map((card, index) => (
                <div key={index} className='flex w-full items-center justify-between rounded-2xl border border-white/8 bg-panel p-5 shadow-[0_16px_45px_rgba(0,0,0,0.18)] transition hover:border-white/15'>
                    <div>
                        <h2 className='text-xs font-medium uppercase tracking-[0.14em] text-zinc-500'>{card.title}</h2>
                        <p className='mt-2 text-2xl font-semibold'>{card.value}</p>
                    </div>
                    <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                      <card.icon className='h-5 w-5' />
                    </span>
                </div>
            ))}
        </div>
    </div> 

    <div className='mt-12 flex items-center justify-between'>
      <div>
        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-primary'>Live catalogue</p>
        <h2 className='mt-1 text-xl font-semibold'>Active Shows</h2>
      </div>
      <span className='rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400'>{dashboardData.activeShows.length} shows</span>
    </div>
    <div className='relative mt-6 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
        <BlurCircle top='100px' left='-10%' />
        {dashboardData.activeShows.map((show) => (
            <article key={show._id} className='h-full overflow-hidden rounded-2xl border border-white/8 bg-panel pb-4 transition duration-300 hover:-translate-y-1 hover:border-white/15'>
                <img src={TMDB_image_base_url + show.movie.poster_path} className='aspect-[4/5] w-full object-cover object-top' alt={show.movie.title} />
                <p className='truncate px-4 pt-4 font-semibold'>{show.movie.title}</p>
                <div className='flex items-center justify-between px-4 pt-3'>
                    <p className='text-lg font-semibold'>{currency} {show.showPrice}</p>
                    <p className='flex items-center gap-1 text-sm text-zinc-400'>
                        <StarIcon className='w-4 h-4 text-primary fill-primary' />
                        {show.movie.vote_average}
                    </p>
                </div>
                <p className='px-4 pt-2 text-xs text-zinc-500'>{dateFormat(show.showDateTime)}</p>
            </article>
        ))}
    </div>
    </>
  ) : (
    <Loading />
  )
}

export default Dashboard
