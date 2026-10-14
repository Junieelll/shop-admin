import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const toast = {
    success: (msg, dur) => showToast(msg, 'success', dur),
    error: (msg, dur) => showToast(msg, 'error', dur),
    warning: (msg, dur) => showToast(msg, 'warning', dur),
    info: (msg, dur) => showToast(msg, 'info', dur),
  }

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}

      {/* Floating Toast Container */}
      <aside aria-label="Notifications" className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100%-2.5rem)] pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const isError = t.type === 'error'
            const isSuccess = t.type === 'success'
            const isWarning = t.type === 'warning'

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl backdrop-blur-md border ${
                  isError
                    ? 'bg-white/95 dark:bg-neutral-900/95 border-red-500/30 text-neutral-900 dark:text-neutral-100'
                    : isSuccess
                    ? 'bg-white/95 dark:bg-neutral-900/95 border-emerald-500/30 text-neutral-900 dark:text-neutral-100'
                    : isWarning
                    ? 'bg-white/95 dark:bg-neutral-900/95 border-amber-500/30 text-neutral-900 dark:text-neutral-100'
                    : 'bg-white/95 dark:bg-neutral-900/95 border-blue-500/30 text-neutral-900 dark:text-neutral-100'
                }`}
              >
                {/* Status Icon */}
                <div className="shrink-0 mt-0.5">
                  {isError && (
                    <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="9" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                  )}
                  {isSuccess && (
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {isWarning && (
                    <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  )}
                  {!isError && !isSuccess && !isWarning && (
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="9" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className="flex-1 min-w-0 pr-1">
                  <p className="text-xs font-medium leading-relaxed break-words">
                    {t.message}
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                  aria-label="Dismiss toast"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </aside>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
