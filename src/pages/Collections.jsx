import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/ToastContext'
import Sidebar from '../components/Sidebar'
import CollectionsHeader from '../components/collections/CollectionsHeader'
import CollectionsToolbar from '../components/collections/CollectionsToolbar'
import CollectionCard from '../components/collections/CollectionCard'
import CollectionModal from '../components/collections/CollectionModal'
import DeleteCollectionModal from '../components/common/DeleteCollectionModal'
import {
  fetchCollectionsFromDb,
  createCollectionInDb,
  updateCollectionInDb,
  deleteCollectionFromDb,
  fetchProductsFromDb
} from '../lib/api'

export default function Collections() {
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

  // Selected store
  const [selectedStore, setSelectedStore] = useState(() => {
    return localStorage.getItem('admin_selected_store') || 'selyn'
  })

  useEffect(() => {
    localStorage.setItem('admin_selected_store', selectedStore)
  }, [selectedStore])

  // Mobile drawer
  const [isOpenMobile, setIsOpenMobile] = useState(false)

  // Data state
  const [collections, setCollections] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDbConnected, setIsDbConnected] = useState(false)

  // Search & Sort
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState('name-asc')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState(null)
  const [collectionToDelete, setCollectionToDelete] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    banner_image: ''
  })

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 250)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Load collections & products
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [colRes, prodRes] = await Promise.all([
        fetchCollectionsFromDb(selectedStore),
        fetchProductsFromDb(selectedStore)
      ])

      if (colRes.success) {
        setCollections(colRes.data || [])
        setIsDbConnected(true)
      } else {
        showToast(colRes.error || 'Failed to fetch collections', 'error')
      }

      if (prodRes.success) {
        setProducts(prodRes.data || [])
      }
    } catch (err) {
      console.error('Error loading collections data:', err)
      showToast('Database connection error', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedStore])

  // Filtered & Sorted collections
  const filteredCollections = useMemo(() => {
    let result = collections.filter(c => {
      if (!debouncedSearch.trim()) return true
      const q = debouncedSearch.toLowerCase()
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.slug || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      )
    })

    if (sortBy === 'name-asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else if (sortBy === 'products-desc') {
      result.sort((a, b) => (b.product_count || 0) - (a.product_count || 0))
    } else if (sortBy === 'newest') {
      result.sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
    }

    return result
  }, [collections, debouncedSearch, sortBy])

  // Total products in all collections
  const totalTaggedProducts = useMemo(() => {
    const ids = new Set()
    products.forEach(p => {
      if (p.collection_ids?.length) {
        ids.add(p.id)
      }
    })
    return ids.size
  }, [products])

  // Handlers
  const handleOpenAdd = () => {
    setEditingCollection(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      banner_image: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (col) => {
    setEditingCollection(col)
    setFormData({
      name: col.name || '',
      slug: col.slug || '',
      description: col.description || '',
      banner_image: col.banner_image || ''
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('Please provide a collection name.', 'warning')
      return
    }

    const slug = (formData.slug.trim() || formData.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    setIsSubmitting(true)

    if (editingCollection) {
      const payload = {
        id: editingCollection.id,
        name: formData.name.trim(),
        slug,
        description: formData.description.trim(),
        banner_image: formData.banner_image || null
      }

      setCollections(prev => prev.map(c => c.id === editingCollection.id ? { ...c, ...payload } : c))
      setIsModalOpen(false)

      const res = await updateCollectionInDb(payload, selectedStore)
      if (res.success) {
        showToast(`Collection "${payload.name}" updated successfully.`, 'success')
      } else {
        showToast(res.error || 'Failed to update collection', 'error')
        loadData()
      }
    } else {
      const payload = {
        name: formData.name.trim(),
        slug,
        description: formData.description.trim() || `Collection for ${selectedStore}`,
        banner_image: formData.banner_image || null
      }

      const tempId = Date.now()
      setCollections(prev => [...prev, { ...payload, id: tempId, product_count: 0 }])
      setIsModalOpen(false)

      const res = await createCollectionInDb(payload, selectedStore)
      if (res.success) {
        showToast(`Collection "${payload.name}" created successfully.`, 'success')
        loadData()
      } else {
        showToast(res.error || 'Failed to create collection', 'error')
        loadData()
      }
    }

    setIsSubmitting(false)
  }

  const confirmDelete = async () => {
    if (!collectionToDelete) return
    const id = collectionToDelete.id
    const name = collectionToDelete.name

    setCollections(prev => prev.filter(c => c.id !== id))
    setCollectionToDelete(null)

    const res = await deleteCollectionFromDb(id, selectedStore)
    if (res.success) {
      showToast(`Collection "${name}" deleted. Products unlinked.`, 'success')
      loadData()
    } else {
      showToast(res.error || 'Failed to delete collection', 'error')
      loadData()
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? 'dark' : ''} bg-[#fafafa] dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 font-['Poppins'] transition-colors duration-200`}>
      {/* ── SIDEBAR ── */}
      <Sidebar
        selectedStore={selectedStore}
        onSelectStore={setSelectedStore}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        isDbConnected={isDbConnected}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        productsCount={products.filter(p => p.store_id === selectedStore).length}
        collectionsCount={collections.length}
      />

      {/* ── MAIN CONTENT (OFFSET FOR SIDEBAR) ── */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        
        {/* Mobile Header Bar */}
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
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            {selectedStore === 'selyn' ? 'Selyn Dress' : 'Luxe Haven II'}
          </span>
        </header>

        {/* Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6 w-full flex-1">
          {/* Header & Stats */}
          <CollectionsHeader
            selectedStore={selectedStore}
            totalCollections={collections.length}
            totalTaggedProducts={totalTaggedProducts}
            onOpenCreateModal={handleOpenAdd}
          />

          {/* Search & Sort Toolbar */}
          <CollectionsToolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />

          {/* Collections Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 rounded-3xl bg-neutral-100 dark:bg-neutral-800/50 animate-pulse border border-neutral-200/60 dark:border-neutral-800" />
              ))}
            </div>
          ) : filteredCollections.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                {searchQuery ? 'No matching collections found' : 'No collections created yet'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-5">
                {searchQuery
                  ? 'Try searching with different keywords or clear your query.'
                  : 'Create your first collection to group and showcase items in themed catalogs.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold cursor-pointer shadow-sm"
                >
                  + Create Collection
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              <AnimatePresence mode="popLayout">
                {filteredCollections.map((col, index) => {
                  const count = col.product_count !== undefined 
                    ? col.product_count 
                    : products.filter(p => (p.collection_ids || []).includes(col.id)).length

                  return (
                    <CollectionCard
                      key={col.id}
                      col={col}
                      index={index}
                      productCount={count}
                      onEdit={handleOpenEdit}
                      onDelete={setCollectionToDelete}
                    />
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </main>
      </div>

      {/* ── CREATE / EDIT COLLECTION MODAL ── */}
      <CollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingCollection={editingCollection}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <DeleteCollectionModal
        collectionToDelete={collectionToDelete}
        onClose={() => setCollectionToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
