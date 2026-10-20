import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export const TOUR_STEPS = [
  {
    target: '[data-tour="store-switcher"]',
    requiresSidebar: true,
    title: 'Switch Between Stores',
    description: 'Easily toggle between Selyn Dress (dress rentals & sizing) and Luxe Haven II (perfumes, fine jewelry & eyewear). Each store has its own independent catalog and database.',
    badge: 'Multi-Store',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    )
  },
  {
    target: '[data-tour="add-product-btn"]',
    title: 'Add New Products',
    description: 'Tap "+ Add Product" to create new catalog items. Upload multiple product photos, set prices, define custom attributes (sizes, scent, gemstones), and assign collections.',
    badge: 'Add Inventory',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    )
  },
  {
    target: '[data-tour="featured-star-btn"]',
    title: 'Pin Featured Products',
    description: 'Tap the star badge on any product card to feature it directly on the customer-facing storefront homepage (up to 10 products per store).',
    badge: 'Homepage Star',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    )
  },
  {
    target: '[data-tour="edit-product-btn"]',
    title: 'Edit Product Details',
    description: 'Tap "Edit" on any card to update names, adjust prices, upload more gallery photos, change size pills, or re-link collections at any time.',
    badge: 'Edit Details',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    )
  },
  {
    target: '[data-tour="delete-product-btn"]',
    title: 'Delete Products Safely',
    description: 'Need to remove an obsolete item? Tap the trash icon. A confirmation modal will appear first so products are never deleted accidentally.',
    badge: 'Delete Product',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    )
  },
  {
    target: '[data-tour="product-toolbar"]',
    title: 'Search, Filter & Layouts',
    description: 'Find products instantly with live search, filter by category or collections, and toggle between modern 2-column Grid view and detailed Table view.',
    badge: 'Toolbar & Views',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    )
  },
  {
    target: '[data-tour="collections-link"]',
    title: 'Curate Collections',
    description: 'Organize items into lookbooks, seasonal drops, or themed collections. You can create new collections with banner images and link products with one click.',
    badge: 'Collections',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    target: '[data-tour="db-status"]',
    requiresSidebar: true,
    title: 'Live Neon Database Sync',
    description: 'Your shop is connected live to Turso serverless SQLite. All product updates, rate changes, and collection links sync directly in realtime.',
    badge: 'Realtime Sync',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    )
  }
]

