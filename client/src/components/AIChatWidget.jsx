import { useEffect, useRef, useState } from 'react'
import { Bot, BotMessageSquare, LoaderCircle, RotateCcw, Send, Sparkles, X } from 'lucide-react'
import { useClerk } from '@clerk/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppContext } from '../context/AppContext'

const welcomeMessage = {
  role: 'assistant',
  content: 'Hi! I can help you discover movies, check showtimes, and find available seats by row.',
}

const markdownComponents = {
  p: ({ children }) => <p className='mb-2 last:mb-0'>{children}</p>,
  strong: ({ children }) => <strong className='font-semibold text-white'>{children}</strong>,
  ul: ({ children }) => <ul className='my-2 list-disc space-y-1 pl-4 marker:text-primary'>{children}</ul>,
  ol: ({ children }) => <ol className='my-2 list-decimal space-y-1 pl-4 marker:text-primary'>{children}</ol>,
  li: ({ children }) => <li className='pl-0.5'>{children}</li>,
  table: ({ children }) => (
    <div className='my-3 max-w-full overflow-x-auto rounded-xl border border-white/10 bg-black/20'>
      <table className='w-full min-w-[500px] border-collapse text-left text-[11px]'>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className='bg-white/[0.06] text-zinc-200'>{children}</thead>,
  th: ({ children }) => <th className='border-b border-white/10 px-3 py-2 font-semibold'>{children}</th>,
  td: ({ children }) => <td className='border-b border-white/[0.06] px-3 py-2 align-top text-zinc-300 last:border-r-0'>{children}</td>,
  blockquote: ({ children }) => <blockquote className='my-2 border-l-2 border-primary/50 pl-3 text-zinc-400'>{children}</blockquote>,
  code: ({ children }) => <code className='rounded bg-black/30 px-1.5 py-0.5 text-[11px] text-pink-200'>{children}</code>,
  a: ({ children, href }) => (
    <a href={href} target='_blank' rel='noreferrer' className='font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:text-pink-300'>
      {children}
    </a>
  ),
}

const AIChatWidget = () => {
  const { axios, getToken, user } = useAppContext()
  const { openSignIn } = useClerk()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([welcomeMessage])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [bookingDraft, setBookingDraft] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isOpen, messages, isLoading])

  const openWidget = () => {
    if (!user) {
      openSignIn()
      return
    }

    setIsOpen(true)
  }

  const resetConversation = () => {
    if (isLoading) return
    setMessages([welcomeMessage])
    setInput('')
    setBookingDraft(null)
  }

  const confirmBooking = async () => {
    const draft = bookingDraft
    if (!draft || isLoading) return

    setMessages((current) => [...current, { role: 'user', content: 'BOOK' }])
    setInput('')
    setBookingDraft(null)
    setIsLoading(true)

    try {
      const token = await getToken()
      const { data } = await axios.post(
        '/api/booking/create',
        {
          showId: draft.showId,
          selectedSeats: draft.selectedSeats,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (!data?.success || !data?.url) {
        throw new Error(data?.message || 'The booking could not be created.')
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: 'Your seats passed the final availability check. Redirecting you to secure payment…' },
      ])
      window.location.href = data.url
    } catch (error) {
      const content = error.response?.status === 401
        ? 'Your session has expired. Please sign in again and retry.'
        : error.response?.data?.message || error.message || 'The booking could not be created. Please check availability again.'

      setMessages((current) => [...current, { role: 'assistant', content, isError: true }])
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    const content = input.trim()
    if (!content || isLoading) return

    if (content.toUpperCase() === 'BOOK' && bookingDraft) {
      await confirmBooking()
      return
    }

    const userMessage = { role: 'user', content }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInput('')
    setBookingDraft(null)
    setIsLoading(true)

    try {
      const token = await getToken()
      const requestMessages = updatedMessages.slice(-12)
      const { data } = await axios.post(
        '/api/ai/chat',
        { messages: requestMessages },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (!data?.success || !data?.reply) {
        throw new Error('The assistant returned an invalid response.')
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: data.reply },
      ])
      setBookingDraft(data.action?.type === 'booking_draft' ? data.action : null)
    } catch (error) {
      const status = error.response?.status
      const content = status === 401
        ? 'Your session has expired. Please sign in again and retry.'
        : 'I could not complete that request right now. Please try again shortly.'

      setMessages((current) => [...current, { role: 'assistant', content, isError: true }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className='fixed bottom-5 right-4 z-[60] sm:bottom-7 sm:right-7'>
      {isOpen && user && (
        <section
          aria-label='QuickShow AI assistant'
          className='mb-4 flex h-[min(640px,calc(100vh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101014]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:w-[430px]'
        >
          <header className='flex items-center justify-between border-b border-white/8 bg-white/[0.025] px-4 py-3.5'>
            <div className='flex min-w-0 items-center gap-3'>
              <div className='relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20'>
                <Sparkles className='h-5 w-5' />
                <span className='absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#101014] bg-emerald-400' />
              </div>
              <div className='min-w-0'>
                <h2 className='truncate text-sm font-semibold text-white'>QuickShow AI</h2>
                <p className='truncate text-xs text-zinc-400'>Your movie companion</p>
              </div>
            </div>

            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={resetConversation}
                disabled={isLoading}
                aria-label='Start a new conversation'
                title='New conversation'
                className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40'
              >
                <RotateCcw className='h-4 w-4' />
              </button>
              <button
                type='button'
                onClick={() => setIsOpen(false)}
                aria-label='Close assistant'
                className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200'
              >
                <X className='h-4.5 w-4.5' />
              </button>
            </div>
          </header>

          <div className='flex-1 space-y-4 overflow-y-auto px-4 py-5' aria-live='polite'>
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex items-end gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400 ring-1 ring-white/8'>
                    <Bot className='h-3.5 w-3.5' />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    message.role === 'user'
                      ? 'max-w-[82%] whitespace-pre-wrap rounded-br-md bg-primary text-white shadow-[0_8px_22px_rgba(248,69,101,0.16)]'
                      : message.isError
                        ? 'max-w-[calc(100%-2.25rem)] rounded-bl-md border border-red-400/15 bg-red-400/8 text-red-100'
                        : 'max-w-[calc(100%-2.25rem)] overflow-hidden rounded-bl-md border border-white/8 bg-white/[0.045] text-zinc-200'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {message.content}
                    </ReactMarkdown>
                  ) : message.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className='flex items-end gap-2.5'>
                <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400 ring-1 ring-white/8'>
                  <Bot className='h-3.5 w-3.5' />
                </div>
                <div className='flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.045] px-3.5 py-3 text-zinc-500'>
                  <span className='h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]' />
                  <span className='h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]' />
                  <span className='h-1.5 w-1.5 animate-bounce rounded-full bg-current' />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <footer className='border-t border-white/8 bg-[#0c0c10]/90 p-3'>
            {bookingDraft && (
              <div className='mb-2.5 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.07] px-3 py-2'>
                <div className='min-w-0'>
                  <p className='text-[10px] font-semibold uppercase tracking-[0.16em] text-primary'>Booking draft ready</p>
                  <p className='mt-0.5 truncate text-[11px] text-zinc-400'>Seats {bookingDraft.selectedSeats.join(', ')} · Type BOOK to continue</p>
                </div>
                <span className='h-2 w-2 shrink-0 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.5)]' />
              </div>
            )}
            <div className='flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-1.5 transition focus-within:border-primary/35 focus-within:bg-white/[0.05]'>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 4000))}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={1}
                placeholder='Ask about movies or seats...'
                aria-label='Message QuickShow AI'
                className='max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-white outline-none placeholder:text-zinc-600 disabled:cursor-not-allowed'
              />
              <button
                type='button'
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                aria-label='Send message'
                className='flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary-dull active:scale-95 disabled:cursor-not-allowed disabled:bg-white/7 disabled:text-zinc-600'
              >
                {isLoading ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}
              </button>
            </div>
            <p className='mt-2 text-center text-[10px] text-zinc-600'>AI responses may be inaccurate. Verify details before booking.</p>
          </footer>
        </section>
      )}

      {!isOpen && (
        <div className='group relative'>
          <div className='pointer-events-none absolute -inset-2 rounded-[24px] bg-primary/15 opacity-40 blur-xl transition duration-300 group-hover:opacity-80' />
          <button
            type='button'
            onClick={openWidget}
            aria-label={user ? 'Open QuickShow AI assistant' : 'Sign in to use QuickShow AI'}
            className='relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-[#15151a]/95 p-2.5 pr-4 text-white shadow-[0_16px_50px_rgba(0,0,0,0.48)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:bg-[#19191f]'
          >
            <span className='pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent' />
            <span className='relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#ff718b] text-white shadow-[0_10px_28px_rgba(248,69,101,0.3)] transition duration-300 group-hover:scale-105'>
              <BotMessageSquare className='h-5 w-5' />
            </span>
            <span className='min-w-0 text-left'>
              <span className='flex items-center gap-2'>
                <span className='text-[13px] font-semibold leading-tight tracking-[-0.01em]'>QuickShow AI</span>
              </span>
              <span className='mt-1 flex items-center gap-1.5 text-[10px] leading-tight text-zinc-500'>
                <span className='h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' />
                {user ? 'Movies, showtimes & seats' : 'Sign in to start chatting'}
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

export default AIChatWidget
