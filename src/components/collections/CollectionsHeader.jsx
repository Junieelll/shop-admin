import { Link } from 'react-router-dom'

export default function CollectionsHeader({
  selectedStore,
  totalCollections,
  totalTaggedProducts,
  onOpenCreateModal
}) {
  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

        <div className="flex items-center gap-2.5">
          <Link
            to="/"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold shadow-xs transition-all no-underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Products</span>
          </Link>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Collection</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Collections</span>
          <p className="text-2xl font-bold mt-1 text-neutral-900 dark:text-white">
            {totalCollections}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Tagged Products</span>
          <p className="text-2xl font-bold mt-1 text-neutral-900 dark:text-white">
            {totalTaggedProducts}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Store Active</span>
          <p className="text-sm font-bold mt-2 text-neutral-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{selectedStore === 'selyn' ? 'Selyn Dress Studio' : 'Luxe Haven II Boutique'}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
