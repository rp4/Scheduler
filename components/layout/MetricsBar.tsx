'use client'

import { useScheduleStore } from '@/store/useScheduleStore'
import { calculateMetrics } from '@/lib/metrics'
import { Clock, TrendingUp, Target } from 'lucide-react'
import { useEffect, useState } from 'react'

export function MetricsBar() {
  const employees = useScheduleStore((state) => state.employees)
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const [metrics, setMetrics] = useState({
    overtimeHours: 0,
    resourceUtilization: 0,
    skillsMatching: 0,
  })

  useEffect(() => {
    const calculated = calculateMetrics(employees, projects, assignments)
    setMetrics(calculated)
  }, [employees, projects, assignments])

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Overtime Hours */}
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-900">
                {metrics.overtimeHours}
              </div>
              <div className="text-sm text-orange-700">Overtime Hours</div>
            </div>
          </div>

          {/* Resource Utilization */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {metrics.resourceUtilization}%
              </div>
              <div className="text-sm text-blue-700">Resource Utilization</div>
            </div>
          </div>

          {/* Skills Matching */}
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-900">
                {metrics.skillsMatching}
              </div>
              <div className="text-sm text-green-700">Skills Matching</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}