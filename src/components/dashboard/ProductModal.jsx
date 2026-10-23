import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../../context/useToast'
import { deleteImagesFromStorage } from '../../lib/api'
import CustomDropdown from '../common/CustomDropdown'

const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'Free Size']

const LUXE_CATEGORIES = [
  {
    value: 'perfume-for-women',
    label: 'Perfume for Women',
    icon: (
      <svg className="w-3.5 h-3.5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    )
  },
  {
    value: 'perfume-for-men',
    label: 'Perfume for Men',
    icon: (
      <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    )
  },
  {
    value: 'perfume-sets',
    label: 'Perfume Sets',
    icon: (
      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  {
    value: 'eyewear-for-women',
    label: 'Eyewear for Women',
    icon: (
      <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12a4.5 4.5 0 009 0 4.5 4.5 0 009 0M2.5 12h19" />
      </svg>
    )
  },
  {
    value: 'eyewear-for-men',
    label: 'Eyewear for Men',
    icon: (
      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12a4.5 4.5 0 009 0 4.5 4.5 0 009 0M2.5 12h19" />
      </svg>
    )
  }
]

export default function ProductModal({
  isOpen,
  onClose,
  editingProduct,
  formData,
  setFormData,
  selectedStore,
  storeCollections,
  storeCategories = [],
  featuredCount,
  onSave
}) {
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [useUrlInput, setUseUrlInput] = useState(false)
  const [customUrl, setCustomUrl] = useState('')

  if (!isOpen) return null

  // Multi-file Upload (to S3 with local preview fallback)
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setIsUploading(true)
    const uploadedUrls = []

    for (const file of files) {
      try {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        let finalUrl = base64Data
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              fileData: base64Data,
              contentType: file.type || 'image/jpeg'
            })
          })
          if (res.ok) {
            const data = await res.json()
            if (data.url) finalUrl = data.url
          }
        } catch {
          // base64 fallback
        }

        uploadedUrls.push(finalUrl)
      } catch (err) {
        console.error('Error reading file:', err)
        showToast(`Failed to read file ${file.name}`, 'warning')
      }
    }

    if (uploadedUrls.length > 0) {
      setFormData(prev => {
        const nextImages = [...(prev.images || []), ...uploadedUrls]
        return {
          ...prev,
          image: prev.image || nextImages[0] || '',
          images: nextImages
        }
      })
      showToast(`Uploaded ${uploadedUrls.length} image(s)`, 'success')
    }

    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAddCustomUrl = () => {
    if (!customUrl.trim()) return
    setFormData(prev => {
      const nextImages = [...(prev.images || []), customUrl.trim()]
      return {
        ...prev,
        image: prev.image || nextImages[0] || '',
        images: nextImages
      }
    })
    setCustomUrl('')
    setUseUrlInput(false)
    showToast('Image URL added', 'success')
  }

  const handleRemoveImage = (indexToRemove) => {
    const removedUrl = formData.images[indexToRemove]
    setFormData(prev => {
      const nextImages = prev.images.filter((_, idx) => idx !== indexToRemove)
      const nextMainImage = prev.image === prev.images[indexToRemove]
        ? (nextImages[0] || '')
        : prev.image
      return {
        ...prev,
        image: nextMainImage,
        images: nextImages
      }
    })
    // Delete from S3 storage in the background (only for bucket-hosted images)
    if (removedUrl) {
      deleteImagesFromStorage([removedUrl]).catch(err =>
        console.warn('Image cleanup warning:', err)
      )
    }
  }

  const handleSetMainImage = (imgUrl) => {
    setFormData(prev => ({ ...prev, image: imgUrl }))
  }

  const toggleSize = (size) => {
    setFormData(prev => {
      const exists = prev.sizes.includes(size)
      const nextSizes = exists ? prev.sizes.filter(s => s !== size) : [...prev.sizes, size]
      return { ...prev, sizes: nextSizes.length ? nextSizes : [size] }
    })
  }

  const toggleCollection = (colId) => {
    setFormData(prev => {
      const exists = prev.collection_ids.includes(colId)
      return {
        ...prev,
        collection_ids: exists
          ? prev.collection_ids.filter(id => id !== colId)
          : [...prev.collection_ids, colId]
      }
    })
  }

  const isLuxe = selectedStore === 'luxe-haven'
  const isPerfumeCat = !formData.category || formData.category.includes('perfume') || (!formData.category.includes('eyewear') && !formData.category.includes('glasses'))

  const categoryOptions = useMemo(() => {
    if (storeCategories && storeCategories.length > 0) {
      return storeCategories.map(cat => ({
        value: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label: cat.name
      }))
    }
    return LUXE_CATEGORIES
  }, [storeCategories])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[calc(100dvh-1.25rem)] sm:max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white m-0">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {isLuxe ? 'Luxe Haven | Authentic Fragrances & Eyewear' : 'Selyn Dress Studio'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={onSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-4 sm:py-5 space-y-4 sm:space-y-6">
              
              {/* Product Name & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isLuxe ? 'e.g. SAUVAGE ELIXIR' : 'e.g. Velvet Rose Evening Gown'}
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 outline-none"
                  />
                </div>

                {isLuxe ? (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Brand *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DIOR, CHANEL, TOM FORD"
                      value={formData.brand || ''}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Price (₱) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="e.g. 3500"
                      value={formData.price || ''}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Price & Original Price for Luxe Haven */}
              {isLuxe && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Price (₱) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="e.g. 5600"
                      value={formData.price || ''}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Original / SRP Price (₱) <span className="font-normal text-neutral-400">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 9800"
                      value={formData.originalPrice || ''}
                      onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Luxe Haven: Category Selector */}
              {isLuxe && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Category *
                  </label>
                  <CustomDropdown
                    value={formData.category || (categoryOptions[0]?.value || 'perfume-for-women')}
                    onChange={(val) => setFormData({ ...formData, category: val })}
                    fullWidth
                    options={categoryOptions}
                  />
                </div>
              )}

              {/* Photos Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Product Photos ({formData.images?.length || 0}) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseUrlInput(!useUrlInput)}
                    className="text-[11px] font-semibold text-neutral-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {useUrlInput ? '← Upload Files' : '+ Add from URL'}
                  </button>
                </div>

                {useUrlInput ? (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg or /images/products/item.jpg"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomUrl}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-black dark:bg-white text-white dark:text-black cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/*"
                      onChange={handleFilesSelected}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl hover:border-neutral-400 dark:hover:border-neutral-500 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                      </svg>
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {isUploading ? 'Uploading to Storage...' : 'Click to select photos'}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        PNG, JPG, WEBP up to 10MB each
                      </span>
                    </button>
                  </div>
                )}

                {/* Thumbnails */}
                {formData.images?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] text-neutral-400 mb-2">
                      Click <span className="font-semibold text-neutral-700 dark:text-neutral-300">★ Set Cover</span> to choose primary photo:
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {formData.images.map((imgUrl, idx) => {
                        const isMain = formData.image === imgUrl || (!formData.image && idx === 0)
                        return (
                          <div
                            key={idx}
                            className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                              isMain
                                ? 'border-black dark:border-white ring-2 ring-black/20 dark:ring-white/20'
                                : 'border-transparent'
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-600"
                            >
                              ✕
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetMainImage(imgUrl)}
                              className={`absolute bottom-0 inset-x-0 py-0.5 text-[9px] font-bold text-center cursor-pointer transition-opacity ${
                                isMain
                                  ? 'bg-black dark:bg-white text-white dark:text-black opacity-100'
                                  : 'bg-black/60 text-white opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {isMain ? '★ Cover' : 'Set Cover'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Selyn Dress: Sizes & Collections */}
              {!isLuxe && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Available Sizes
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_SIZES.map(size => {
                        const isSelected = formData.sizes?.includes(size)
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize(size)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                            }`}
                          >
                            {size}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Assign to Collections
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {storeCollections.map(c => {
                        const isChecked = formData.collection_ids?.includes(c.id)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCollection(c.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                            }`}
                          >
                            <span>{isChecked ? '✓' : '+'}</span>
                            <span>{c.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Luxe Haven Specifications */}
              {isLuxe && (
                <div className="space-y-4 pt-1">
                  {isPerfumeCat ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                            Volume / Bottle Size
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 100ml / 3.4 FL. OZ."
                            value={formData.volume || ''}
                            onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                            Concentration
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Eau de Parfum, Extrait de Parfum, Elixir"
                            value={formData.concentration || ''}
                            onChange={(e) => setFormData({ ...formData, concentration: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                          Fragrance Notes <span className="font-normal text-neutral-400">(Single text line)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Cardamom, Lavender, Licorice, Sandalwood, Amber"
                          value={formData.notes || ''}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                            Frame Size / Dimensions
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. One Size (52-18-140)"
                            value={formData.frame_size || ''}
                            onChange={(e) => setFormData({ ...formData, frame_size: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                            Origin / Craftsmanship
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Handmade in Italy, Made in France"
                            value={formData.origin || ''}
                            onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                          Eyewear Specs & Inclusions
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 100% UV400 Protection, Italian Acetate, Leather Case Included"
                          value={formData.specs || ''}
                          onChange={(e) => setFormData({ ...formData, specs: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Bestseller / Featured Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.featured)}
                    onChange={(e) => {
                      const isChecked = e.target.checked
                      // Limit only for Selyn Dress
                      if (!isLuxe) {
                        const wasFeatured = editingProduct ? Boolean(editingProduct.featured) : false
                        if (isChecked && !wasFeatured && featuredCount >= 10) {
                          showToast('Maximum of 10 featured products allowed for this store.', 'error')
                          return
                        }
                      }
                      setFormData({ ...formData, featured: isChecked })
                    }}
                    className="w-4 h-4 rounded text-black focus:ring-black accent-black cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {isLuxe
                      ? 'Mark as Bestseller (Display on Homepage Bestsellers section)'
                      : `Mark as Featured on Homepage (${featuredCount}/10 slots used)`}
                  </span>
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder={isLuxe ? 'Fragrance character, scent story, craftsmanship details...' : 'Product details, fabric, sizing advice...'}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 outline-none resize-none"
                />
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 px-4 sm:px-8 py-3 sm:py-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 sm:px-5 py-2 text-xs font-semibold rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs cursor-pointer"
              >
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
