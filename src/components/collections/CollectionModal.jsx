import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function CollectionModal({
  isOpen,
  onClose,
  editingCollection,
  formData,
  setFormData,
  onSubmit,
  isSubmitting
}) {
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isReadingImage, setIsReadingImage] = useState(false)

  if (!isOpen) return null

  const handleNameChange = (val) => {
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    setFormData(prev => ({
      ...prev,
      name: val,
      slug: !editingCollection || prev.slug === editingCollection.slug ? slug : prev.slug
    }))
  }

  const handleFileProcess = async (file) => {
    if (!file || !file.type.startsWith('image/')) return

    setIsReadingImage(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Attempt upload to /api/upload
      let finalUrl = base64
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            fileData: base64,
            contentType: file.type || 'image/jpeg'
          })
        })
        if (res.ok) {
          const data = await res.json()
          if (data.url) finalUrl = data.url
        }
      } catch {
        // Fallback to base64
      }

      setFormData(prev => ({ ...prev, banner_image: finalUrl }))
    } catch (err) {
      console.error('Error reading collection banner image:', err)
    } finally {
      setIsReadingImage(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileProcess(file)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFileProcess(file)
  }

  const handleRemoveBanner = () => {
    setFormData(prev => ({ ...prev, banner_image: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]"
        >
          {/* Header — sticky, never scrolls */}
          <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white m-0">
                {editingCollection ? 'Edit Collection' : 'Create New Collection'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden"><div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Collection Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Debutante Elegance, Midnight Velvet"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                URL Slug
              </label>
              <input
                type="text"
                placeholder="e.g. debutante-elegance"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 outline-none"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Used for SEO routes and catalog links.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief description of the collection theme, mood, or season..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 outline-none resize-none"
              />
            </div>

            {/* Banner Image Drag & Drop File Upload */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Collection Banner Image (Drag & Drop or Click to Upload)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {formData.banner_image ? (
                <div className="relative group rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 aspect-16/7 bg-neutral-100 dark:bg-neutral-800">
                  <img
                    src={formData.banner_image}
                    alt="Collection Banner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveBanner}
                      className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-7 px-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? 'border-black dark:border-white bg-neutral-100 dark:bg-neutral-800 scale-[0.99]'
                      : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-neutral-50/50 dark:bg-neutral-850/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-200/70 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {isReadingImage ? 'Processing Image...' : isDragging ? 'Drop Image Here' : 'Click or Drag & Drop Banner Image'}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      Recommended 16:9 or 1200x500 banner (PNG, JPG, WEBP)
                    </p>
                  </div>
                </div>
              )}
            </div>

            </div>{/* Footer Buttons — sticky, never scrolls */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isReadingImage}
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : editingCollection ? 'Update Collection' : 'Create Collection'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
