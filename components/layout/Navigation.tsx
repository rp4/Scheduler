'use client'

import { usePathname } from 'next/navigation'
import { Calendar, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

const tabs = [
  { id: 'gantt', label: 'Gantt Chart', icon: Calendar },
  { id: 'hours', label: 'Hours', icon: Clock },
  { id: 'skills', label: 'Skills', icon: User },
]

export function Navigation() {
  const pathname = usePathname()
  const [currentView, setCurrentView] = useState('gantt')
  
  useEffect(() => {
    // Get view from URL hash for static export
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      setCurrentView(params.get('view') || 'gantt')
    }
    
    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Only show navigation on schedule page
  if (!pathname.includes('/schedule')) return null

  const handleTabClick = (tabId: string) => {
    // Update the hash without causing a page reload
    window.location.hash = `view=${tabId}`
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = currentView === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2',
                  isActive
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}