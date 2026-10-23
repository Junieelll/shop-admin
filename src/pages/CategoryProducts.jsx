import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/useToast'
import Sidebar from '../components/Sidebar'
import ProductCard from '../components/dashboard/ProductCard'
import ProductTable from '../components/dashboard/ProductTable'
import ProductModal from '../components/dashboard/ProductModal'
import DeleteProductModal from '../components/dashboard/DeleteProductModal'
import Pagination from '../components/common/Pagination'
import {
  fetchCategoryByIdFromDb,
  fetchCategoryProductsFromDb,
  fetchLinkableCategoryProductsFromDb,
  fetchCategoriesFromDb,
  assignProductToCategoryInDb,
  removeProductFromCategoryInDb,
  createProductInDb,
  updateProductInDb,
  toggleFeaturedInDb,
  deleteProductFromDb
} from '../lib/api'

const emptyForm = (catSlug = 'perfume-for-women') => ({
  name: '',
  brand: '',
  price: '',
  originalPrice: '',
  image: '',
  images: [],
  featured: false,
  description: '',
  sizes: ['M'],
  collection_ids: [],
  category: catSlug,
  volume: '100ml / 3.4 FL. OZ.',
  concentration: 'Eau de Parfum',
  notes: '',
  frame_size: 'One Size (52-18-140)',
  origin: 'Handmade in Italy',
  specs: '100% UV400 Protection, Italian Acetate'
})

