import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/useToast'
import { authClient } from '../lib/auth'
import Sidebar from '../components/Sidebar'
import { fetchProductsFromDb, fetchCollectionsFromDb } from '../lib/api'

export default function Profile() {
  const { user, refreshUser, updateLocalUser } = useAuth()
  const { showToast } = useToast()

  // Theme state
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('admin_theme') === 'dark' ||
      (!('admin_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  // Selected store for sidebar & management ('selyn' | 'luxe-haven')
  const [selectedStore, setSelectedStore] = useState(() => {
    return localStorage.getItem('admin_selected_store') || 'selyn'
  })

  // Mobile sidebar drawer state
  const [isOpenMobile, setIsOpenMobile] = useState(false)

  // Catalog counts for sidebar
  const [counts, setCounts] = useState({ products: 0, collections: 0 })
  const [isDbConnected, setIsDbConnected] = useState(true)

  // Active Tab: 'profile' | 'security' | 'system'
  const [activeTab, setActiveTab] = useState('profile')

  // Profile Form State
  const [name, setName] = useState(() => user?.name || '')
  const [email, setEmail] = useState(() => user?.email || '')
  const [image, setImage] = useState(() => user?.image || '')
  const [isUploading, setIsUploading] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [customUrl, setCustomUrl] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef(null)

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)



  // Sync theme with document and localStorage
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

  // Sync store selection with localStorage
  useEffect(() => {
    localStorage.setItem('admin_selected_store', selectedStore)
  }, [selectedStore])

  // Fetch counts for sidebar
  useEffect(() => {
    Promise.all([
      fetchProductsFromDb(selectedStore),
      fetchCollectionsFromDb(selectedStore)
    ]).then(([prodRes, colRes]) => {
      setCounts({
        products: prodRes.data?.length || 0,
        collections: colRes.data?.length || 0
      })
      if (prodRes.success) setIsDbConnected(true)
    }).catch(() => setIsDbConnected(false))
  }, [selectedStore])

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Empty', color: 'bg-neutral-200 dark:bg-neutral-700' }
    let score = 0
    if (pass.length >= 8) score += 1
    if (pass.length >= 12) score += 1
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' }
    if (score === 3) return { score: 2, label: 'Fair', color: 'bg-amber-500' }
    if (score === 4) return { score: 3, label: 'Good', color: 'bg-blue-500' }
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  // Downscale image to a crisp, lightweight square avatar (320x320)
  const processAvatarImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const size = 320
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')

          // Crop center square
          const minSide = Math.min(img.width, img.height)
          const sx = (img.width - minSide) / 2
          const sy = (img.height - minSide) / 2

          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size)
          resolve(canvas.toDataURL('image/jpeg', 0.88))
        }
        img.onerror = reject
        img.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Handle avatar file selection / drag-and-drop
  const handleAvatarFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPEG, PNG, WEBP).', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size exceeds 10MB limit.', 'error')
      return
    }

    setIsUploading(true)
    try {
      const compressedDataUrl = await processAvatarImage(file)

      let finalUrl = compressedDataUrl
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `avatar_${Date.now()}.jpg`,
            fileData: compressedDataUrl,
            contentType: 'image/jpeg'
          })
        })
        if (res.ok) {
          const data = await res.json()
          if (data.url) finalUrl = data.url
        }
      } catch {
        // Fallback to optimized compressed data url
      }

      // Update state and active user avatar immediately
      setImage(finalUrl)
      updateLocalUser({ image: finalUrl })

      // Persist directly to database if user.id is available
      if (user?.id) {
        try {
          await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, name, image: finalUrl })
          })
        } catch (dbErr) {
          console.warn('Direct DB avatar save note:', dbErr)
        }
        authClient.updateUser({ image: finalUrl }).catch(() => {})
      }

      showToast('Profile photo updated successfully!', 'success')
    } catch (err) {
      console.error('Avatar upload error:', err)
      showToast('Failed to process image file.', 'error')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAvatarFile(e.dataTransfer.files[0])
    }
  }

  const handleRemovePhoto = async () => {
    setImage('')
    updateLocalUser({ image: null })
    if (user?.id) {
      fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name, image: null })
      }).catch(() => {})
      authClient.updateUser({ image: null }).catch(() => {})
    }
    showToast('Profile photo removed.', 'success')
  }

  // Save Name, Email, and Avatar Picture
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      showToast('Name cannot be empty.', 'error')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email address.', 'error')
      return
    }

    setIsSavingProfile(true)
    try {
      // 1. Direct database update for guaranteed persistence
      if (user?.id) {
        const profileRes = await fetch('/api/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            name: name.trim(),
            image: image || null
          })
        })
        if (!profileRes.ok) {
          const profileData = await profileRes.json()
          console.warn('Profile DB update note:', profileData.error)
        }
      }

      // 2. AuthClient update
      const updateResult = await authClient.updateUser({
        name: name.trim(),
        image: image || null
      })
      if (updateResult?.error) {
        console.warn('authClient.updateUser note:', updateResult.error)
      }

      // 3. Email update if changed
      const trimmedEmail = email.trim().toLowerCase()
      const emailChanged = trimmedEmail !== (user?.email || '').toLowerCase()
      if (emailChanged && user?.id) {
        const emailRes = await fetch('/api/update-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, newEmail: trimmedEmail })
        })
        const emailData = await emailRes.json()
        if (!emailRes.ok) {
          throw new Error(emailData.error || 'Failed to update email address')
        }
      }

      updateLocalUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        image: image || null
      })

      if (refreshUser) await refreshUser()
      showToast('Administrator profile updated successfully!', 'success')
    } catch (err) {
      console.error('Profile update failed:', err)
      showToast(err.message || 'Failed to update profile', 'error')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!currentPassword) {
      showToast('Please enter your current password.', 'error')
      return
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'error')
      return
    }
    if (currentPassword === newPassword) {
      showToast('New password cannot be the same as your current password.', 'warning')
      return
    }

    const getFriendlyErrorMessage = (errorObj) => {
      const rawMsg = errorObj?.message || ''
      const code = errorObj?.code || ''
      const isWrongPassword =
        rawMsg.toLowerCase().includes('invalid email or password') ||
        rawMsg.toLowerCase().includes('invalid password') ||
        code === 'INVALID_EMAIL_OR_PASSWORD' ||
        code === 'INVALID_PASSWORD'

      return isWrongPassword
        ? 'Incorrect current password. Please check and try again.'
        : (rawMsg || 'Failed to change password. Please verify your current password.')
    }

    setIsUpdatingPassword(true)
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true
      })

      if (res?.error) {
        throw new Error(getFriendlyErrorMessage(res.error))
      }

      showToast('Password updated successfully! Use your new password on your next login.', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Change password error:', err)
      showToast(getFriendlyErrorMessage(err), 'error')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const tabs = [
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'security',
      label: 'Security & Password',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    {
      id: 'system',
      label: 'System & Stores',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    }
  ]

  return (
    <div
      className={`min-h-screen ${isDark ? 'dark bg-[#09090b]' : 'bg-[#fafafa]'} text-neutral-900 dark:text-neutral-100 font-['Poppins'] transition-colors duration-200`}
      style={{ backgroundColor: isDark ? '#09090b' : '#fafafa' }}
    >
      {/* ── SIDEBAR ── */}
      <Sidebar
        selectedStore={selectedStore}
        onSelectStore={(store) => setSelectedStore(store)}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        isDbConnected={isDbConnected}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        productsCount={counts.products}
        collectionsCount={counts.collections}
      />

      {/* ── MAIN CONTENT AREA ── */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        
        {/* Mobile Header Bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpenMobile(true)}
              className="p-1.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">ShopAdmin</span>
          </div>
        </header>

        {/* ── CONTENT CONTAINER (RESTORED TO MAX-W-4XL) ── */}
        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 w-full flex-1 space-y-6">

          {/* Page Title & Subtitle */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white m-0">
                Account Settings
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Manage your profile information, credentials, password, and store catalog access.
              </p>
            </div>

            {/* ── CLEAN TAB BAR ── */}
            <div className="border-b border-neutral-200 dark:border-neutral-800 pt-1">
              <nav className="flex space-x-1 sm:space-x-3" aria-label="Tabs">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center gap-2 py-3 px-3.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
                        isActive
                          ? 'text-neutral-900 dark:text-white font-bold'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      <span className={isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-500'}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>

                      {/* Active indicator underline */}
                      {isActive && (
                        <motion.div
                          layoutId="activeSettingsTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* ── TAB PANELS WITH ANIMATION ── */}
          <AnimatePresence mode="wait">
            {/* ── TAB 1: PROFILE ── */}
            {activeTab === 'profile' && (
              <motion.div
                key="tab-profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Profile Photo Card */}
                <div className="bg-white dark:bg-[#121215] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 space-y-5">
                  <div>
                    <h2 className="text-sm font-bold text-neutral-900 dark:text-white m-0">
                      Profile Picture
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      This photo represents you across all store administrations.
                    </p>
                  </div>

                  <div className="flex items-center gap-6 pt-1 flex-wrap sm:flex-nowrap">
                    {/* Avatar Preview */}
                    <div
                      className="relative rounded-2xl overflow-hidden border-2 flex items-center justify-center shadow-md shrink-0"
                      style={{
                        width: '80px',
                        height: '80px',
                        minWidth: '80px',
                        minHeight: '80px',
                        maxWidth: '80px',
                        maxHeight: '80px',
                        backgroundColor: isDark ? '#262626' : '#f3f4f6',
                        borderColor: isDark ? '#525252' : '#d1d5db'
                      }}
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={name || 'Admin'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-2xl font-black select-none tracking-tight"
                          style={{ color: isDark ? '#ffffff' : '#18181b' }}
                        >
                          {name ? name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'A')}
                        </span>
                      )}

                      {/* Online dot */}
                      <span
                        className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 shadow-xs"
                        style={{ borderColor: isDark ? '#262626' : '#ffffff' }}
                      />
                    </div>

                    {/* Actions & Dropzone */}
                    <div className="flex-1 w-full space-y-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => handleAvatarFile(e.target.files?.[0])}
                        accept="image/*"
                        className="hidden"
                      />

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          style={{
                            backgroundColor: isDark ? '#ffffff' : '#171717',
                            color: isDark ? '#171717' : '#ffffff'
                          }}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50"
                        >
                          {isUploading ? 'Uploading...' : 'Upload New Photo'}
                        </button>

                        {image && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="px-3.5 py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                          className="px-2 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          {showUrlInput ? 'Hide URL field' : 'Use image URL'}
                        </button>
                      </div>

                      {/* Drop area */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragActive(true) }}
                        onDragLeave={() => setIsDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-4 rounded-xl border border-dashed transition-all cursor-pointer text-center ${
                          isDragActive
                            ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800'
                            : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40 hover:border-neutral-400 dark:hover:border-neutral-600'
                        }`}
                      >
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 m-0">
                          Or drag and drop an image file here (PNG, JPG, WEBP up to 5MB)
                        </p>
                      </div>

                      {/* Collapsible URL Input */}
                      {showUrlInput && (
                        <div className="flex gap-2 pt-1">
                          <input
                            type="url"
                            placeholder="https://example.com/photo.jpg"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white outline-none focus:border-neutral-900 dark:focus:border-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customUrl.trim()) {
                                setImage(customUrl.trim())
                                setCustomUrl('')
                                setShowUrlInput(false)
                                showToast('Image URL applied!', 'success')
                              }
                            }}
                            className="px-4 py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-700 text-xs font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Personal Information Form */}
                <form onSubmit={handleSaveProfile} className="bg-white dark:bg-[#121215] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 space-y-5">
                  <div className="border-b border-neutral-100 dark:border-neutral-800 pb-4">
                    <h2 className="text-sm font-bold text-neutral-900 dark:text-white m-0">
                      Personal Details
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Update your administrator name and contact email address.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Administrator"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 text-sm rounded-xl bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 focus:border-black dark:focus:border-white outline-none transition-all"
                      />
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="admin@store.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 text-sm rounded-xl bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 focus:border-black dark:focus:border-white outline-none transition-all"
                      />
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1.5 pl-0.5">
                        Used for login and password recovery. Changes apply immediately.
                      </p>
                    </div>

                    {/* Role Display */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                        Assigned Role
                      </label>
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                        <span className="font-semibold text-neutral-900 dark:text-white">Super Administrator</span>
                        <span className="text-neutral-400">•</span>
                        <span className="text-neutral-500 dark:text-neutral-400">Full system & database permissions</span>
                      </div>
                    </div>
                  </div>

                  {/* Save Changes Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      style={{
                        backgroundColor: isDark ? '#ffffff' : '#171717',
                        color: isDark ? '#171717' : '#ffffff'
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSavingProfile && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
                          style={{
                            borderColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
                            borderTopColor: isDark ? '#171717' : '#ffffff'
                          }}
                        />
                      )}
                      <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ── TAB 2: SECURITY & PASSWORD ── */}
            {activeTab === 'security' && (
              <motion.div
                key="tab-security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Security Advice Banner */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 dark:bg-amber-500/10 dark:border-amber-500/20 text-neutral-900 dark:text-neutral-100 flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      Default Password Recommendation
                    </h3>
                    <p className="text-[11px] text-amber-800/90 dark:text-amber-200/80 leading-relaxed">
                      If your account was initialized using a default setup password, please replace it immediately with a private, unique passphrase to keep your store secure.
                    </p>
                  </div>
                </div>

                {/* Change Password Form */}
                <form onSubmit={handleChangePassword} className="bg-white dark:bg-[#121215] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 space-y-5">
                  <div className="border-b border-neutral-100 dark:border-neutral-800 pb-4">
                    <h2 className="text-sm font-bold text-neutral-900 dark:text-white m-0">
                      Change Password
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Enter your current password, followed by your new secure password.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Current Password */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          required
                          placeholder="Enter your current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full pl-4 pr-16 py-3 text-sm rounded-xl bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 focus:border-black dark:focus:border-white outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                        >
                          {showCurrentPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          placeholder="Minimum 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-4 pr-16 py-3 text-sm rounded-xl bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 focus:border-black dark:focus:border-white outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                        >
                          {showNewPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>

                      {/* Password strength meter */}
                      {newPassword && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-500 dark:text-neutral-400">Password strength:</span>
                            <span className={`font-semibold ${
                              passwordStrength.score <= 1 ? 'text-red-500' :
                              passwordStrength.score === 2 ? 'text-amber-500' :
                              passwordStrength.score === 3 ? 'text-blue-500' : 'text-emerald-500'
                            }`}>
                              {passwordStrength.label}
                            </span>
                          </div>

                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                  passwordStrength.score >= step
                                    ? passwordStrength.color
                                    : 'bg-neutral-200 dark:bg-neutral-700'
                                }`}
                              />
                            ))}
                          </div>

                          {/* Requirements checklist chips */}
                          <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${
                              newPassword.length >= 8
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium'
                                : 'text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800'
                            }`}>
                              {newPassword.length >= 8 ? '✓' : '•'} 8+ characters
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${
                              /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium'
                                : 'text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800'
                            }`}>
                              {/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? '✓' : '•'} Mixed case
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${
                              /[0-9]/.test(newPassword)
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium'
                                : 'text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800'
                            }`}>
                              {/[0-9]/.test(newPassword) ? '✓' : '•'} Number
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${
                              /[^A-Za-z0-9]/.test(newPassword)
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium'
                                : 'text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800'
                            }`}>
                              {/[^A-Za-z0-9]/.test(newPassword) ? '✓' : '•'} Special symbol
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          placeholder="Repeat new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-4 pr-16 py-3 text-sm rounded-xl bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 focus:border-black dark:focus:border-white outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                        >
                          {showConfirmPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>

                      {/* Confirmation feedback */}
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-[11px] text-red-500 font-medium mt-1.5 pl-0.5">
                          Passwords do not match
                        </p>
                      )}
                      {confirmPassword && newPassword === confirmPassword && (
                        <p className="text-[11px] text-emerald-500 font-medium mt-1.5 pl-0.5">
                          ✓ Passwords match
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Update Password Submit */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword || (Boolean(confirmPassword) && newPassword !== confirmPassword)}
                      style={{
                        backgroundColor: isDark ? '#ffffff' : '#171717',
                        color: isDark ? '#171717' : '#ffffff'
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUpdatingPassword && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
                          style={{
                            borderColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
                            borderTopColor: isDark ? '#171717' : '#ffffff'
                          }}
                        />
                      )}
                      <span>{isUpdatingPassword ? 'Updating Password...' : 'Update Password'}</span>
                    </button>
                  </div>
                </form>

                {/* Session Security Overview */}
                <div className="bg-white dark:bg-[#121215] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 space-y-4">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white m-0">
                    Active Session & Security
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Session Status</span>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Active Authenticated Session
                      </p>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Encrypted Neon Auth Session Cookie</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Revocation Rule</span>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                        Revoke Other Sessions on Change
                      </p>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">All other devices will be forced to re-login</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── TAB 3: SYSTEM & STORES ── */}
            {activeTab === 'system' && (
              <motion.div
                key="tab-system"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Store Catalog Assignments */}
                <div className="bg-white dark:bg-[#121215] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-neutral-900 dark:text-white m-0">
                      Managed Store Catalogs
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Select which store catalog to actively manage in the sidebar and dashboard.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Store 1: Selyn Dress */}
                    <div
                      onClick={() => {
                        setSelectedStore('selyn')
                        showToast('Active store switched to Selyn Dress', 'info')
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedStore === 'selyn'
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800/70 shadow-xs ring-1 ring-neutral-900/10 dark:ring-white/20'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121215] hover:border-neutral-400 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">Selyn Dress</span>
                        {selectedStore === 'selyn' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                            Active in Sidebar
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                            Click to activate →
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">Catalog identifier: `selyn`</p>
                    </div>

                    {/* Store 2: Luxe Haven II */}
                    <div
                      onClick={() => {
                        setSelectedStore('luxe-haven')
                        showToast('Active store switched to Luxe Haven II', 'info')
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedStore === 'luxe-haven'
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800/70 shadow-xs ring-1 ring-neutral-900/10 dark:ring-white/20'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121215] hover:border-neutral-400 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">Luxe Haven II</span>
                        {selectedStore === 'luxe-haven' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                            Active in Sidebar
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                            Click to activate →
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">Catalog identifier: `luxe-haven`</p>
                    </div>
                  </div>
                </div>

                {/* Database & Infrastructure */}
                <div className="bg-white dark:bg-[#121215] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-neutral-900 dark:text-white m-0">
                      Database & Infrastructure
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Backend services and database connectivity.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Database Engine</span>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                        Neon Postgres
                      </p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        • Online & Synced
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Authentication</span>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                        Neon Auth
                      </p>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        Cookie-based sessions
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">Interface Theme</span>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                        {isDark ? 'Dark Mode' : 'Light Mode'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsDark(!isDark)}
                        className="text-[10px] text-neutral-600 dark:text-neutral-300 font-semibold underline cursor-pointer"
                      >
                        Switch to {isDark ? 'Light' : 'Dark'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </div>
    </div>
  )
}
