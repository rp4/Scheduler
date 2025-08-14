'use client'

import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { Calendar, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'gantt', label: 'Gantt Chart', icon: Calendar },
  { id: 'hours', label: 'Hours', icon: Clock },
  { id: 'skills', label: 'Skills', icon: User },
]

export function Navigation() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentView = searchParams.get('view') || 'gantt'

  // Only show navigation on schedule page
  if (!pathname.includes('/schedule')) return null

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = currentView === tab.id
            
            return (
              <Link
                key={tab.id}
                href={`/schedule?view=${tab.id}`}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2',
                  isActive
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}