export default function CategoryProducts() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  // Theme
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('admin_theme') === 'dark' ||
      (!('admin_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    localStorage.setItem('admin_theme', isDark ? 'dark' : 'light')
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  // Store: categories are Luxe Haven
  const [selectedStore, setSelectedStore] = useState(() => {
    return localStorage.getItem('admin_selected_store') || 'luxe-haven'
  })

  const [isOpenMobile, setIsOpenMobile] = useState(false)

  // Data states
  const [category, setCategory] = useState(null)
  const [categoryProducts, setCategoryProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDbConnected, setIsDbConnected] = useState(false)

  // Search & View Mode
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('admin_view_mode') || 'grid'
  })

  // Modals
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productToDelete, setProductToDelete] = useState(null)
  const [formData, setFormData] = useState(() => emptyForm())

  // Link Existing Product Picker
  const [pickerSearch, setPickerSearch] = useState('')
  const [debouncedPickerSearch, setDebouncedPickerSearch] = useState('')
  const [pickerItems, setPickerItems] = useState([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerHasMore, setPickerHasMore] = useState(false)
  const pickerReq = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPickerSearch(pickerSearch), 350)
    return () => clearTimeout(t)
  }, [pickerSearch])

  const loadPicker = useCallback(async (beforeId = null) => {
    if (!category) return
    const reqId = ++pickerReq.current
    setPickerLoading(true)
    const res = await fetchLinkableCategoryProductsFromDb({
      storeId: selectedStore,
      categoryId: category.id,
      search: debouncedPickerSearch,
      beforeId,
      limit: 20
    })
    if (reqId !== pickerReq.current) return
    if (res.success) {
      setPickerItems(prev => (beforeId == null ? res.data : [...prev, ...res.data]))
      setPickerHasMore(res.hasMore)
    } else {
      showToast(res.error || 'Failed to load linkable products', 'error')
    }
    setPickerLoading(false)
  }, [selectedStore, category, debouncedPickerSearch, showToast])

  useEffect(() => {
    if (!isAddPickerOpen) return
    loadPicker(null)
  }, [isAddPickerOpen, loadPicker])

  const closePicker = () => {
    pickerReq.current++
    setIsAddPickerOpen(false)
    setPickerSearch('')
    setDebouncedPickerSearch('')
    setPickerItems([])
    setPickerHasMore(false)
    setPickerLoading(false)
  }

  // Initial load
  const loadData = useCallback(async () => {
    try {
      const [catDetailRes, prodRes, allCatsRes] = await Promise.all([
        fetchCategoryByIdFromDb(id, selectedStore),
        fetchCategoryProductsFromDb(id, selectedStore),
        fetchCategoriesFromDb(selectedStore)
      ])

      if (catDetailRes.success && catDetailRes.data) {
        setCategory(catDetailRes.data)
        setIsDbConnected(true)
      } else {
        showToast(catDetailRes.error || 'Category not found', 'error')
      }

      if (prodRes.success) {
        setCategoryProducts(prodRes.data || [])
      }

      if (allCatsRes.success) {
        setCategories(allCatsRes.data || [])
      }
    } catch (err) {
      console.error('Error loading category products:', err)
      showToast('Database error loading category', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [id, selectedStore, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return categoryProducts
    const q = searchQuery.toLowerCase().trim()
    return categoryProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    )
  }, [categoryProducts, searchQuery])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredProducts.slice(start, start + itemsPerPage)
  }, [filteredProducts, currentPage, itemsPerPage])

  // Product actions
  const handleToggleFeatured = async (productId) => {
    const current = categoryProducts.find(p => p.id === productId)
    const nextFeatured = !current?.featured

    setCategoryProducts(prev => prev.map(p => p.id === productId ? { ...p, featured: nextFeatured } : p))

    const res = await toggleFeaturedInDb(productId, nextFeatured, selectedStore)
    if (res.success) {
      showToast(nextFeatured ? 'Added to featured items' : 'Removed from featured items', 'success')
    } else {
      setCategoryProducts(prev => prev.map(p => p.id === productId ? { ...p, featured: !nextFeatured } : p))
      showToast(res.error || 'Failed to update featured status', 'error')
    }
  }

  const handleRemoveFromCategory = async (productId, productName) => {
    setCategoryProducts(prev => prev.filter(p => p.id !== productId))
    setCategory(prev => prev ? { ...prev, product_count: Math.max(0, (prev.product_count || 1) - 1) } : prev)

    const res = await removeProductFromCategoryInDb(productId, selectedStore)
    if (res.success) {
      showToast(`"${productName}" removed from category.`, 'success')
    } else {
      showToast(res.error || 'Failed to remove product from category', 'error')
      loadData()
    }
  }

  const handleLinkProduct = async (product) => {
    if (!category) return
    setPickerItems(prev => prev.filter(p => p.id !== product.id))

    const res = await assignProductToCategoryInDb(product.id, category.id, selectedStore)
    if (res.success) {
      showToast(`Linked "${product.name}" to this category!`, 'success')
      loadData()
    } else {
      showToast(res.error || 'Failed to link product', 'error')
    }
  }

  const handleOpenAddProduct = () => {
    setEditingProduct(null)
    setFormData(emptyForm(category?.slug || 'perfume-for-women'))
    setIsProductModalOpen(true)
  }

  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name || '',
      brand: product.brand || product.attributes?.brand || '',
      price: product.price || '',
      originalPrice: product.originalPrice || product.attributes?.originalPrice || '',
      image: product.image || '',
      images: product.images || (product.image ? [product.image] : []),
      featured: Boolean(product.featured),
      description: product.description || '',
      sizes: product.attributes?.sizes || ['M'],
      collection_ids: [],
      category: product.category_slug || category?.slug || 'perfume-for-women',
      volume: product.attributes?.volume || '100ml / 3.4 FL. OZ.',
      concentration: product.attributes?.concentration || 'Eau de Parfum',
      notes: product.attributes?.notes || '',
      frame_size: product.attributes?.frame_size || 'One Size (52-18-140)',
      origin: product.attributes?.origin || 'Handmade in Italy',
      specs: product.attributes?.specs || '100% UV400 Protection, Italian Acetate'
    })
    setIsProductModalOpen(true)
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.price) {
      showToast('Please enter a product name and price', 'error')
      return
    }

    const mainImage = formData.image || formData.images[0] || ''
    const attributes = {
      brand: formData.brand || '',
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : null,
      volume: formData.volume || '',
      concentration: formData.concentration || '',
      notes: formData.notes || '',
      frame_size: formData.frame_size || '',
      origin: formData.origin || '',
      specs: formData.specs || '',
      rating: 5.0,
      reviewsCount: 100
    }

    const payload = {
      name: formData.name.trim(),
      price: Number(formData.price),
      image: mainImage,
      images: formData.images.length ? formData.images : [mainImage],
      featured: Boolean(formData.featured),
      description: formData.description || '',
      category_id: category?.id,
      attributes,
      collection_ids: []
    }

    try {
      if (editingProduct) {
        const res = await updateProductInDb({ ...payload, id: editingProduct.id }, selectedStore)
        if (res.success) {
          showToast(`Product "${formData.name}" updated!`, 'success')
          setIsProductModalOpen(false)
          loadData()
        } else {
          showToast(res.error || 'Failed to update product', 'error')
        }
      } else {
        const res = await createProductInDb(payload, selectedStore)
        if (res.success) {
          showToast(`Product "${formData.name}" added to category!`, 'success')
          setIsProductModalOpen(false)
          loadData()
        } else {
          showToast(res.error || 'Failed to create product', 'error')
        }
      }
    } catch (err) {
      console.error('Error saving product:', err)
      showToast('Error saving product', 'error')
    }
  }

  const handleDeleteProduct = (product) => {
    setProductToDelete(product)
  }

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return
    const res = await deleteProductFromDb(productToDelete.id, selectedStore, productToDelete.images || [productToDelete.image])
    if (res.success) {
      showToast(`Product "${productToDelete.name}" deleted`, 'success')
      setProductToDelete(null)
      loadData()
    } else {
      showToast(res.error || 'Failed to delete product', 'error')
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? 'dark' : ''} bg-[#fafafa] dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 font-['Poppins'] transition-colors duration-200`}>
      {/* Sidebar */}
      <Sidebar
        isDark={isDark}
        setIsDark={setIsDark}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
        selectedStore={selectedStore}
        onSelectStore={(store) => {
          setSelectedStore(store)
          navigate(store === 'selyn' ? '/collections' : '/categories')
        }}
        isDbConnected={isDbConnected}
        productsCount={categoryProducts.length}
        categoriesCount={categories.length}
      />

      {/* Main Content */}
      <main className="lg:pl-64 flex flex-col min-h-screen">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Breadcrumb & Top Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                to="/categories"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all no-underline group cursor-pointer"
              >
                <svg className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Categories</span>
              </Link>

              <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-neutral-500">
                <Link to="/categories" className="hover:text-black dark:hover:text-white transition-colors no-underline">
                  Categories
                </Link>
                <span>/</span>
                <span className="text-neutral-900 dark:text-white font-semibold truncate max-w-xs">
                  {category ? category.name : `Category #${id}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddPickerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Link Existing Product</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddProduct}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {/* Category Hero Banner */}
          <div className="relative rounded-3xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            {category?.image ? (
              <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-neutral-900">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
              </div>
            ) : null}

            <div className={`p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6 ${
              category?.image ? 'relative -mt-20 sm:-mt-24 z-10 text-white' : ''
            }`}>
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className={`font-serif text-2xl sm:text-4xl font-normal tracking-tight m-0 ${
                    category?.image ? 'text-white' : 'text-neutral-900 dark:text-white'
                  }`}>
                    {category ? category.name : 'Loading Category...'}
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                    category?.image
                      ? 'bg-white/20 text-white backdrop-blur-md'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60'
                  }`}>
                    #{category?.slug || id}
                  </span>
                </div>

                <p className={`text-xs sm:text-sm leading-relaxed ${
                  category?.image ? 'text-white/80' : 'text-neutral-500 dark:text-neutral-400'
                }`}>
                  Products currently assigned to this category on the Luxe Haven storefront.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  category?.image
                    ? 'bg-white/20 text-white backdrop-blur-md border border-white/20'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700'
                }`}>
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
                </span>
              </div>
            </div>
          </div>

          {/* Search & View Mode Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
            <div className="relative flex-1 sm:max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products in this category..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 outline-none"
              />
              <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
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
            <div className="flex items-center gap-1 self-end sm:self-auto bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-neutral-700 text-black dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white'
                }`}
                title="Grid view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-neutral-700 text-black dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white'
                }`}
                title="Table view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Products List / Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl bg-neutral-200/50 dark:bg-neutral-800/50 animate-pulse border border-neutral-200/60 dark:border-neutral-800"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-8">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white m-0">
                {searchQuery ? 'No matching products' : 'No products in this category yet'}
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mt-1 mb-4">
                {searchQuery
                  ? `No products in this category match "${searchQuery}".`
                  : 'Add a new product or link existing inventory to this category.'}
              </p>
              {!searchQuery && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddPickerOpen(true)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                  >
                    Link Existing
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddProduct}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all cursor-pointer shadow-xs"
                  >
                    Add Product
                  </button>
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  selectedStore={selectedStore}
                  featuredCount={0}
                  onToggleFeatured={handleToggleFeatured}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                  onRemoveFromCollection={() => handleRemoveFromCategory(p.id, p.name)}
                />
              ))}
            </div>
          ) : (
            <ProductTable
              products={paginatedProducts}
              selectedStore={selectedStore}
              featuredCount={0}
              onToggleFeatured={handleToggleFeatured}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onRemoveFromCollection={() => handleRemoveFromCategory(p.id, p.name)}
            />
          )}

          {/* Pagination */}
          {filteredProducts.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(count) => {
                setItemsPerPage(count)
                setCurrentPage(1)
              }}
            />
          )}
        </div>
      </main>

      {/* ── LINK EXISTING PRODUCT MODAL PICKER ── */}
      <AnimatePresence>
        {isAddPickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white m-0">
                    Link Existing Products
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Select products from your inventory to assign to "{category?.name}".
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePicker}
                  className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search products by title..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {pickerLoading && pickerItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400">Loading products...</div>
                ) : pickerItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400">
                    No available unassigned products found.
                  </div>
                ) : (
                  pickerItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 flex items-center justify-between gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            ₱{Number(item.price).toLocaleString()} • {item.category_name}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLinkProduct(item)}
                        className="px-3 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                      >
                        + Assign
                      </button>
                    </div>
                  ))
                )}

                {pickerHasMore && (
                  <button
                    type="button"
                    onClick={() => loadPicker(pickerItems[pickerItems.length - 1]?.id)}
                    disabled={pickerLoading}
                    className="w-full py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {pickerLoading ? 'Loading more...' : 'Load more'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADD / EDIT PRODUCT MODAL ── */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        editingProduct={editingProduct}
        formData={formData}
        setFormData={setFormData}
        selectedStore={selectedStore}
        storeCollections={[]}
        storeCategories={categories}
        featuredCount={0}
        onSave={handleSaveProduct}
      />

      {/* ── DELETE PRODUCT CONFIRMATION MODAL ── */}
      <DeleteProductModal
        product={productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={confirmDeleteProduct}
      />
    </div>
  )
}
