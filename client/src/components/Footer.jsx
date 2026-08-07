import React from 'react'
import { assets } from '../assets/assets'

const Footer = () => {
  return (
    <footer className='mt-28 w-full border-t border-white/8 bg-black/25 px-6 text-zinc-400 sm:px-8 lg:px-12'>
      <div className='mx-auto max-w-7xl'>
        <div className='flex w-full flex-col justify-between gap-12 border-b border-white/8 py-14 md:flex-row'>
          <div className='md:max-w-96'>
            <img alt='QuickShow' className='h-10' src={assets.logo} />
            <p className='mt-5 text-sm leading-6 text-zinc-500'>
              Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
            </p>
            <div className='mt-5 flex items-center gap-2'>
              <img src={assets.googlePlay} alt='Google Play' className='h-9 w-auto opacity-80 transition hover:opacity-100' />
              <img src={assets.appStore} alt='App Store' className='h-9 w-auto opacity-80 transition hover:opacity-100' />
            </div>
          </div>

          <div className='flex flex-1 items-start gap-14 sm:gap-24 md:justify-end lg:gap-36'>
            <div>
              <h2 className='mb-5 font-semibold text-white'>Company</h2>
              <ul className='space-y-3 text-sm'>
                <li><a className='transition hover:text-white' href='#'>Home</a></li>
                <li><a className='transition hover:text-white' href='#'>About us</a></li>
                <li><a className='transition hover:text-white' href='#'>Contact us</a></li>
                <li><a className='transition hover:text-white' href='#'>Privacy policy</a></li>
              </ul>
            </div>
            <div>
              <h2 className='mb-5 font-semibold text-white'>Get in touch</h2>
              <div className='space-y-3 text-sm'>
                <p>+91-234-567-890</p>
                <p>contact@example.com</p>
              </div>
            </div>
          </div>
        </div>

        <p className='py-5 text-center text-xs text-zinc-600'>
          Copyright {new Date().getFullYear()} © <a className='transition hover:text-zinc-300' href='https://prebuiltui.com'>QuickShow</a>. All Right Reserved.
        </p>
      </div>
    </footer>
  )
}

export default Footer
