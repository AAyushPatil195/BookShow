import React from 'react'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const Loading = () => {
  
  const { nextUrl } = useParams()
  const navigate = useNavigate()

  useEffect(()=>{
    if(nextUrl){
      setTimeout(()=>{
        navigate('/' + nextUrl)
      }, 8000)
    }
  }, [])

  return (
    <div className='flex h-[80vh] flex-col items-center justify-center gap-4'>
        <div className='relative h-14 w-14'>
          <div className='absolute inset-0 rounded-full border border-white/10'></div>
          <div className='absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-primary/40'></div>
        </div>
        <p className='text-xs font-medium uppercase tracking-[0.24em] text-zinc-500'>Loading</p>
    </div>
  )
}

export default Loading