export default function OnboardingTour({ isOpen, onClose, isOpenMobile, setIsOpenMobile }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)

  const currentStep = TOUR_STEPS[currentStepIndex]

  // Manage mobile sidebar drawer visibility according to step requirements
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return
    const isMobile = window.innerWidth < 1024

    if (isMobile && setIsOpenMobile) {
      const stepNeedsSidebar = Boolean(currentStep?.requiresSidebar)
      if (isOpenMobile !== stepNeedsSidebar) {
        setIsOpenMobile(stepNeedsSidebar)
      }
    }
  }, [isOpen, currentStepIndex, currentStep, isOpenMobile, setIsOpenMobile])

  // Measure and position highlight box, finding the visible target candidate
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !currentStep) return

    const isMobile = window.innerWidth < 1024

    // Query all matching elements to find the visible one
    // (Sidebar elements exist twice in DOM: desktop aside & mobile drawer)
    const elements = Array.from(document.querySelectorAll(currentStep.target))
    let el = null

    for (const candidate of elements) {
      const rect = candidate.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0 && rect.right > 0) {
        el = candidate
        break
      }
    }

    if (el) {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight

      // If element is not inside the sidebar, scroll it comfortably into view
      if (!currentStep.requiresSidebar) {
        // If element is inside a product card (like edit-btn, delete-btn, featured-star-btn),
        // scroll relative to the ENTIRE product card so the whole card is visible, not just the button!
        const cardParent = el.closest('[data-tour-card]') || el.closest('.group')
        const scrollTarget = cardParent || el
        const scrollRect = scrollTarget.getBoundingClientRect()

        if (isMobile) {
          const isOffscreenOrClose = scrollRect.top < 65 || scrollRect.bottom > vh - 180
          if (isOffscreenOrClose) {
            const docScrollTop = window.pageYOffset || document.documentElement.scrollTop
            const targetY = docScrollTop + scrollRect.top - 75 // aligns the whole card nicely below the header
            window.scrollTo({
              top: Math.max(0, targetY),
              behavior: 'smooth'
            })
          }
        } else {
          const isOffscreen =
            scrollRect.top < 80 ||
            scrollRect.bottom > vh - 80 ||
            scrollRect.left < 0 ||
            scrollRect.right > window.innerWidth

          if (isOffscreen) {
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }

      const syncRect = () => {
        // Find visible element (in case sidebar just finished sliding in)
        const freshList = Array.from(document.querySelectorAll(currentStep.target))
        const freshEl = freshList.find(c => {
          const r = c.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && r.right > 0
        }) || el

        const fresh = freshEl.getBoundingClientRect()
        if (fresh.width === 0 || fresh.height === 0 || fresh.right <= 0) {
          return
        }

        const pad = window.innerWidth < 640 ? 4 : 6
        const padLeft = Math.max(4, fresh.left - pad)
        const padTop = Math.max(4, fresh.top - pad)
        const padWidth = Math.min(window.innerWidth - padLeft - 4, fresh.width + pad * 2)
        const padHeight = fresh.height + pad * 2

        setTargetRect({
          top: padTop,
          left: padLeft,
          width: padWidth,
          height: padHeight
        })
      }

      syncRect()
      // Account for sidebar drawer slide animation timing
      const t1 = setTimeout(syncRect, 100)
      const t2 = setTimeout(syncRect, 220)
      const t3 = setTimeout(syncRect, 360)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    } else {
      // Retry in 150ms in case the drawer is still mid-animation
      const retryTimer = setTimeout(() => {
        const freshList = Array.from(document.querySelectorAll(currentStep.target))
        const found = freshList.find(c => {
          const r = c.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && r.right > 0
        })
        if (found) {
          const fresh = found.getBoundingClientRect()
          const pad = window.innerWidth < 640 ? 4 : 6
          setTargetRect({
            top: Math.max(4, fresh.top - pad),
            left: Math.max(4, fresh.left - pad),
            width: Math.min(window.innerWidth - 8, fresh.width + pad * 2),
            height: fresh.height + pad * 2
          })
        } else {
          setTargetRect(null)
        }
      }, 150)
      return () => clearTimeout(retryTimer)
    }
  }, [isOpen, currentStep])

  useEffect(() => {
    updateTargetPosition()
    const handleResize = () => updateTargetPosition()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
    }
  }, [updateTargetPosition])

  if (!isOpen) return null

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem('shopadmin_tour_seen', 'true')
    if (setIsOpenMobile) setIsOpenMobile(false)
    onClose()
    setCurrentStepIndex(0)
  }

  // Calculate card position dynamically relative to spotlight target
  const getCardStyle = () => {
    const isMobile = window.innerWidth < 640

    if (!targetRect) {
      // Fallback: center in viewport
      return {
        top: isMobile ? '25%' : '50%',
        left: '12px',
        right: '12px',
        maxWidth: '380px',
        margin: '0 auto',
        transform: isMobile ? 'none' : 'translateY(-50%)'
      }
    }

    if (isMobile) {
      const vh = window.innerHeight
      const spaceAbove = targetRect.top
      const spaceBelow = vh - (targetRect.top + targetRect.height)
      const estCardHeight = 175

      // Place card below if enough room, otherwise above
      const placeAtBottom = spaceBelow >= estCardHeight || spaceBelow >= spaceAbove

      return {
        left: '12px',
        right: '12px',
        maxWidth: '380px',
        margin: '0 auto',
        bottom: placeAtBottom ? 'max(12px, env(safe-area-inset-bottom, 12px))' : 'auto',
        top: placeAtBottom ? 'auto' : 'max(12px, env(safe-area-inset-top, 12px))'
      }
    }

    // Desktop positioning
    const cardWidth = Math.min(360, window.innerWidth - 32)
    const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height)
    const spaceAbove = targetRect.top
    const preferBelow = spaceBelow > 240 || spaceBelow > spaceAbove

    let top = preferBelow
      ? targetRect.top + targetRect.height + 12
      : targetRect.top - 230

    top = Math.max(16, Math.min(window.innerHeight - 250, top))

    let left = targetRect.left
    if (left + cardWidth > window.innerWidth - 16) {
      left = window.innerWidth - cardWidth - 16
    }
    left = Math.max(16, left)

    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`
    }
  }

  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 640
  const cornerRadius = isMobileScreen ? 12 : 16

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] pointer-events-auto overflow-hidden">
        {/* Click-outside backdrop dismiss */}
        <div
          className="absolute inset-0 z-30 cursor-pointer"
          onClick={handleComplete}
        />

        {/* SVG Spotlight Mask: Background is dark, cutout is 100% transparent and unblurred */}
        <svg className="fixed inset-0 w-full h-full pointer-events-none z-[60]">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left}
                  y={targetRect.top}
                  width={targetRect.width}
                  height={targetRect.height}
                  rx={cornerRadius}
                  ry={cornerRadius}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#tour-spotlight-mask)"
            className="transition-all duration-300"
          />
        </svg>

        {/* Spotlight border ring */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: 1,
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute rounded-xl sm:rounded-2xl border-2 border-white ring-4 ring-white/25 pointer-events-none z-[65] shadow-2xl"
          />
        )}

        {/* Floating Tooltip Card */}
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          style={getCardStyle()}
          className="fixed z-[70] bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl border border-neutral-200/90 dark:border-neutral-800 text-neutral-900 dark:text-white pointer-events-auto max-h-[min(380px,calc(100dvh-24px))] flex flex-col justify-between"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2.5 mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                {currentStep.icon}
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block truncate">
                  {currentStep.badge}
                </span>
                <h3 className="text-xs sm:text-sm font-bold m-0 text-neutral-900 dark:text-white truncate">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleComplete}
              className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white rounded-lg text-xs cursor-pointer transition-colors shrink-0"
              title="Skip tutorial"
              aria-label="Skip tutorial"
            >
              ✕
            </button>
          </div>

          {/* Description */}
          <div className="overflow-y-auto pr-0.5 mb-2.5 sm:mb-4">
            <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed m-0">
              {currentStep.description}
            </p>
          </div>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
            {/* Step Indicators */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-4 sm:w-5 bg-black dark:bg-white'
                      : 'w-1 sm:w-1.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-400'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
              <span className="text-[9px] sm:text-[10px] text-neutral-400 ml-1 sm:ml-1.5 font-semibold">
                {currentStepIndex + 1}/{TOUR_STEPS.length}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  Back
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-[11px] sm:text-xs font-semibold shadow-xs hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                {currentStepIndex === TOUR_STEPS.length - 1 ? 'Got it!' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
