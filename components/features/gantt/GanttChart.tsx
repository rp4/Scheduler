'use client'

import { useScheduleStore } from '@/store/useScheduleStore'
import { useMemo, useRef, useState } from 'react'
import { format, startOfYear, endOfYear, eachMonthOfInterval, addYears, differenceInDays } from 'date-fns'

export function GanttChart() {
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const employees = useScheduleStore((state) => state.employees)
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)
  const [draggedProject, setDraggedProject] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter projects by team
  const filteredProjects = useMemo(() => {
    if (selectedTeam === 'All Teams') return projects
    
    const teamEmployeeIds = employees
      .filter(e => e.team === selectedTeam)
      .map(e => e.id)
    
    const projectIds = new Set(
      assignments
        .filter(a => teamEmployeeIds.includes(a.employeeId))
        .map(a => a.projectId)
    )
    
    return projects.filter(p => projectIds.has(p.id))
  }, [projects, assignments, employees, selectedTeam])

  // Calculate timeline range
  const timelineRange = useMemo(() => {
    const now = new Date()
    const start = startOfYear(addYears(now, -1))
    const end = endOfYear(addYears(now, 1))
    const months = eachMonthOfInterval({ start, end })
    return { start, end, months }
  }, [])

  const calculatePosition = (date: Date) => {
    const totalDays = differenceInDays(timelineRange.end, timelineRange.start)
    const dayOffset = differenceInDays(date, timelineRange.start)
    return (dayOffset / totalDays) * 100
  }

  const handleDragStart = (projectId: string) => {
    setDraggedProject(projectId)
  }

  const handleDragEnd = () => {
    setDraggedProject(null)
    // Here you would update the project dates
  }

  if (filteredProjects.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No projects to display. Upload an Excel file or load sample data to get started.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto" ref={containerRef}>
      <div className="min-w-[1200px]">
        {/* Timeline Header */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-48 px-4 py-2 font-semibold border-r border-gray-200">
            Project
          </div>
          <div className="flex-1 relative">
            {/* Months */}
            <div className="flex">
              {timelineRange.months.map((month, idx) => (
                <div
                  key={idx}
                  className="flex-1 px-2 py-1 text-xs text-center border-r border-gray-200"
                  style={{ minWidth: '60px' }}
                >
                  {format(month, 'MMM yyyy')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project Rows */}
        {filteredProjects.map((project) => {
          const startPos = calculatePosition(project.startDate)
          const endPos = calculatePosition(project.endDate)
          const width = endPos - startPos

          return (
            <div key={project.id} className="flex border-b border-gray-200 hover:bg-gray-50">
              <div className="w-48 px-4 py-3 font-medium border-r border-gray-200 truncate">
                {project.name}
              </div>
              <div className="flex-1 relative h-12">
                <div
                  className={`absolute top-2 h-8 bg-blue-500 hover:bg-blue-600 rounded cursor-move transition-colors ${
                    draggedProject === project.id ? 'opacity-50' : ''
                  }`}
                  style={{
                    left: `${startPos}%`,
                    width: `${width}%`,
                  }}
                  draggable
                  onDragStart={() => handleDragStart(project.id)}
                  onDragEnd={handleDragEnd}
                  title={`${project.name}: ${format(project.startDate, 'MMM d, yyyy')} - ${format(
                    project.endDate,
                    'MMM d, yyyy'
                  )}`}
                >
                  <div className="px-2 text-xs text-white truncate leading-8">
                    {project.name}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Today Line */}
        <div
          className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-10"
          style={{
            left: `calc(192px + ${calculatePosition(new Date())}% * (100% - 192px) / 100)`,
          }}
        >
          <div className="absolute -top-2 -left-8 bg-red-500 text-white text-xs px-2 py-1 rounded">
            Today
          </div>
        </div>
      </div>
    </div>
  )
}