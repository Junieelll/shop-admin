import CustomDropdown from '../common/CustomDropdown'

export default function ProductToolbar({
  activeFilter,
  setActiveFilter,
  selectedStore,
  storeProductsCount,
  featuredCount,
  storeCollections,
  storeProducts,
  searchQuery,
  setSearchQuery,
  isSearching,
  viewMode,
  setViewMode
}) {
  const isLuxe = selectedStore === 'luxe-haven'

  return (
    <div className="relative z-30 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-2.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-visible">
      
      {/* Filter Pills & Custom Dropdowns */}
      <div className="flex flex-wrap items-center gap-2 p-1 text-xs overflow-visible">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          All Items ({storeProductsCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('featured')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
            activeFilter === 'featured'
              ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <svg className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>{isLuxe ? `Bestsellers (${featuredCount})` : `Featured (${featuredCount}/10)`}</span>
        </button>

        {/* Collection Dropdown Selector (Only for Selyn Dress) */}
        {!isLuxe && (
          <div className="flex items-center gap-1.5">
            <CustomDropdown
              value={typeof activeFilter === 'number' || (!isNaN(activeFilter) && activeFilter !== 'all' && !String(activeFilter).startsWith('cat:')) ? activeFilter : 'all'}
              onChange={(val) => setActiveFilter(val === 'all' ? 'all' : Number(val))}
              placeholder="Filter Collection"
              icon={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
              options={[
                { value: 'all', label: 'All Collections', count: storeProducts.length },
                ...storeCollections.map(col => ({
                  value: col.id,
                  label: col.name,
                  count: storeProducts.filter(p => (p.collection_ids || []).map(String).includes(String(col.id))).length,
                  icon: (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  )
                }))
              ]}
            />
          </div>
        )}

        {/* Categories Dropdown for Luxe Haven */}
        {isLuxe && (
          <CustomDropdown
            value={String(activeFilter).startsWith('cat:') ? activeFilter : 'all'}
            onChange={(val) => setActiveFilter(val)}
            placeholder="All Categories"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            options={[
              { value: 'all', label: 'All Categories' },
              {
                value: 'cat:perfume-for-women',
                label: 'Perfume for Women',
                count: storeProducts.filter(p => (p.category_slug === 'perfume-for-women') || (p.category_name?.toLowerCase() === 'perfume for women')).length,
              },
              {
                value: 'cat:perfume-for-men',
                label: 'Perfume for Men',
                count: storeProducts.filter(p => (p.category_slug === 'perfume-for-men') || (p.category_name?.toLowerCase() === 'perfume for men')).length,
              },
              {
                value: 'cat:perfume-sets',
                label: 'Perfume Sets',
                count: storeProducts.filter(p => (p.category_slug === 'perfume-sets') || (p.category_name?.toLowerCase() === 'perfume sets')).length,
              },
              {
                value: 'cat:eyewear-for-women',
                label: 'Eyewear for Women',
                count: storeProducts.filter(p => (p.category_slug === 'eyewear-for-women') || (p.category_name?.toLowerCase() === 'eyewear for women')).length,
              },
              {
                value: 'cat:eyewear-for-men',
                label: 'Eyewear for Men',
                count: storeProducts.filter(p => (p.category_slug === 'eyewear-for-men') || (p.category_name?.toLowerCase() === 'eyewear for men')).length,
              }
            ]}
          />
        )}
      </div>

      {/* Right Toolbar: Search & Grid/List Toggle */}
      <div className="flex items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 sm:w-60">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-white placeholder:text-neutral-400 border border-transparent focus:border-neutral-300 dark:focus:border-neutral-600 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-all"
          />
          <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {isSearching && (
            <div className="absolute right-7 top-1/2 -translate-y-1/2">
              <span className="w-3 h-3 rounded-full border-2 border-neutral-300 border-t-black dark:border-t-white animate-spin block" />
            </div>
          )}
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/50 dark:border-neutral-700/50">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
            title="Grid View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
            title="List View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  )
}
