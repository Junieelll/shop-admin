import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'

export default function Sidebar({
  selectedStore,
  onSelectStore,
  isDark,
  onToggleDark,
  isDbConnected,
  isSyncing = false,
  isOpenMobile,
  onCloseMobile,
  productsCount = 0,
  collectionsCount = 0,
  categoriesCount = 0,
  onStartTour
}) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isProductsActive = location.pathname === '/' || location.pathname.startsWith('/products')
  const isCollectionsActive = location.pathname.startsWith('/collections')
  const isCategoriesActive = location.pathname.startsWith('/categories')

  const handleStoreSwitch = (store) => {
    onSelectStore(store)
    if (store === 'luxe-haven' && location.pathname.startsWith('/collections')) {
      navigate('/categories')
    } else if (store === 'selyn' && location.pathname.startsWith('/categories')) {
      navigate('/collections')
    }
  }

  const navContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#121215] border-r border-neutral-200/80 dark:border-neutral-800/80 p-4 transition-colors">
      
      {/* Brand & Mobile Close */}
      <div className="flex items-center justify-between pb-5 border-b border-neutral-100 dark:border-neutral-800/80">
        <Link to="/" className="flex items-center gap-2.5 text-inherit no-underline">
          <span className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-base shadow-sm">
            S
          </span>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-white leading-tight">
              ShopAdmin
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">
              E-Commerce Studio
            </span>
          </div>
        </Link>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Store Switcher */}
      <div className="pt-4 pb-2">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 px-1">
          Active Store
        </label>
        <div data-tour="store-switcher" className="flex flex-col gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50">
          <button
            type="button"
            onClick={() => handleStoreSwitch('selyn')}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedStore === 'selyn'
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 4v2m-8-2v2m-2 4h12l2 10H4L6 8zm3 0V6a3 3 0 016 0v2" />
              </svg>
              <span>Selyn Dress</span>
            </div>
            {selectedStore === 'selyn' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-600" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleStoreSwitch('luxe-haven')}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedStore === 'luxe-haven'
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>Luxe Haven II</span>
            </div>
            {selectedStore === 'luxe-haven' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-600" />
            )}
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 space-y-1">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 px-1">
          Catalog Navigation
        </label>

        <Link
          to="/"
          onClick={onCloseMobile}
          className={`flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all no-underline ${
            isProductsActive
              ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Products</span>
          </div>
          {productsCount > 0 && (
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
              isProductsActive
                ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
            }`}>
              {productsCount}
            </span>
          )}
        </Link>

        {/* Dynamic: Categories for Luxe Haven, Collections for Selyn Dress */}
        {selectedStore === 'luxe-haven' ? (
          <Link
            to="/categories"
            onClick={onCloseMobile}
            className={`flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all no-underline ${
              isCategoriesActive
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>Categories</span>
            </div>
            {categoriesCount > 0 && (
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                isCategoriesActive
                  ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
              }`}>
                {categoriesCount}
              </span>
            )}
          </Link>
        ) : (
          <Link
            to="/collections"
            onClick={onCloseMobile}
            className={`flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all no-underline ${
              isCollectionsActive
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>Collections</span>
            </div>
            {collectionsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                isCollectionsActive
                  ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
              }`}>
                {collectionsCount}
              </span>
            )}
          </Link>
        )}


        <Link
          to="/profile"
          onClick={onCloseMobile}
          className={`flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all no-underline ${
            location.pathname === '/profile'
              ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Admin Profile</span>
          </div>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
            Account
          </span>
        </Link>
      </div>

      {/* Bottom Section: DB Live Status, Theme & User */}
      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 space-y-3">
        {/* Take Tour Guide Button */}
        {onStartTour && (
          <button
            type="button"
            onClick={() => {
              if (onCloseMobile) onCloseMobile()
              onStartTour()
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer border border-dashed border-neutral-300 dark:border-neutral-700"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Take Tour</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold">
              Guide
            </span>
          </button>
        )}

        {/* DB Live Connection */}
        <div data-tour="db-status" className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-semibold border ${
          isDbConnected 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
            <span>{isDbConnected ? 'Turso DB Live' : (isSyncing ? 'Syncing...' : 'Connecting DB')}</span>
          </div>
          <span className="text-[10px] text-neutral-400">SQLite</span>
        </div>

        {/* Theme Toggle & User Info */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-800">
          <Link
            to="/profile"
            onClick={onCloseMobile}
            className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity no-underline"
            title="Manage Admin Profile"
          >
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || 'Admin'}
                className="w-7 h-7 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-200 shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'A')}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                {user?.name || user?.email?.split('@')[0] || 'Admin'}
              </p>
              <p className="text-[10px] text-neutral-400 truncate">
                {user?.email || 'admin@store.com'}
              </p>
            </div>
          </Link>

          {/* Dark mode button */}
          <button
            type="button"
            onClick={onToggleDark}
            className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white shadow-2xs transition-colors cursor-pointer shrink-0"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={signOut}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 bg-white dark:bg-neutral-900 text-xs font-semibold transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Log out</span>
        </button>
      </div>

    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpenMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 z-50 shadow-2xl"
            >
              {navContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
