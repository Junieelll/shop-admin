import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function CustomDropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Select option',
  icon,
  className = '',
  align = 'left',
  fullWidth = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const selectedOption = options.find(opt => String(opt.value) === String(value))

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={dropdownRef} className={`relative ${fullWidth ? 'w-full block' : 'inline-block'} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${fullWidth ? 'w-full justify-between' : ''} flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-pointer whitespace-nowrap shadow-2xs`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {(selectedOption?.icon || icon) && (
            <span className="text-neutral-500 dark:text-neutral-400 shrink-0">
              {selectedOption?.icon || icon}
            </span>
          )}

          <span className="truncate max-w-[150px] sm:max-w-[200px]">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedOption?.count !== undefined && (
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 font-mono">
              {selectedOption.count}
            </span>
          )}

          <motion.svg
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.15 }}
            className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 mt-1.5 ${fullWidth ? 'w-full' : 'min-w-[200px]'} max-h-64 overflow-y-auto p-1.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl backdrop-blur-md ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            <div className="space-y-0.5">
              {options.map((opt) => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {opt.icon && (
                        <span className={`shrink-0 ${isSelected ? 'text-inherit' : 'text-neutral-400'}`}>
                          {opt.icon}
                        </span>
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.count !== undefined && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                          isSelected
                            ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                        }`}>
                          {opt.count}
                        </span>
                      )}
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
