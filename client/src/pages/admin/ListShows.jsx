import React, { useEffect, useState } from 'react'
import { dummyShowsData } from '../../assets/assets';
import Loading from '../../components/Loading';
import Title from '../../components/admin/Title';
import { dateFormat } from '../../lib/dateFormat';
import { useAppContext } from '../../context/AppContext';

const ListShows = () => {

    const {axios, getToken, user, TMDB_image_base_url} = useAppContext()

    const currency = import.meta.env.VITE_CURRENCY;

    const [shows, setShows] = useState([]);
    const [loading, setLoading] = useState(true);

    const getAllShows = async () => {
        try{
            // setShows([{
            //     movie: dummyShowsData[0],
            //     showDateTime: "2025-06-30T02:30:00.000Z",
            //     showPrice: 59,
            //     occupiedSeats: {
            //         A1: "user_1",
            //         B1: "user_2",
            //         C1: "user_3",
            //     }
            // }]);
            // setLoading(false)
            
            const { data } = await axios.get('/api/admin/all-shows', {headers: {Authorization: `Bearer ${await getToken()}`}})
            setShows(data.shows);
            setLoading(false)
        } catch(err){
            console.log(err);
        }
    }

    useEffect(() => {
        if(user){
            getAllShows();
        }
    }, [user])

  return !loading ? (
    <>
       <Title text1="List" text2="Shows" /> 
       <div className='mt-8 max-w-5xl overflow-hidden rounded-2xl border border-white/8 bg-panel shadow-[0_18px_50px_rgba(0,0,0,0.18)]'>
       <div className='overflow-x-auto'>
        <table className='w-full border-collapse text-nowrap'>
            <thead>
                <tr className='border-b border-white/8 bg-white/4 text-left text-[11px] uppercase tracking-[0.12em] text-zinc-500'>
                    <th className='px-5 py-4 font-semibold'>Movie Name</th>
                    <th className='px-5 py-4 font-semibold'>Show Time</th>
                    <th className='px-5 py-4 font-semibold'>Total Bookings</th>
                    <th className='px-5 py-4 font-semibold'>Earnings</th>
                </tr>
            </thead>

            <tbody className='divide-y divide-white/6 text-sm'>
                {shows.map((show, index) => (
                    <tr key={index} className='text-zinc-300 transition hover:bg-white/3'>
                        <td className='min-w-52 px-5 py-4 font-medium text-white'>{show.movie.title}</td>
                        <td className='px-5 py-4 text-zinc-400'>{dateFormat(show.showDateTime)}</td>
                        <td className='px-5 py-4'>{Object.keys(show.occupiedSeats).length}</td>
                        <td className='px-5 py-4 font-semibold'>{currency} {Object.keys(show.occupiedSeats).length * show.showPrice}</td>
                    </tr>
                ))}
            </tbody>
        </table>
       </div>
       </div>
    </>
  ) : (
    <Loading />
  )
}

export default ListShows
