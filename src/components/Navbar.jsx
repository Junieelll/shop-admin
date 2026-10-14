import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function Navbar({
  activeTab = 'products', // 'products' | 'collections'
  selectedStore,
  onSelectStore,
  isDark,
  onToggleDark,
  isDbConnected,
  isSyncing = false
}) {
  const { user, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#121215]/80 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80 px-4 sm:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Logo & Navigation Tabs */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link to="/" className="flex items-center gap-2 group text-inherit no-underline">
            <span className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-base shadow-sm">
              S
            </span>
            <span className="font-bold text-lg tracking-tight text-neutral-900 dark:text-white group-hover:opacity-80 transition-opacity">
              ShopAdmin
            </span>
          </Link>

          <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-700 hidden sm:block" />

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
            {activeTab === 'products' ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Products</span>
              </span>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Products</span>
              </Link>
            )}

            {activeTab === 'collections' ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>Collections</span>
              </span>
            ) : (
              <Link
                to="/collections"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>Collections</span>
              </Link>
            )}
          </nav>

          <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-700 hidden md:block" />

          {/* Store Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60">
            <button
              type="button"
              onClick={() => onSelectStore('selyn')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStore === 'selyn'
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 4v2m-8-2v2m-2 4h12l2 10H4L6 8zm3 0V6a3 3 0 016 0v2" />
              </svg>
              <span>Selyn Dress</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectStore('luxe-haven')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStore === 'luxe-haven'
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>Luxe Haven II</span>
            </button>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          {/* Live Database Sync Indicator */}
          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border ${
            isDbConnected 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
            <span>{isDbConnected ? 'Neon DB Live' : (isSyncing ? 'Syncing...' : 'Connecting DB')}</span>
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDark}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white shadow-xs transition-colors cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* User Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{user?.email || 'admin@store.com'}</span>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-neutral-900 text-xs font-medium transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log out</span>
          </button>

        </div>
      </div>
    </header>
  )
}
