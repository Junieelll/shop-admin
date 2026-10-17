import { Link } from 'react-router-dom'

export default function CollectionsHeader({
  selectedStore,
  totalCollections,
  totalTaggedProducts,
  onOpenCreateModal
}) {
  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white m-0 flex items-center gap-2.5">
            <span>Collections Directory</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
              {selectedStore === 'selyn' ? 'Selyn Dress' : 'Luxe Haven II'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Curate seasonal drops, lookbooks, and promotional lines without cluttering the product inventory.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            to="/"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold shadow-xs transition-all no-underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Products</span>
          </Link>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Collection</span>
          </button>
        </div>
      </div>

      {/* Compact Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">
            <span className="sm:hidden">Collections</span>
            <span className="hidden sm:inline">Total Collections</span>
          </span>
          <p className="text-base sm:text-2xl font-bold mt-0.5 sm:mt-1 text-neutral-900 dark:text-white">
            {totalCollections}
          </p>
        </div>

        <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">
            <span className="sm:hidden">Tagged</span>
            <span className="hidden sm:inline">Tagged Products</span>
          </span>
          <p className="text-base sm:text-2xl font-bold mt-0.5 sm:mt-1 text-neutral-900 dark:text-white">
            {totalTaggedProducts}
          </p>
        </div>

        <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col justify-between min-w-0">
          <span className="text-[10px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">
            <span className="sm:hidden">Store</span>
            <span className="hidden sm:inline">Store Active</span>
          </span>
          <p className="text-xs sm:text-sm font-semibold mt-0.5 sm:mt-1 text-neutral-900 dark:text-white flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">{selectedStore === 'selyn' ? 'Selyn Dress' : 'Luxe Haven II'}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
