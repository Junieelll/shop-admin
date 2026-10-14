import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function CollectionCard({
  col,
  index,
  productCount,
  onEdit,
  onDelete
}) {
  const navigate = useNavigate()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="group relative bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
    >
      <div>
        {/* Top Header of Card */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-neutral-200/50 dark:border-neutral-700/50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white truncate m-0">
                {col.name}
              </h2>
              <p className="text-[11px] font-mono text-neutral-400 truncate mt-0.5">
                #{col.slug || col.id}
              </p>
            </div>
          </div>

          {/* Product Count Pill */}
          <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
            {productCount} {productCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-4">
          {col.description || 'No description provided for this collection.'}
        </p>
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(`/collections/${col.id}`)}
          className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>View Products</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(col)}
            className="p-2 rounded-xl text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Edit collection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onDelete(col)}
            className="p-2 rounded-xl text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            title="Delete collection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
