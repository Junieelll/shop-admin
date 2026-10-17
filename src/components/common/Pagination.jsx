

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 12,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [8, 12, 24, 48]
}) {
  if (totalItems === 0) return null

  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generate pagination items with ellipses for clean display
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages = []
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
    }
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 pb-2 px-1 text-xs text-neutral-600 dark:text-neutral-400">
      {/* Items count & Per Page selector */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="flex items-center gap-2 flex-wrap">
          {totalItems <= itemsPerPage ? (
            <span>
              Showing all <strong className="font-semibold text-neutral-900 dark:text-white">{totalItems}</strong> products
            </span>
          ) : (
            <span>
              Showing <strong className="font-semibold text-neutral-900 dark:text-white">{startItem}–{endItem}</strong> of{' '}
              <strong className="font-semibold text-neutral-900 dark:text-white">{totalItems}</strong> products
            </span>
          )}

          {totalPages > 1 && (
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </span>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="h-3 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
            <label className="text-[11px] text-neutral-500 flex items-center gap-1.5">
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  onItemsPerPageChange(Number(e.target.value))
                  onPageChange(1)
                }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold outline-none cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 shadow-2xs transition-colors"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Page navigation buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
            title="Previous Page"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Numeric Page Buttons (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((page, idx) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 text-neutral-400">
                    ...
                  </span>
                )
              }

              const isActive = page === currentPage
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange(page)}
                  className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                      : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>

          {/* Mobile Current Page Indicator */}
          <span className="sm:hidden px-3 py-1 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            {currentPage} / {totalPages}
          </span>

          {/* Next Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
            title="Next Page"
          >
            <span className="hidden sm:inline">Next</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
