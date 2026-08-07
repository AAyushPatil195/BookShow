import React, { useEffect, useState } from 'react'
import { dummyBookingData } from '../../assets/assets'
import Loading from '../../components/Loading'
import Title from '../../components/admin/Title'
import { dateFormat } from '../../lib/dateFormat'
import { useAppContext } from '../../context/AppContext'

const ListBookings = () => {

    const {axios, getToken, user} = useAppContext()

    const currency = import.meta.env.VITE_CURRENCY

    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)

    const getAllBookings = async () => {
        // setBookings(dummyBookingData)
        // setLoading(false)
        try {
            const { data } = await axios.get('/api/admin/all-bookings', {headers: {Authorization: `Bearer ${await getToken()}`}})
            setBookings(data.bookings)
        } catch (error) {
            console.error(error)
        }
        setLoading(false)
    }

    useEffect(() => {
        if(user){
            getAllBookings();
        }
    }, [user])

  return !loading ? (
    <>
      <Title text1="List" text2="Bookings" />
      <div className='mt-8 max-w-6xl overflow-hidden rounded-2xl border border-white/8 bg-panel shadow-[0_18px_50px_rgba(0,0,0,0.18)]'>
      <div className='overflow-x-auto'>
        <table className='w-full border-collapse text-nowrap'>
            <thead>
                <tr className='border-b border-white/8 bg-white/4 text-left text-[11px] uppercase tracking-[0.12em] text-zinc-500'>
                    <th className='px-5 py-4 font-semibold'>User Name</th>
                    <th className='px-5 py-4 font-semibold'>Movie Name</th>
                    <th className='px-5 py-4 font-semibold'>Show Time</th>
                    <th className='px-5 py-4 font-semibold'>Seats</th>
                    <th className='px-5 py-4 font-semibold'>Amount</th>
                </tr>
            </thead>

            <tbody className='divide-y divide-white/6 text-sm'>
                {bookings.map((item, index) => (
                    <tr key={index} className='text-zinc-300 transition hover:bg-white/3'>
                        <td className='min-w-48 px-5 py-4 font-medium text-white'>{item.user.name}</td>
                        <td className='px-5 py-4'>{item.show.movie.title}</td>
                        <td className='px-5 py-4 text-zinc-400'>{dateFormat(item.show.showDateTime)}</td>
                        <td className='px-5 py-4'>{Object.keys(item.bookedSeats).map(seat => item.bookedSeats[seat]).join(", ")}</td>
                        <td className='px-5 py-4 font-semibold'>{currency} {item.amount}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
      </div>
    </>
  ) : (
    <Loading  />
  )
}

export default ListBookings
