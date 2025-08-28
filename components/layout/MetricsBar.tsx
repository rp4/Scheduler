'use client'

import { useScheduleStore } from '@/store/useScheduleStore'
import { calculateMetrics } from '@/lib/metrics'
import { Clock, TrendingUp, Target } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { isWithinInterval } from 'date-fns'
import { useRouter, usePathname } from 'next/navigation'

export function MetricsBar() {
  const employees = useScheduleStore((state) => state.employees)
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const dateRange = useScheduleStore((state) => state.dateRange)
  const setOvertimeSortTrigger = useScheduleStore((state) => state.setOvertimeSortTrigger)
  const setUtilizationSortTrigger = useScheduleStore((state) => state.setUtilizationSortTrigger)
  const router = useRouter()
  const pathname = usePathname()
  const [metrics, setMetrics] = useState({
    overtimeHours: 0,
    resourceUtilization: 0,
    skillsMatching: 0,
  })

  // Filter assignments based on date range
  const filteredAssignments = useMemo(() => {
    if (!dateRange) return assignments
    
    // Ensure dates are Date objects (they might be strings from localStorage)
    const filterStart = dateRange.startDate instanceof Date 
      ? dateRange.startDate 
      : new Date(dateRange.startDate)
    const filterEnd = dateRange.endDate instanceof Date
      ? dateRange.endDate
      : new Date(dateRange.endDate)
    
    return assignments.filter(assignment => {
      // Parse the week or date to a Date object
      const assignmentDate = assignment.date 
        ? new Date(assignment.date)
        : assignment.week 
          ? new Date(assignment.week)
          : null
          
      if (!assignmentDate) return true
      
      return isWithinInterval(assignmentDate, {
        start: filterStart,
        end: filterEnd
      })
    })
  }, [assignments, dateRange])

  useEffect(() => {
    const calculated = calculateMetrics(employees, projects, filteredAssignments)
    setMetrics(calculated)
  }, [employees, projects, filteredAssignments])

  const handleOvertimeClick = () => {
    // Navigate to schedule page with hours view
    if (pathname.includes('/schedule')) {
      // Already on schedule page, just change the view
      window.location.hash = 'view=hours'
    } else {
      // Navigate to schedule page with hours view
      router.push('/schedule#view=hours')
    }
    // Trigger the overtime sort in HoursGrid
    setOvertimeSortTrigger()
  }

  const handleSkillsClick = () => {
    // Navigate to schedule page with skills view and project subview
    if (pathname.includes('/schedule')) {
      // Already on schedule page, just change the view
      window.location.hash = 'view=skills&subview=project'
    } else {
      // Navigate to schedule page with skills view and project subview
      router.push('/schedule#view=skills&subview=project')
    }
  }

  const handleUtilizationClick = () => {
    // Navigate to schedule page with hours view
    if (pathname.includes('/schedule')) {
      // Already on schedule page, just change the view
      window.location.hash = 'view=hours'
    } else {
      // Navigate to schedule page with hours view
      router.push('/schedule#view=hours')
    }
    // Trigger the utilization sort in HoursGrid
    setUtilizationSortTrigger()
  }

  return (
    <div className="bg-white shadow-sm border-b border-gray-100">
      <div className="container mx-auto px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Overtime Hours */}
          <div 
            onClick={handleOvertimeClick}
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl hover-lift cursor-pointer transition-all duration-200">
            <div className="p-2.5 bg-white rounded-lg shadow-sm">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-900">
                {metrics.overtimeHours}
              </div>
              <div className="text-sm text-orange-700 font-medium">Overtime Hours</div>
            </div>
          </div>

          {/* Resource Utilization */}
          <div 
            onClick={handleUtilizationClick}
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl hover-lift cursor-pointer transition-all duration-200">
            <div className="p-2.5 bg-white rounded-lg shadow-sm">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {metrics.resourceUtilization}%
              </div>
              <div className="text-sm text-blue-700 font-medium">Resource Utilization</div>
            </div>
          </div>

          {/* Skills Matching */}
          <div 
            onClick={handleSkillsClick}
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl hover-lift cursor-pointer transition-all duration-200">
            <div className="p-2.5 bg-white rounded-lg shadow-sm">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-900">
                {metrics.skillsMatching}
              </div>
              <div className="text-sm text-green-700 font-medium">Skills Matching</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}