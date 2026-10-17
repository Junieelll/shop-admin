import { motion, AnimatePresence } from 'framer-motion'

export default function DeleteProductModal({
  productToDelete,
  onClose,
  onConfirm
}) {
  if (!productToDelete) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
            className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </motion.div>

          <h2 className="text-base font-bold text-neutral-900 dark:text-white m-0">
            Delete Product?
          </h2>

          <div className="my-3 p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 flex items-center gap-3">
            <img
              src={productToDelete.image}
              alt=""
              className="w-10 h-12 rounded-xl object-cover bg-neutral-200 dark:bg-neutral-700 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                {productToDelete.name}
              </p>
              <p className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                ₱{Number(productToDelete.price).toLocaleString()}
              </p>
            </div>
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            This will permanently remove the product from your store catalog and database. This action cannot be undone.
          </p>

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete Product</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
