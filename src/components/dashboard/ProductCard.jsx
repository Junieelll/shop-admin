import { motion } from 'framer-motion'

export default function ProductCard({
  product,
  index,
  selectedStore,
  onToggleFeatured,
  onEdit,
  onDelete
}) {
  const sizes = product.attributes?.sizes || []
  const galleryCount = (product.images || []).length

  return (
    <motion.div
      layout
      data-tour-card={index === 0 ? 'first-card' : undefined}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200/70 dark:border-neutral-800 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
    >
      {/* Image Container with Badges */}
      <div className="relative aspect-4/5 w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Featured Star Toggle Button */}
        <button
          type="button"
          data-tour={index === 0 ? 'featured-star-btn' : undefined}
          onClick={() => onToggleFeatured(product.id)}
          className={`absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-transform active:scale-90 cursor-pointer ${
            product.featured
              ? 'bg-amber-400 text-white shadow-sm'
              : 'bg-black/30 hover:bg-black/50 text-white/80'
          }`}
          title={product.featured ? 'Featured on homepage' : 'Mark as featured'}
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>

        {/* Badges Top Left */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 items-start max-w-[75%]">
          {product.featured && (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-amber-500 text-white shadow-xs">
              Featured
            </span>
          )}
          {(product.collections || []).slice(0, 2).map(c => (
            <span key={c.id || c.name} className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-black/60 text-white backdrop-blur-md truncate max-w-full">
              {c.name}
            </span>
          ))}
          {product.category_name && (
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-semibold bg-black/60 text-white backdrop-blur-md">
              {product.category_name}
            </span>
          )}
        </div>

        {/* Multi-image indicator badge */}
        {galleryCount > 1 && (
          <span className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold bg-black/60 text-white backdrop-blur-xs flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {galleryCount}
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1.5 mb-1">
            <h2 className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-white line-clamp-1 m-0">
              {product.name}
            </h2>
            <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white shrink-0">
              ₱{Number(product.price).toLocaleString()}
            </span>
          </div>

          <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 sm:line-clamp-2 leading-relaxed mb-2 sm:mb-3">
            {product.description || 'No description available'}
          </p>
        </div>

        <div>
          {/* Attributes */}
          <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
            {selectedStore === 'selyn' ? (
              sizes.map(size => (
                <span
                  key={size}
                  className="px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                >
                  {size}
                </span>
              ))
            ) : (
              Object.entries(product.attributes || {}).map(([key, value]) => (
                <span
                  key={key}
                  className="px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                >
                  {value}
                </span>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              data-tour={index === 0 ? 'edit-product-btn' : undefined}
              onClick={() => onEdit(product)}
              className="flex-1 py-1 sm:py-1.5 px-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-[11px] sm:text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5"
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit</span>
            </button>

            <button
              type="button"
              data-tour={index === 0 ? 'delete-product-btn' : undefined}
              onClick={() => onDelete(product)}
              className="p-1 sm:p-1.5 rounded-xl text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer shrink-0"
              title="Delete Product"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
