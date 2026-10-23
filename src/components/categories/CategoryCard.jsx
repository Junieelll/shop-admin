import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function CategoryCard({
  category,
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
      className="group relative block aspect-[3/4.2] rounded-3xl overflow-hidden bg-neutral-900 shadow-sm hover:shadow-xl transition-all duration-300 border border-neutral-200/40 dark:border-neutral-800"
    >
      {/* Background Cover Image */}
      {category.image ? (
        <img
          src={category.image}
          alt={category.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-neutral-400 bg-linear-to-br from-neutral-800 to-neutral-950">
          <svg className="w-10 h-10 opacity-30 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-medium text-neutral-500 tracking-wider uppercase">No Cover</span>
        </div>
      )}

      {/* Dark gradient overlay for typography contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/20 group-hover:from-black/95 group-hover:via-black/55 transition-colors" />

      {/* Top Bar: Action Buttons & Product Count Badge */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-xs">
          {productCount} {productCount === 1 ? 'item' : 'items'}
        </span>

        {/* Quick Edit & Delete Actions */}
        <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(category)
            }}
            className="w-8 h-8 rounded-xl bg-black/60 hover:bg-white text-white hover:text-black backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/15"
            title="Edit category"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(category)
            }}
            className="w-8 h-8 rounded-xl bg-black/60 hover:bg-red-600 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/15"
            title="Delete category"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Content Area */}
      <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col justify-end z-10">
        <h3 className="font-serif text-xl sm:text-2xl font-normal text-white group-hover:text-[#e5cd97] transition-colors leading-tight mb-1">
          {category.name}
        </h3>

        <p className="text-[11px] font-mono text-neutral-400 mb-3 truncate">
          #{category.slug || category.id}
        </p>

        {/* View Products Button (opens /categories/:id) */}
        <button
          type="button"
          onClick={() => navigate(`/categories/${category.id}`)}
          className="w-full py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white text-white hover:text-black backdrop-blur-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/20 shadow-xs"
        >
          <span>View Products</span>
          <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Subtle outer border */}
      <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none group-hover:border-white/25 transition-colors" />
    </motion.div>
  )
}
