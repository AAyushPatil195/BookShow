import React from 'react'

const Title = ({ text1, text2}) => {
  return (
    <div>
      <p className='text-xs font-semibold uppercase tracking-[0.22em] text-primary'>QuickShow management</p>
      <h1 className='mt-2 text-3xl font-semibold tracking-tight'>
          {text1} <span className='text-zinc-400'>{text2}</span>
      </h1>
    </div>
  )
}

export default Title
