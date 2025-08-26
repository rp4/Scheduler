'use client'

import { Download, Brain, Home } from 'lucide-react'
import Link from 'next/link'
import { useScheduleStore } from '@/store/useScheduleStore'
import { exportToExcel } from '@/lib/excel/exporter'
import { OptimizationModal } from '@/components/features/optimization/OptimizationModal'
import { DateRangeFilter } from '@/components/features/filters/DateRangeFilter'
import { useState, useMemo } from 'react'

export function Header() {
  const [showOptimization, setShowOptimization] = useState(false)
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)
  const setSelectedTeam = useScheduleStore((state) => state.setSelectedTeam)
  const teams = useScheduleStore((state) => state.teams)
  const employees = useScheduleStore((state) => state.employees)
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const skills = useScheduleStore((state) => state.skills)
  
  const scheduleData = useMemo(() => ({
    employees,
    projects,
    assignments,
    skills,
    teams,
  }), [employees, projects, assignments, skills, teams])

  const handleExport = async () => {
    try {
      await exportToExcel(scheduleData)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export Excel file')
    }
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Home"
              >
                <Home className="w-5 h-5" />
              </Link>
              <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
                Resource Scheduler
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {/* Date Range Filter */}
              <DateRangeFilter />
              
              {/* Team Selector */}
              <div className="flex items-center gap-2">
                <label htmlFor="team-select" className="text-sm font-medium text-gray-700">
                  Team:
                </label>
                <select
                  id="team-select"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {teams.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Excel
              </button>

              {/* Optimize Button */}
              <button
                onClick={() => setShowOptimization(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Brain className="w-4 h-4" />
                Optimize Schedule
              </button>
            </div>
          </div>
        </div>
      </header>

      {showOptimization && (
        <OptimizationModal onClose={() => setShowOptimization(false)} />
      )}
    </>
  )
}