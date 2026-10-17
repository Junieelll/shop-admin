import { motion, AnimatePresence } from 'framer-motion'
import ProductCard from './ProductCard'

export default function ProductGrid({
  products,
  isLoading,
  selectedStore,
  searchQuery,
  onToggleFeatured,
  onEdit,
  onDelete,
  onOpenAddModal
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="aspect-4/5 rounded-2xl sm:rounded-3xl bg-neutral-100 dark:bg-neutral-800/50 animate-pulse border border-neutral-200/60 dark:border-neutral-800" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20 px-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800"
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mb-4">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
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
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6"
    >
      <AnimatePresence mode="popLayout">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            selectedStore={selectedStore}
            onToggleFeatured={onToggleFeatured}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
