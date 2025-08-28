'use client'

import { useState, useEffect } from 'react'
import { SkillsMatrix } from './SkillsMatrix'
import { SkillsByProject } from './SkillsByProject'

export function SkillsWithTabs() {
  const [activeTab, setActiveTab] = useState<'employee' | 'project'>('employee')

  // Read subview from URL on mount and when hash changes
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      const subview = params.get('subview')
      
      if (subview === 'project') {
        setActiveTab('project')
      } else {
        setActiveTab('employee')
      }
    }

    // Check on mount
    checkHash()

    // Listen for hash changes
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  const handleTabChange = (tab: 'employee' | 'project') => {
    setActiveTab(tab)
    
    // Update URL to reflect the subview
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    params.set('subview', tab)
    window.location.hash = params.toString()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleTabChange('employee')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'employee'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          By Employee
        </button>
        <button
          onClick={() => handleTabChange('project')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'project'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          By Project
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'employee' ? <SkillsMatrix /> : <SkillsByProject />}
      </div>
    </div>
  )
}