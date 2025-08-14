'use client'

import React from 'react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { useState, useMemo } from 'react'
import { Users, Briefcase, ChevronDown, ChevronRight } from 'lucide-react'
import { format, startOfWeek, addWeeks, startOfYear, endOfYear } from 'date-fns'
import { generateId } from '@/lib/utils'

type ViewMode = 'employee' | 'project'

export function HoursGrid() {
  const [viewMode, setViewMode] = useState<ViewMode>('employee')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const employees = useScheduleStore((state) => state.employees)
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)
  const updateAssignment = useScheduleStore((state) => state.updateAssignment)
  const addAssignment = useScheduleStore((state) => state.addAssignment)
  const removeAssignment = useScheduleStore((state) => state.removeAssignment)

  // Generate weeks for the current year
  const weeks = useMemo(() => {
    const now = new Date()
    const yearStart = startOfYear(now)
    const yearEnd = endOfYear(now)
    const weekList: Date[] = []
    
    let currentWeek = startOfWeek(yearStart, { weekStartsOn: 1 }) // Start on Monday
    while (currentWeek <= yearEnd) {
      weekList.push(currentWeek)
      currentWeek = addWeeks(currentWeek, 1)
    }
    
    return weekList
  }, [])

  // Format week for display and storage
  const formatWeek = (date: Date) => {
    return format(date, 'MMM d').toUpperCase()
  }

  // Toggle row expansion
  const toggleExpanded = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Filter data by team
  const filteredData = useMemo(() => {
    if (selectedTeam === 'All Teams') {
      return { employees, projects, assignments }
    }

    const teamEmployees = employees.filter(e => e.team === selectedTeam)
    const teamEmployeeIds = teamEmployees.map(e => e.id)
    const teamAssignments = assignments.filter(a => teamEmployeeIds.includes(a.employeeId))
    const teamProjectIds = new Set(teamAssignments.map(a => a.projectId))
    const teamProjects = projects.filter(p => teamProjectIds.has(p.id))

    return {
      employees: teamEmployees,
      projects: teamProjects,
      assignments: teamAssignments,
    }
  }, [employees, projects, assignments, selectedTeam])

  // Get or create assignment for a specific week
  const getOrCreateAssignment = (employeeId: string, projectId: string, week: string) => {
    return filteredData.assignments.find(
      a => a.employeeId === employeeId && a.projectId === projectId && a.week === week
    )
  }

  const handleHoursChange = (employeeId: string, projectId: string, week: string, hours: number) => {
    const existing = getOrCreateAssignment(employeeId, projectId, week)
    
    if (existing) {
      if (hours === 0) {
        removeAssignment(existing.id)
      } else {
        updateAssignment(existing.id, { hours })
      }
    } else if (hours > 0) {
      addAssignment({
        id: generateId(),
        employeeId,
        projectId,
        week,
        hours
      })
    }
  }

  const renderEmployeeView = () => {
    // Group assignments by employee and week
    const getEmployeeWeekTotal = (employeeId: string, week: string) => {
      return filteredData.assignments
        .filter(a => a.employeeId === employeeId && a.week === week)
        .reduce((sum, a) => sum + a.hours, 0)
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border border-gray-200 font-semibold sticky left-0 bg-gray-50 z-10 min-w-[250px]">
                Employee
              </th>
              <th className="text-left p-3 border border-gray-200 font-semibold min-w-[100px]">
                Team
              </th>
              {weeks.slice(0, 12).map((week) => (
                <th key={week.toISOString()} className="text-center p-2 border border-gray-200 font-semibold min-w-[80px]">
                  <div className="text-xs">{formatWeek(week)}</div>
                </th>
              ))}
              <th className="text-center p-3 border border-gray-200 font-semibold bg-blue-50 min-w-[80px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.employees.map(employee => {
              const totalHours = filteredData.assignments
                .filter(a => a.employeeId === employee.id)
                .reduce((sum, a) => sum + a.hours, 0)
              
              const isExpanded = expandedRows.has(employee.id)
              
              // Get projects this employee is assigned to
              const employeeProjects = filteredData.projects.filter(project => 
                filteredData.assignments.some(a => 
                  a.employeeId === employee.id && a.projectId === project.id
                )
              )

              return (
                <React.Fragment key={employee.id}>
                  {/* Main employee row */}
                  <tr className="hover:bg-gray-50 font-medium group">
                    <td className="p-3 border border-gray-200 sticky left-0 bg-white">
                      <button
                        onClick={() => toggleExpanded(employee.id)}
                        className="flex items-center gap-2 w-full text-left hover:text-blue-600"
                      >
                        {employeeProjects.length > 0 && (
                          isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                        {employeeProjects.length === 0 && <span className="w-4" />}
                        {employee.name}
                        {employeeProjects.length > 0 && (
                          <span className="text-xs text-gray-500 ml-1">({employeeProjects.length} projects)</span>
                        )}
                      </button>
                    </td>
                    <td className="p-3 border border-gray-200 text-sm text-gray-600">
                      {employee.team}
                    </td>
                    {weeks.slice(0, 12).map((week) => {
                      const weekStr = formatWeek(week)
                      const weekTotal = getEmployeeWeekTotal(employee.id, weekStr)
                      const isOvertime = weekTotal > employee.maxHours
                      
                      return (
                        <td 
                          key={week.toISOString()} 
                          className={`p-2 border border-gray-200 text-center ${
                            isOvertime ? 'bg-red-50' : weekTotal > 0 ? 'bg-green-50' : ''
                          }`}
                        >
                          <div className={`font-semibold ${isOvertime ? 'text-red-600' : ''}`}>
                            {weekTotal || '-'}
                          </div>
                        </td>
                      )
                    })}
                    <td className="p-3 border border-gray-200 text-center font-semibold bg-blue-50">
                      {totalHours}
                    </td>
                  </tr>
                  
                  {/* Expandable project rows for this employee */}
                  {isExpanded && employeeProjects.map(project => {
                    const projectAssignments = filteredData.assignments.filter(
                      a => a.employeeId === employee.id && a.projectId === project.id
                    )

                    return (
                      <tr key={`${employee.id}-${project.id}`} className="bg-gray-50/50">
                        <td className="pl-12 p-2 border border-gray-200 sticky left-0 bg-gray-50/50 text-gray-600 text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-gray-400">↳</span>
                            {project.name}
                          </span>
                        </td>
                        <td className="p-2 border border-gray-200"></td>
                        {weeks.slice(0, 12).map((week) => {
                          const weekStr = formatWeek(week)
                          const assignment = getOrCreateAssignment(employee.id, project.id, weekStr)
                          
                          return (
                            <td key={week.toISOString()} className="p-1 border border-gray-200 text-center">
                              <input
                                type="number"
                                min="0"
                                max="168"
                                value={assignment?.hours || ''}
                                onChange={(e) => {
                                  const hours = parseInt(e.target.value) || 0
                                  handleHoursChange(employee.id, project.id, weekStr, hours)
                                }}
                                placeholder="-"
                                className="w-14 px-1 py-0.5 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                          )
                        })}
                        <td className="p-2 border border-gray-200 text-center text-sm text-gray-600">
                          {projectAssignments.reduce((sum, a) => sum + a.hours, 0)}
                        </td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const renderProjectView = () => {
    // Group assignments by project and week
    const getProjectWeekTotal = (projectId: string, week: string) => {
      return filteredData.assignments
        .filter(a => a.projectId === projectId && a.week === week)
        .reduce((sum, a) => sum + a.hours, 0)
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border border-gray-200 font-semibold sticky left-0 bg-gray-50 z-10 min-w-[250px]">
                Project
              </th>
              {weeks.slice(0, 12).map((week) => (
                <th key={week.toISOString()} className="text-center p-2 border border-gray-200 font-semibold min-w-[80px]">
                  <div className="text-xs">{formatWeek(week)}</div>
                </th>
              ))}
              <th className="text-center p-3 border border-gray-200 font-semibold bg-blue-50 min-w-[80px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.projects.map(project => {
              const totalHours = filteredData.assignments
                .filter(a => a.projectId === project.id)
                .reduce((sum, a) => sum + a.hours, 0)
              
              const isExpanded = expandedRows.has(project.id)
              
              // Get employees assigned to this project
              const projectEmployees = filteredData.employees.filter(employee => 
                filteredData.assignments.some(a => 
                  a.employeeId === employee.id && a.projectId === project.id
                )
              )

              return (
                <React.Fragment key={project.id}>
                  {/* Main project row */}
                  <tr className="hover:bg-gray-50 font-medium group">
                    <td className="p-3 border border-gray-200 sticky left-0 bg-white">
                      <button
                        onClick={() => toggleExpanded(project.id)}
                        className="flex items-center gap-2 w-full text-left hover:text-blue-600"
                      >
                        {projectEmployees.length > 0 && (
                          isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                        {projectEmployees.length === 0 && <span className="w-4" />}
                        {project.name}
                        {projectEmployees.length > 0 && (
                          <span className="text-xs text-gray-500 ml-1">({projectEmployees.length} people)</span>
                        )}
                      </button>
                    </td>
                    {weeks.slice(0, 12).map((week) => {
                      const weekStr = formatWeek(week)
                      const weekTotal = getProjectWeekTotal(project.id, weekStr)
                      
                      return (
                        <td 
                          key={week.toISOString()} 
                          className={`p-2 border border-gray-200 text-center ${
                            weekTotal > 0 ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="font-semibold">
                            {weekTotal || '-'}
                          </div>
                        </td>
                      )
                    })}
                    <td className="p-3 border border-gray-200 text-center font-semibold bg-blue-50">
                      {totalHours}
                    </td>
                  </tr>
                  
                  {/* Expandable employee rows for this project */}
                  {isExpanded && projectEmployees.map(employee => {
                    const employeeAssignments = filteredData.assignments.filter(
                      a => a.employeeId === employee.id && a.projectId === project.id
                    )

                    return (
                      <tr key={`${project.id}-${employee.id}`} className="bg-gray-50/50">
                        <td className="pl-12 p-2 border border-gray-200 sticky left-0 bg-gray-50/50 text-gray-600 text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-gray-400">↳</span>
                            {employee.name}
                            <span className="text-xs text-gray-500">({employee.team})</span>
                          </span>
                        </td>
                        {weeks.slice(0, 12).map((week) => {
                          const weekStr = formatWeek(week)
                          const assignment = getOrCreateAssignment(employee.id, project.id, weekStr)
                          
                          return (
                            <td key={week.toISOString()} className="p-1 border border-gray-200 text-center">
                              <input
                                type="number"
                                min="0"
                                max="168"
                                value={assignment?.hours || ''}
                                onChange={(e) => {
                                  const hours = parseInt(e.target.value) || 0
                                  handleHoursChange(employee.id, project.id, weekStr, hours)
                                }}
                                placeholder="-"
                                className="w-14 px-1 py-0.5 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                          )
                        })}
                        <td className="p-2 border border-gray-200 text-center text-sm text-gray-600">
                          {employeeAssignments.reduce((sum, a) => sum + a.hours, 0)}
                        </td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  if (filteredData.employees.length === 0 || filteredData.projects.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No data to display. Upload an Excel file or load sample data to get started.
      </div>
    )
  }

  return (
    <div>
      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('employee')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'employee'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          By Employee
        </button>
        <button
          onClick={() => setViewMode('project')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'project'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          By Project
        </button>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
        <strong>Tips:</strong> Click on a row to expand and see detailed allocations. 
        Enter hours directly in the cells. Red highlights indicate overtime (&gt;40 hours/week).
        {viewMode === 'employee' ? ' View shows each employee\'s project assignments per week.' : ' View shows each project\'s team allocations per week.'}
      </div>

      {/* Grid */}
      {viewMode === 'employee' ? renderEmployeeView() : renderProjectView()}
    </div>
  )
}