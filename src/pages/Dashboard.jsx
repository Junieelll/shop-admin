import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useToast } from '../context/useToast'
import Sidebar from '../components/Sidebar'
import ProductToolbar from '../components/dashboard/ProductToolbar'
import ProductGrid from '../components/dashboard/ProductGrid'
import ProductTable from '../components/dashboard/ProductTable'
import ProductModal from '../components/dashboard/ProductModal'
import DeleteProductModal from '../components/dashboard/DeleteProductModal'
import DeleteCollectionModal from '../components/common/DeleteCollectionModal'
import Pagination from '../components/common/Pagination'
import OnboardingTour from '../components/common/OnboardingTour'
import {
  fetchProductsFromDb,
  fetchProductImagesFromDb,
  fetchCategoriesFromDb,
  createProductInDb,
  updateProductInDb,
  toggleFeaturedInDb,
  deleteProductFromDb,
  fetchCollectionsFromDb,
  deleteCollectionFromDb
} from '../lib/api'

export default function Dashboard() {
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()

  // Theme state
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('admin_theme') === 'dark' ||
      (!('admin_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  // View mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('admin_view_mode') || 'grid'
  })

  // Selected store: 'selyn' | 'luxe-haven'
  const [selectedStore, setSelectedStore] = useState(() => {
    return localStorage.getItem('admin_selected_store') || 'selyn'
  })

  const isLuxe = selectedStore === 'luxe-haven'

  // Mobile sidebar state
  const [isOpenMobile, setIsOpenMobile] = useState(false)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const isSearching = searchQuery !== debouncedSearchQuery

  const colParam = searchParams.get('collection')
  const [activeFilter, setActiveFilter] = useState(() => colParam ? Number(colParam) : 'all')
  const [prevColParam, setPrevColParam] = useState(colParam)

  if (colParam !== prevColParam) {
    setPrevColParam(colParam)
    setActiveFilter(colParam ? Number(colParam) : 'all')
  }

  // Data from live database
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [storeCategories, setStoreCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [collectionToDelete, setCollectionToDelete] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [isTourOpen, setIsTourOpen] = useState(false)

  // Auto-launch onboarding tour on first visit or via ?tour=1 param
  useEffect(() => {
    if (searchParams.get('tour') === '1') {
      setIsTourOpen(true)
      return
    }

    const hasSeenTour = localStorage.getItem('shopadmin_tour_seen')
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setIsTourOpen(true)
      }, 700)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Product Form State
  const [formData, setFormData] = useState({
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
    category: 'perfume-for-women',
    volume: '100ml / 3.4 FL. OZ.',
    concentration: 'Eau de Parfum',
    notes: '',
    frame_size: 'One Size (52-18-140)',
    origin: 'Handmade in Italy',
    specs: '100% UV400 Protection, Italian Acetate'
  })

  // Live DB connection state
  const [isDbConnected, setIsDbConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Fetch live products, collections, & categories
  const loadProducts = useCallback(async () => {
    try {
      const [prodRes, colRes, catRes] = await Promise.all([
        fetchProductsFromDb(selectedStore),
        isLuxe ? Promise.resolve({ success: true, data: [] }) : fetchCollectionsFromDb(selectedStore),
        fetchCategoriesFromDb(selectedStore)
      ])

      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data)
        setIsDbConnected(true)
      }
      if (colRes.success && colRes.data) {
        setCollections(colRes.data)
      }
      if (catRes.success && catRes.data) {
        setStoreCategories(catRes.data)
      }
    } catch (err) {
      console.error('Error loading products & collections:', err)
      showToast('Database connection error', 'error')
    } finally {
      setIsSyncing(false)
      setIsLoading(false)
    }
  }, [selectedStore, isLuxe, showToast])

  useEffect(() => {
    let ignore = false

    const run = async () => {
      if (!ignore) {
        await loadProducts()
      }
    }

    run()

    return () => {
      ignore = true
    }
  }, [loadProducts])

  // Sync theme
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

  // Sync store
  useEffect(() => {
    localStorage.setItem('admin_selected_store', selectedStore)
    if (selectedStore === 'luxe-haven' && typeof activeFilter === 'number') {
      setActiveFilter('all')
    }
  }, [selectedStore, activeFilter])

  // Sync view mode
  useEffect(() => {
    localStorage.setItem('admin_view_mode', viewMode)
  }, [viewMode])

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Filter products by selected store
  const storeProducts = useMemo(() => {
    return products.filter(p => p.store_id === selectedStore)
  }, [products, selectedStore])

  const storeCollections = useMemo(() => {
    return collections.filter(c => c.store_id === selectedStore)
  }, [collections, selectedStore])

  const filteredProducts = useMemo(() => {
    return storeProducts.filter(p => {
      const q = debouncedSearchQuery.toLowerCase()
      const brand = (p.attributes?.brand || '').toLowerCase()
      const matchesSearch = p.name.toLowerCase().includes(q) ||
        brand.includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))

      if (!matchesSearch) return false
      if (activeFilter === 'all') return true
      if (activeFilter === 'featured') return p.featured
      if (typeof activeFilter === 'number') {
        return (p.collection_ids || []).includes(activeFilter)
      }
      if (typeof activeFilter === 'string' && activeFilter.startsWith('cat:')) {
        const cat = activeFilter.replace('cat:', '').toLowerCase()
        return (
          p.category_slug?.toLowerCase() === cat ||
          p.category_name?.toLowerCase() === cat ||
          p.category_name?.toLowerCase().replace(/\s+/g, '-') === cat
        )
      }
      return true
    })
  }, [storeProducts, debouncedSearchQuery, activeFilter])

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [prevFilterKey, setPrevFilterKey] = useState(() => `${selectedStore}-${activeFilter}-${debouncedSearchQuery}`)

  // Reset pagination on filter or search changes during render
  const currentFilterKey = `${selectedStore}-${activeFilter}-${debouncedSearchQuery}`
  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredProducts.slice(start, start + itemsPerPage)
  }, [filteredProducts, currentPage, itemsPerPage])

  const featuredCount = storeProducts.filter(p => p.featured).length

  // Handlers
  const handleToggleFeatured = async (id) => {
    const current = products.find(p => p.id === id)
    const nextFeatured = !current?.featured

    // Limit featured up to 10 only (strictly for Selyn Dress!)
    if (!isLuxe && nextFeatured && featuredCount >= 10) {
      showToast('Maximum of 10 featured products allowed for this store.', 'error')
      return
    }

    setProducts(prev => prev.map(p => {
      if (p.id === id) return { ...p, featured: nextFeatured }
      return p
    }))

    const res = await toggleFeaturedInDb(id, nextFeatured, selectedStore)
    if (res.success) {
      showToast(
        nextFeatured
          ? (isLuxe ? 'Added to bestsellers' : 'Added to featured items')
          : (isLuxe ? 'Removed from bestsellers' : 'Removed from featured items'),
        'success'
      )
    } else {
      showToast(res.error || 'Failed to update status', 'error')
      loadProducts()
    }
  }

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return
    const idToDelete = productToDelete.id
    const name = productToDelete.name

    setProducts(prev => prev.filter(p => p.id !== idToDelete))
    setProductToDelete(null)

    const res = await deleteProductFromDb(idToDelete, selectedStore)
    if (res.success) {
      showToast(`Product "${name}" deleted successfully.`, 'success')
    } else {
      showToast(res.error || 'Failed to delete product', 'error')
      loadProducts()
    }
  }

  const confirmDeleteCollection = async () => {
    if (!collectionToDelete) return
    const idToDelete = collectionToDelete.id
    const name = collectionToDelete.name

    setCollections(prev => prev.filter(c => c.id !== idToDelete))
    if (activeFilter === idToDelete) setActiveFilter('all')
    setCollectionToDelete(null)

    const res = await deleteCollectionFromDb(idToDelete, selectedStore)
    if (res.success) {
      showToast(`Collection "${name}" deleted. Products unlinked.`, 'success')
      loadProducts()
    } else {
      showToast(res.error || 'Failed to delete collection', 'error')
      loadProducts()
    }
  }

  const handleOpenAddModal = () => {
    setEditingProduct(null)
    setFormData({
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
      category: isLuxe ? 'perfume-for-women' : 'Perfume',
      volume: '100ml / 3.4 FL. OZ.',
      concentration: 'Eau de Parfum',
      notes: '',
      frame_size: 'One Size (52-18-140)',
      origin: 'Handmade in Italy',
      specs: '100% UV400 Protection, Italian Acetate'
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = async (listProduct) => {
    const imgRes = await fetchProductImagesFromDb(listProduct.id, selectedStore)
    if (!imgRes.success) {
      showToast('Could not load product images. Please try again.', 'error')
      return
    }
    const fullImages = imgRes.data?.images?.length ? imgRes.data.images : []
    const product = { ...listProduct, images: fullImages }

    setEditingProduct(product)
    const gallery = fullImages.length ? fullImages : (product.image ? [product.image] : [])
    setFormData({
      name: product.name || '',
      brand: product.attributes?.brand || '',
      price: product.price || '',
      originalPrice: product.attributes?.originalPrice || '',
      image: product.image || gallery[0] || '',
      images: gallery,
      featured: product.featured,
      description: product.description || '',
      sizes: product.attributes?.sizes || ['M'],
      collection_ids: product.collection_ids || [],
      category: product.category_slug || product.category_name || (isLuxe ? 'perfume-for-women' : 'Perfume'),
      volume: product.attributes?.volume || '100ml / 3.4 FL. OZ.',
      concentration: product.attributes?.concentration || 'Eau de Parfum',
      notes: product.attributes?.notes || '',
      frame_size: product.attributes?.frame_size || 'One Size (52-18-140)',
      origin: product.attributes?.origin || 'Handmade in Italy',
      specs: product.attributes?.specs || '100% UV400 Protection, Italian Acetate'
    })
    setIsModalOpen(true)
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

    // Limit featured up to 10 only (strictly for Selyn Dress!)
    const willBeFeatured = Boolean(formData.featured)
    const wasFeatured = editingProduct ? Boolean(editingProduct.featured) : false
    if (!isLuxe && willBeFeatured && !wasFeatured && featuredCount >= 10) {
      showToast('Maximum of 10 featured products allowed for this store.', 'error')
      return
    }

    let attributes = {}
    let catId = null
    let categoryName = undefined
    let categorySlug = undefined

    if (!isLuxe) {
      attributes = { sizes: formData.sizes }
    } else {
      attributes = {
        brand: formData.brand || '',
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : null,
        volume: formData.volume || '',
        concentration: formData.concentration || '',
        notes: formData.notes || '',
        frame_size: formData.frame_size || '',
        origin: formData.origin || '',
        specs: formData.specs || ''
      }

      const matchedCat = storeCategories.find(c => c.slug === formData.category || c.name === formData.category)
      if (matchedCat) {
        catId = matchedCat.id
        categoryName = matchedCat.name
        categorySlug = matchedCat.slug
      } else {
        categorySlug = formData.category
      }
    }

    const matchedCollections = !isLuxe
      ? storeCollections.filter(c => (formData.collection_ids || []).includes(c.id))
      : []

    const productPayload = {
      store_id: selectedStore,
      name: formData.name,
      price: Number(formData.price),
      image: mainImage,
      images: formData.images.length ? formData.images : [mainImage],
      featured: formData.featured,
      description: formData.description,
      category_id: catId,
      attributes,
      collection_ids: !isLuxe ? formData.collection_ids : [],
    }

    if (editingProduct) {
      setProducts(prev => prev.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            name: formData.name,
            price: Number(formData.price),
            image: mainImage,
            images: formData.images.length ? formData.images : [mainImage],
            featured: formData.featured,
            description: formData.description,
            category_id: catId,
            category_name: categoryName || p.category_name,
            category_slug: categorySlug || p.category_slug,
            attributes,
            collection_ids: !isLuxe ? formData.collection_ids : [],
            collections: matchedCollections
          }
        }
        return p
      }))

      updateProductInDb({ ...productPayload, id: editingProduct.id }, selectedStore).then((res) => {
        if (res.success) {
          showToast(`Product "${productPayload.name}" updated successfully.`, 'success')
        } else {
          showToast(res.error || 'Failed to update product', 'error')
        }
        loadProducts()
      })
    } else {
      const tempId = Date.now()
      const newProduct = {
        id: tempId,
        store_id: selectedStore,
        name: formData.name,
        price: Number(formData.price),
        image: mainImage,
        images: formData.images.length ? formData.images : [mainImage],
        featured: formData.featured,
        description: formData.description,
        category_id: catId,
        category_name: categoryName,
        category_slug: categorySlug,
        attributes,
        collection_ids: !isLuxe ? formData.collection_ids : [],
        collections: matchedCollections
      }
      setProducts(prev => [newProduct, ...prev])

      createProductInDb(productPayload, selectedStore).then((res) => {
        if (res.success) {
          showToast(`Product "${productPayload.name}" created successfully.`, 'success')
        } else {
          showToast(res.error || 'Failed to create product', 'error')
        }
        loadProducts()
      })
    }

    setIsModalOpen(false)
  }

  return (
    <div className={`min-h-screen ${isDark ? 'dark' : ''} bg-[#fafafa] dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 font-['Poppins'] transition-colors duration-200`}>
      
      {/* ── ONBOARDING TOUR ── */}
      <OnboardingTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        selectedStore={selectedStore}
      />

      {/* ── SIDEBAR ── */}
      <Sidebar
        isDark={isDark}
        setIsDark={setIsDark}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
        selectedStore={selectedStore}
        onSelectStore={(store) => {
          setSelectedStore(store)
          setActiveFilter('all')
        }}
        isDbConnected={isDbConnected}
        isSyncing={isSyncing}
        onRefresh={() => {
          setIsSyncing(true)
          loadProducts()
        }}
        productsCount={storeProducts.length}
        collectionsCount={storeCollections.length}
        categoriesCount={storeCategories.length}
      />

      {/* ── MAIN CONTENT AREA ── */}
      <main className="lg:pl-64 flex flex-col min-h-screen">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white m-0">
                  {isLuxe ? 'Luxe Haven Catalog' : 'Product Catalog'}
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {storeProducts.length} items
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {isLuxe
                  ? 'Manage authentic perfumes and eyewear catalog'
                  : 'Manage dress inventory, photos, and sizing'}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {!isLuxe ? (
                <Link
                  to="/collections"
                  data-tour="collections-link"
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold shadow-xs transition-all no-underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>Collections ({storeCollections.length})</span>
                </Link>
              ) : (
                <Link
                  to="/categories"
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold shadow-xs transition-all no-underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span>Categories ({storeCategories.length})</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleOpenAddModal}
                data-tour="add-product-btn"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {/* ── FILTER, SEARCH & VIEW MODE TOOLBAR ── */}
          <div data-tour="product-toolbar">
            <ProductToolbar
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              selectedStore={selectedStore}
              storeProductsCount={storeProducts.length}
              featuredCount={featuredCount}
              storeCollections={storeCollections}
              storeProducts={storeProducts}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isSearching={isSearching}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          </div>

          {/* ── PRODUCTS VIEW (GRID / LIST) ── */}
          {viewMode === 'grid' ? (
            <ProductGrid
              products={paginatedProducts}
              isLoading={isLoading}
              selectedStore={selectedStore}
              searchQuery={searchQuery}
              onToggleFeatured={handleToggleFeatured}
              onEdit={handleOpenEditModal}
              onDelete={(prod) => setProductToDelete(prod)}
              onOpenAddModal={handleOpenAddModal}
            />
          ) : (
            <ProductTable
              products={paginatedProducts}
              isLoading={isLoading}
              selectedStore={selectedStore}
              searchQuery={searchQuery}
              onToggleFeatured={handleToggleFeatured}
              onEdit={handleOpenEditModal}
              onDelete={(prod) => setProductToDelete(prod)}
              onOpenAddModal={handleOpenAddModal}
            />
          )}

          {/* ── PAGINATION CONTROLS ── */}
          {totalPages > 1 && (
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

      {/* ── ADD / EDIT PRODUCT MODAL ── */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingProduct={editingProduct}
        formData={formData}
        setFormData={setFormData}
        selectedStore={selectedStore}
        storeCollections={storeCollections}
        storeCategories={storeCategories}
        featuredCount={featuredCount}
        onSave={handleSaveProduct}
      />

      {/* ── DELETE PRODUCT CONFIRMATION MODAL ── */}
      <DeleteProductModal
        product={productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={confirmDeleteProduct}
      />

      {/* ── DELETE COLLECTION CONFIRMATION MODAL ── */}
      <DeleteCollectionModal
        collection={collectionToDelete}
        onClose={() => setCollectionToDelete(null)}
        onConfirm={confirmDeleteCollection}
      />
    </div>
  )
}
