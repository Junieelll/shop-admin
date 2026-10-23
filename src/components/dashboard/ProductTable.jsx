import { motion, AnimatePresence } from 'framer-motion'

export default function ProductTable({
  products,
  isLoading,
  selectedStore,
  searchQuery,
  onToggleFeatured,
  onEdit,
  onDelete,
  onOpenAddModal
}) {
  const isLuxe = selectedStore === 'luxe-haven'

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 px-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mb-4">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
          {searchQuery ? 'No matching products' : 'No products found'}
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-5">
          {searchQuery
            ? 'Try adjusting your search query or clear the filter.'
            : 'Get started by adding your first product to this store catalog.'}
        </p>
        {!searchQuery && (
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold cursor-pointer shadow-sm"
          >
            + Add Product
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-200/70 dark:border-neutral-800 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              <th className="py-3.5 px-4">Product</th>
              <th className="py-3.5 px-4">Price</th>
              <th className="py-3.5 px-4">{isLuxe ? 'Specifications' : 'Sizes'}</th>
              <th className="py-3.5 px-4">{isLuxe ? 'Category' : 'Collections'}</th>
              <th className="py-3.5 px-4 text-center">{isLuxe ? 'Bestseller' : 'Featured'}</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 text-xs">
            <AnimatePresence>
              {products.map((product) => {
                const sizes = product.attributes?.sizes || []
                const galleryCount = (product.images || []).length
                const brand = product.attributes?.brand
                const volume = product.attributes?.volume
                const concentration = product.attributes?.concentration || product.attributes?.origin

                return (
                  <motion.tr
                    key={product.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors group"
                  >
                    {/* Product Cell */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-11 h-14 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {galleryCount > 1 && (
                            <span className="absolute bottom-1 right-1 px-1 rounded text-[9px] font-bold bg-black/70 text-white">
                              {galleryCount}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          {isLuxe && brand && (
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                              {brand}
                            </p>
                          )}
                          <p className="font-semibold text-neutral-900 dark:text-white text-sm truncate max-w-xs">
                            {product.name}
                          </p>
                          <span className="text-[11px] text-neutral-400">
                            #{product.id} {product.category_name && `• ${product.category_name}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 font-bold text-neutral-900 dark:text-white text-sm whitespace-nowrap">
                      ₱{Number(product.price).toLocaleString()}
                    </td>

                    {/* Sizes or Specs */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {!isLuxe ? (
                          sizes.map(s => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <>
                            {volume && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                {volume}
                              </span>
                            )}
                            {concentration && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                {concentration}
                              </span>
                            )}
                            {product.attributes?.notes && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] text-neutral-400 truncate max-w-xs block">
                                {product.attributes.notes}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Category or Collections */}
                    <td className="py-3 px-4">
                      {isLuxe ? (
                        product.category_name ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/50 dark:border-neutral-700/50">
                            {product.category_name}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">—</span>
                        )
                      ) : (
                        (product.collections || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(product.collections || []).map(c => (
                              <span
                                key={c.id || c.name}
                                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/50 dark:border-neutral-700/50"
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">—</span>
                        )
                      )}
                    </td>

                    {/* Featured / Bestseller */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onToggleFeatured(product.id)}
                        className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition-transform active:scale-90 cursor-pointer ${
                          product.featured
                            ? 'bg-amber-400 text-white shadow-xs'
                            : 'text-neutral-300 dark:text-neutral-700 hover:text-neutral-500'
                        }`}
                        title={
                          product.featured
                            ? (isLuxe ? 'Bestseller on homepage' : 'Featured on homepage')
                            : (isLuxe ? 'Mark as bestseller' : 'Mark as featured')
                        }
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(product)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(product)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  )
}
