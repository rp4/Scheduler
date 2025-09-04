'use client'

import { Download, Brain, Home } from 'lucide-react'
import Link from 'next/link'
import { useScheduleStore } from '@/store/useScheduleStore'
import { exportToExcel } from '@/lib/excel/exporter'
import { OptimizationModal } from '@/components/features/optimization/OptimizationModal'
import { useState, useMemo } from 'react'
import { showToast } from '@/components/ui/Toast'

export function Header() {
  const [showOptimization, setShowOptimization] = useState(false)
  const employees = useScheduleStore((state) => state.employees)
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const skills = useScheduleStore((state) => state.skills)
  const teams = useScheduleStore((state) => state.teams)
  
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
    } catch {
      showToast('error', 'Export failed', 'Unable to export Excel file. Please try again.')
    }
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link 
                href="/" 
                className="btn-icon"
                title="Home"
              >
                <Home className="w-5 h-5" />
              </Link>
              <Link href="/" className="text-heading hover:text-blue-600 transition-colors">
                Resource Scheduler
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {/* Optimize Button */}
              <button
                onClick={() => setShowOptimization(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                Optimize Schedule
              </button>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="btn-primary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Excel
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