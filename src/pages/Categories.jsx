import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/useToast'
import Sidebar from '../components/Sidebar'
import CategoriesHeader from '../components/categories/CategoriesHeader'
import CategoriesToolbar from '../components/categories/CategoriesToolbar'
import CategoryCard from '../components/categories/CategoryCard'
import CategoryModal from '../components/categories/CategoryModal'
import DeleteCategoryModal from '../components/categories/DeleteCategoryModal'
import {
  fetchCategoriesFromDb,
  createCategoryInDb,
  updateCategoryInDb,
  deleteCategoryFromDb,
  fetchProductsFromDb
} from '../lib/api'

export default function Categories() {
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

  // Selected store is luxe-haven for categories
  const [selectedStore, setSelectedStore] = useState(() => {
    return localStorage.getItem('admin_selected_store') || 'luxe-haven'
  })

  useEffect(() => {
    localStorage.setItem('admin_selected_store', selectedStore)
  }, [selectedStore])

  // Mobile drawer
  const [isOpenMobile, setIsOpenMobile] = useState(false)

  // Data state
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDbConnected, setIsDbConnected] = useState(false)

  // Search & Sort
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState('name-asc')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    image: ''
  })

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 250)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Load categories & products
  const loadData = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        fetchCategoriesFromDb(selectedStore),
        fetchProductsFromDb(selectedStore)
      ])

      if (catRes.success) {
        setCategories(catRes.data || [])
        setIsDbConnected(true)
      } else {
        showToast(catRes.error || 'Failed to fetch categories', 'error')
      }

      if (prodRes.success) {
        setProducts(prodRes.data || [])
      }
    } catch (err) {
      console.error('Error loading categories:', err)
      showToast('Error connecting to database', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [selectedStore, showToast])

  useEffect(() => {
    setIsLoading(true)
    loadData()
  }, [loadData])

  // Filter & Sort
  const filteredCategories = useMemo(() => {
    let result = [...categories]

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.slug && c.slug.toLowerCase().includes(q))
      )
    }

    if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'products-desc') {
      result.sort((a, b) => (b.product_count || 0) - (a.product_count || 0))
    } else if (sortBy === 'newest') {
      result.sort((a, b) => (b.id || 0) - (a.id || 0))
    }

    return result
  }, [categories, debouncedSearch, sortBy])

  // Modal handlers
  const handleOpenCreateModal = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      slug: '',
      image: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat)
    setFormData({
      name: cat.name,
      slug: cat.slug || '',
      image: cat.image || '',
      previousImage: cat.image || ''
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      if (editingCategory) {
        const res = await updateCategoryInDb({
          id: editingCategory.id,
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          image: formData.image,
          previousImage: formData.previousImage,
          product_count: editingCategory.product_count
        }, selectedStore)

        if (res.success) {
          showToast(`Category "${formData.name}" updated successfully!`, 'success')
          setIsModalOpen(false)
          loadData()
        } else {
          showToast(res.error || 'Failed to update category', 'error')
        }
      } else {
        const res = await createCategoryInDb({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          image: formData.image
        }, selectedStore)

        if (res.success) {
          showToast(`Category "${formData.name}" created successfully!`, 'success')
          setIsModalOpen(false)
          loadData()
        } else {
          showToast(res.error || 'Failed to create category', 'error')
        }
      }
    } catch (err) {
      console.error('Error saving category:', err)
      showToast('An unexpected error occurred', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      const res = await deleteCategoryFromDb(
        categoryToDelete.id,
        selectedStore,
        categoryToDelete.image
      )
      if (res.success) {
        showToast(`Category "${categoryToDelete.name}" deleted successfully`, 'success')
        setCategoryToDelete(null)
        loadData()
      } else {
        showToast(res.error || 'Failed to delete category', 'error')
      }
    } catch (err) {
      console.error('Error deleting category:', err)
      showToast('Failed to delete category', 'error')
    }
  }

  const totalAssignedProducts = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.product_count || 0), 0)
  }, [categories])

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
        }}
        isDbConnected={isDbConnected}
        productsCount={products.length}
        categoriesCount={categories.length}
      />

      {/* Main Content Area */}
      <main className="lg:pl-64 flex flex-col min-h-screen">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header */}
          <CategoriesHeader
            totalCategories={categories.length}
            totalAssignedProducts={totalAssignedProducts}
            onOpenCreateModal={handleOpenCreateModal}
          />

          {/* Search & Sort Toolbar */}
          <CategoriesToolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />

          {/* Grid of Categories */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4.2] rounded-3xl bg-neutral-200/50 dark:bg-neutral-800/50 animate-pulse border border-neutral-200/60 dark:border-neutral-800"
                />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mb-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white m-0">
                {searchQuery ? 'No categories found' : 'No categories yet'}
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mt-1 mb-4">
                {searchQuery
                  ? `No categories match "${searchQuery}". Try a different keyword.`
                  : 'Get started by creating your first category for Luxe Haven.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all cursor-pointer shadow-xs"
                >
                  Create Category
                </button>
              )}
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
              <AnimatePresence>
                {filteredCategories.map((cat, idx) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    index={idx}
                    productCount={cat.product_count || 0}
                    onEdit={handleOpenEditModal}
                    onDelete={setCategoryToDelete}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      {/* Category Create/Edit Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingCategory={editingCategory}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteCategoryModal
        categoryToDelete={categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
