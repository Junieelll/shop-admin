import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/useToast'
import Sidebar from '../components/Sidebar'
import ProductCard from '../components/dashboard/ProductCard'
import ProductTable from '../components/dashboard/ProductTable'
import ProductModal from '../components/dashboard/ProductModal'
import DeleteProductModal from '../components/dashboard/DeleteProductModal'
import {
  fetchCollectionsFromDb,
  fetchProductsFromDb,
  createProductInDb,
  updateProductInDb,
  toggleFeaturedInDb,
  deleteProductFromDb,
  addProductToCollectionInDb,
  removeProductFromCollectionInDb
} from '../lib/api'

export default function CollectionProducts() {
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
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }
  }, [isDark])

  // Selected store
  const [selectedStore, setSelectedStore] = useState(() => {
    return localStorage.getItem('admin_selected_store') || 'selyn'
  })

  // Mobile sidebar
  const [isOpenMobile, setIsOpenMobile] = useState(false)

  // Data states
  const [collection, setCollection] = useState(null)
  const [allProducts, setAllProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDbConnected, setIsDbConnected] = useState(false)

  // Search & View mode
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('admin_view_mode') || 'grid'
  })

  // Modals
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productToDelete, setProductToDelete] = useState(null)
  const [pickerSearch, setPickerSearch] = useState('')

  // Form state for creating new product inside this collection
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    image: '',
    images: [],
    featured: false,
    description: '',
    sizes: ['M'],
    collection_ids: [Number(id)],
    category: 'Perfume',
    volume: '100ml',
    scent: '',
    material: '',
    gemstone: '',
    frame_shape: 'Aviator',
    lens_color: 'Black'
  })

  // Load collection and products
  const loadData = useCallback(async () => {
    try {
      const [colRes, prodRes] = await Promise.all([
        fetchCollectionsFromDb(selectedStore),
        fetchProductsFromDb(selectedStore)
      ])

      if (colRes.success && colRes.data) {
        setCollections(colRes.data)
        const current = colRes.data.find(c => Number(c.id) === Number(id))
        setCollection(current || null)
        setIsDbConnected(true)
      }

      if (prodRes.success && prodRes.data) {
        setAllProducts(prodRes.data)
      }
    } catch (err) {
      console.error('Error loading collection products:', err)
      showToast('Database error loading collection', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [id, selectedStore, showToast])

  useEffect(() => {
    let ignore = false

    const run = async () => {
      if (!ignore) {
        await loadData()
      }
    }

    run()

    return () => {
      ignore = true
    }
  }, [loadData])

  // Products belonging to this collection
  const collectionProducts = useMemo(() => {
    return allProducts.filter(p => (p.collection_ids || []).includes(Number(id)))
  }, [allProducts, id])

  // Filtered by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return collectionProducts
    const q = searchQuery.toLowerCase()
    return collectionProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    )
  }, [collectionProducts, searchQuery])

  // Available products in store that are NOT yet in this collection
  const unassignedProducts = useMemo(() => {
    const assignedIds = new Set(collectionProducts.map(p => p.id))
    let unassigned = allProducts.filter(p => p.store_id === selectedStore && !assignedIds.has(p.id))
    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase()
      unassigned = unassigned.filter(p => p.name.toLowerCase().includes(q))
    }
    return unassigned
  }, [allProducts, collectionProducts, selectedStore, pickerSearch])

  const featuredCount = allProducts.filter(p => p.store_id === selectedStore && p.featured).length

  // Handlers
  const handleToggleFeatured = async (productId) => {
    const current = allProducts.find(p => p.id === productId)
    const nextFeatured = !current?.featured

    if (nextFeatured && featuredCount >= 10) {
      showToast('Maximum of 10 featured products allowed for this store.', 'error')
      return
    }

    setAllProducts(prev => prev.map(p => p.id === productId ? { ...p, featured: nextFeatured } : p))

    const res = await toggleFeaturedInDb(productId, nextFeatured, selectedStore)
    if (res.success) {
      showToast(nextFeatured ? 'Added to featured items' : 'Removed from featured items', 'success')
    } else {
      showToast(res.error || 'Failed to update featured status', 'error')
      loadData()
    }
  }

  const handleRemoveFromCollection = async (productId, productName) => {
    // Optimistic UI update
    setAllProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          collection_ids: (p.collection_ids || []).filter(cId => Number(cId) !== Number(id))
        }
      }
      return p
    }))

    const res = await removeProductFromCollectionInDb(productId, id)
    if (res.success) {
      showToast(`Removed "${productName}" from ${collection?.name || 'collection'}.`, 'success')
      loadData()
    } else {
      showToast(res.error || 'Failed to remove product from collection', 'error')
      loadData()
    }
  }

  const handleAddProductToCollection = async (product) => {
    // Optimistic UI update
    setAllProducts(prev => prev.map(p => {
      if (p.id === product.id) {
        return {
          ...p,
          collection_ids: [...(p.collection_ids || []), Number(id)]
        }
      }
      return p
    }))

    const res = await addProductToCollectionInDb(product.id, id)
    if (res.success) {
      showToast(`Added "${product.name}" to ${collection?.name || 'collection'}.`, 'success')
      loadData()
    } else {
      showToast(res.error || 'Failed to add product to collection', 'error')
      loadData()
    }
  }

  const handleOpenAddModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      price: '',
      image: '',
      images: [],
      featured: false,
      description: '',
      sizes: ['M'],
      collection_ids: [Number(id)],
      category: 'Perfume',
      volume: '100ml',
      scent: '',
      material: '',
      gemstone: '',
      frame_shape: 'Aviator',
      lens_color: 'Black'
    })
    setIsProductModalOpen(true)
  }

  const handleOpenEditModal = (product) => {
    setEditingProduct(product)
    const gallery = product.images?.length ? product.images : (product.image ? [product.image] : [])
    setFormData({
      name: product.name,
      price: product.price,
      image: product.image || gallery[0] || '',
      images: gallery,
      featured: product.featured,
      description: product.description || '',
      sizes: product.attributes?.sizes || ['M'],
      collection_ids: product.collection_ids || [],
      category: product.category_name || 'Perfume',
      volume: product.attributes?.volume || '100ml',
      scent: product.attributes?.scent || '',
      material: product.attributes?.material || '',
      gemstone: product.attributes?.gemstone || '',
      frame_shape: product.attributes?.frame_shape || 'Aviator',
      lens_color: product.attributes?.lens_color || 'Black'
    })
    setIsProductModalOpen(true)
  }

  const handleSaveProduct = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.price) {
      showToast('Please fill in product name and price.', 'error')
      return
    }

    const mainImage = formData.image || formData.images[0]
    if (!mainImage) {
      showToast('Please upload at least one product image.', 'error')
      return
    }

    const willBeFeatured = Boolean(formData.featured)
    const wasFeatured = editingProduct ? Boolean(editingProduct.featured) : false
    if (willBeFeatured && !wasFeatured && featuredCount >= 10) {
      showToast('Maximum of 10 featured products allowed for this store.', 'error')
      return
    }

    let attributes = {}
    if (selectedStore === 'selyn') {
      attributes = { sizes: formData.sizes }
    } else {
      if (formData.category === 'Perfume') {
        attributes = { volume: formData.volume, scent: formData.scent }
      } else if (formData.category === 'Jewelry') {
        attributes = { material: formData.material, gemstone: formData.gemstone }
      } else if (formData.category === 'Eyeglasses') {
        attributes = { frame_shape: formData.frame_shape, lens_color: formData.lens_color }
      }
    }

    // Ensure current collection is included
    const targetColIds = Array.from(new Set([...(formData.collection_ids || []), Number(id)]))

    const productPayload = {
      store_id: selectedStore,
      name: formData.name,
      price: Number(formData.price),
      image: mainImage,
      images: formData.images.length ? formData.images : [mainImage],
      featured: formData.featured,
      description: formData.description,
      category_id: null,
      attributes,
      collection_ids: targetColIds
    }

    if (editingProduct) {
      updateProductInDb({ ...productPayload, id: editingProduct.id }, selectedStore).then((res) => {
        if (res.success) {
          showToast(`Product "${productPayload.name}" updated successfully.`, 'success')
        } else {
          showToast(res.error || 'Failed to update product', 'error')
        }
        loadData()
      })
    } else {
      createProductInDb(productPayload, selectedStore).then((res) => {
        if (res.success) {
          showToast(`Product "${productPayload.name}" created and added to collection!`, 'success')
        } else {
          showToast(res.error || 'Failed to create product', 'error')
        }
        loadData()
      })
    }

    setIsProductModalOpen(false)
  }

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return
    const idToDelete = productToDelete.id
    const name = productToDelete.name

    setAllProducts(prev => prev.filter(p => p.id !== idToDelete))
    setProductToDelete(null)

    const res = await deleteProductFromDb(idToDelete, selectedStore)
    if (res.success) {
      showToast(`Product "${name}" deleted.`, 'success')
      loadData()
    } else {
      showToast(res.error || 'Failed to delete product', 'error')
      loadData()
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? 'dark' : ''} bg-[#fafafa] dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 font-['Poppins'] transition-colors duration-200`}>
      {/* ── SIDEBAR ── */}
      <Sidebar
        selectedStore={selectedStore}
        onSelectStore={(st) => { setSelectedStore(st); navigate('/collections') }}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        isDbConnected={isDbConnected}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        productsCount={allProducts.filter(p => p.store_id === selectedStore).length}
        collectionsCount={collections.filter(c => c.store_id === selectedStore).length}
      />

      {/* ── MAIN CONTENT (OFFSET FOR SIDEBAR ON DESKTOP) ── */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/80 dark:bg-[#121215]/80 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpenMobile(true)}
              className="p-1.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-bold text-base tracking-tight">ShopAdmin</span>
          </div>
          <Link
            to="/collections"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 no-underline transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Collections</span>
          </Link>
        </header>

        {/* Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6 w-full flex-1">
          
          {/* Top Bar: Back Button & Breadcrumbs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                to="/collections"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all no-underline group cursor-pointer"
              >
                <svg className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Collections</span>
              </Link>

              <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

              {/* Breadcrumb Navigation */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-neutral-500">
                <Link to="/collections" className="hover:text-black dark:hover:text-white transition-colors no-underline">
                  Collections
                </Link>
                <span>/</span>
                <span className="text-neutral-900 dark:text-white font-semibold truncate max-w-[200px] sm:max-w-xs">
                  {collection ? collection.name : `Collection #${id}`}
                </span>
              </div>
            </div>
          </div>

          {/* Collection Hero Header */}
          <div className="relative rounded-3xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            {collection?.banner_image && (
              <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <img
                  src={collection.banner_image}
                  alt={collection.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>
            )}

            <div className={`p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6 ${
              collection?.banner_image ? 'relative -mt-16 sm:-mt-20 z-10 text-white' : ''
            }`}>
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight m-0 ${
                    collection?.banner_image ? 'text-white' : 'text-neutral-900 dark:text-white'
                  }`}>
                    {collection ? collection.name : 'Loading Collection...'}
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                    collection?.banner_image
                      ? 'bg-white/20 text-white backdrop-blur-md'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60'
                  }`}>
                    #{collection?.slug || id}
                  </span>
                </div>

                <p className={`text-xs sm:text-sm leading-relaxed ${
                  collection?.banner_image ? 'text-white/80' : 'text-neutral-500 dark:text-neutral-400'
                }`}>
                  {collection?.description || 'No collection description provided.'}
                </p>

                <div className="flex items-center gap-4 pt-1">
                  <span className={`text-xs font-bold ${
                    collection?.banner_image ? 'text-white' : 'text-neutral-900 dark:text-white'
                  }`}>
                    {collectionProducts.length} {collectionProducts.length === 1 ? 'Product Assigned' : 'Products Assigned'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsAddPickerOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Link Existing Products</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>New Product Here</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search & Layout Toolbar within this Collection */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
            <div className="relative flex-1 sm:max-w-md">
              <input
                type="text"
                placeholder="Search products in this collection..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 outline-none"
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

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">
                Showing {filteredProducts.length} of {collectionProducts.length}
              </span>

              {/* View Switcher */}
              <div className="flex items-center p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-700/50">
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

          {/* Product Items Display */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-4/5 rounded-3xl bg-neutral-100 dark:bg-neutral-800/50 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                {searchQuery ? 'No products match your search' : 'No products in this collection yet'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-5">
                {searchQuery
                  ? 'Try searching with different terms or clear the filter.'
                  : 'Assign existing store products or create new ones to feature in this collection.'}
              </p>
              {!searchQuery && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddPickerOpen(true)}
                    className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    Link Existing Products
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold cursor-pointer shadow-sm"
                  >
                    + Add New Product
                  </button>
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product, index) => (
                  <div key={product.id} className="relative group/wrapper">
                    <ProductCard
                      product={product}
                      index={index}
                      selectedStore={selectedStore}
                      onToggleFeatured={handleToggleFeatured}
                      onEdit={handleOpenEditModal}
                      onDelete={setProductToDelete}
                    />

                    {/* Unlink from this Collection button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCollection(product.id, product.name)}
                      className="absolute top-3 left-3 z-10 px-2 py-1 rounded-full text-[10px] font-bold bg-neutral-900/80 hover:bg-red-600 text-white backdrop-blur-md opacity-0 group-hover/wrapper:opacity-100 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      title="Unlink from this collection"
                    >
                      <span>✕</span>
                      <span>Unlink</span>
                    </button>
                  </div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <ProductTable
              products={filteredProducts}
              isLoading={isLoading}
              selectedStore={selectedStore}
              searchQuery={searchQuery}
              onToggleFeatured={handleToggleFeatured}
              onEdit={handleOpenEditModal}
              onDelete={setProductToDelete}
              onOpenAddModal={handleOpenAddModal}
            />
          )}

        </main>
      </div>

      {/* ── LINK EXISTING PRODUCTS MODAL ── */}
      <AnimatePresence>
        {isAddPickerOpen && (
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
              className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white m-0">
                    Link Products to {collection?.name}
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Click any product to add it to this collection.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddPickerOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Picker Search */}
              <div className="pt-3 pb-2 shrink-0">
                <input
                  type="text"
                  placeholder="Filter available products..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-neutral-300 outline-none"
                />
              </div>

              {/* List of unassigned products */}
              <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
                {unassignedProducts.length === 0 ? (
                  <p className="text-xs text-center text-neutral-400 py-8">
                    {pickerSearch
                      ? 'No matching products found.'
                      : 'All store products are already linked to this collection!'}
                  </p>
                ) : (
                  unassignedProducts.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200/50 dark:border-neutral-700/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={p.image}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover bg-neutral-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-neutral-500 font-bold">
                            ₱{Number(p.price).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddProductToCollection(p)}
                        className="px-3 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer shrink-0"
                      >
                        + Add to Collection
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddPickerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PRODUCT MODAL ── */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        editingProduct={editingProduct}
        formData={formData}
        setFormData={setFormData}
        selectedStore={selectedStore}
        storeCollections={collections}
        featuredCount={featuredCount}
        onSave={handleSaveProduct}
      />

      {/* ── DELETE PRODUCT CONFIRMATION MODAL ── */}
      <DeleteProductModal
        productToDelete={productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={confirmDeleteProduct}
      />
    </div>
  )
}
