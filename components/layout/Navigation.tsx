'use client'

import { usePathname } from 'next/navigation'
import { Calendar, Clock, User, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { AddProjectForm } from '@/components/features/gantt/AddProjectForm'

const tabs = [
  { id: 'gantt', label: 'Gantt Chart', icon: Calendar },
  { id: 'hours', label: 'Hours', icon: Clock },
  { id: 'skills', label: 'Skills', icon: User },
]

type GanttViewMode = 'week' | 'month' | 'year'

export function Navigation() {
  const pathname = usePathname()
  const [currentView, setCurrentView] = useState('gantt')
  const [ganttViewMode, setGanttViewMode] = useState<GanttViewMode>('week')
  const addProject = useScheduleStore((state) => state.addProject)
  
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

  const handleZoomIn = () => {
    const modes: GanttViewMode[] = ['week', 'month', 'year']
    const currentIndex = modes.indexOf(ganttViewMode)
    if (currentIndex > 0) {
      setGanttViewMode(modes[currentIndex - 1])
      // Dispatch event for GanttChart to listen to
      window.dispatchEvent(new CustomEvent('gantt-zoom-change', { detail: modes[currentIndex - 1] }))
    }
  }
  
  const handleZoomOut = () => {
    const modes: GanttViewMode[] = ['week', 'month', 'year']
    const currentIndex = modes.indexOf(ganttViewMode)
    if (currentIndex < modes.length - 1) {
      setGanttViewMode(modes[currentIndex + 1])
      // Dispatch event for GanttChart to listen to
      window.dispatchEvent(new CustomEvent('gantt-zoom-change', { detail: modes[currentIndex + 1] }))
    }
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <nav className="flex justify-between items-center">
          <div className="flex gap-1">
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
          </div>
          
          {/* Gantt-specific controls */}
          {currentView === 'gantt' && (
            <div className="flex gap-2 py-2">
              {/* Add Project Button */}
              <AddProjectForm onAddProject={addProject} />
              
              {/* Zoom Controls */}
              <div className="flex gap-2 bg-white rounded-lg shadow-md p-1">
                <button
                  onClick={handleZoomIn}
                  disabled={ganttViewMode === 'week'}
                  className="p-2 bg-white hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  disabled={ganttViewMode === 'year'}
                  className="p-2 bg-white hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1 px-2 py-1 border-l">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm capitalize">{ganttViewMode}</span>
                </div>
              </div>
            </div>
          )}
        </nav>
      </div>
    </div>
  )
}