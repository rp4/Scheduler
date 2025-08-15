'use client'

import React from 'react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { useState, useMemo } from 'react'
import { Users, Briefcase, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { format, startOfWeek, addWeeks, startOfYear, endOfYear, endOfWeek, isWithinInterval, getMonth, getYear } from 'date-fns'
import { generateId } from '@/lib/utils'
import { Project } from '@/types/schedule'

type ViewMode = 'employee' | 'project'

export function HoursGrid() {
  const [viewMode, setViewMode] = useState<ViewMode>('employee')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [addingToRow, setAddingToRow] = useState<string | null>(null)
  const employees = useScheduleStore((state) => state.employees)
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)
  
  // Debug logging
  useMemo(() => {
    if (assignments.length > 0) {
      console.log('🔍 HoursGrid Debug:')
      console.log('  Total assignments:', assignments.length)
      console.log('  Sample assignment:', assignments[0])
      console.log('  Unique weeks in assignments:', [...new Set(assignments.map(a => a.week))])
      console.log('  Week format expected (sample):', format(new Date(), 'MMM d').toUpperCase())
    }
    return null
  }, [assignments])
  const updateAssignment = useScheduleStore((state) => state.updateAssignment)
  const addAssignment = useScheduleStore((state) => state.addAssignment)
  const removeAssignment = useScheduleStore((state) => state.removeAssignment)

  // Format week for display and storage
  const formatWeek = (date: Date) => {
    return format(date, 'MMM d').toUpperCase()
  }

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
  
  // Get month groups for header spanning
  const monthGroups = useMemo(() => {
    const groups: { month: string; year: number; count: number; startIndex: number }[] = []
    let currentMonth = -1
    let currentYear = -1
    let count = 0
    let startIndex = 0
    
    weeks.forEach((week, index) => {
      const month = getMonth(week)
      const year = getYear(week)
      
      if (month !== currentMonth || year !== currentYear) {
        if (count > 0) {
          groups.push({
            month: format(weeks[startIndex], 'MMMM'),
            year: currentYear,
            count,
            startIndex
          })
        }
        currentMonth = month
        currentYear = year
        count = 1
        startIndex = index
      } else {
        count++
      }
    })
    
    // Add the last group
    if (count > 0) {
      groups.push({
        month: format(weeks[startIndex], 'MMMM'),
        year: currentYear,
        count,
        startIndex
      })
    }
    
    return groups
  }, [weeks])
  
  // Determine which weeks to show (show all for now, can be filtered later)
  const [visibleWeekRange, setVisibleWeekRange] = useState<{start: number, end: number}>({ start: 0, end: 52 })
  
  // Auto-detect weeks with data and adjust visible range
  useMemo(() => {
    if (assignments.length > 0) {
      // Find the earliest and latest weeks with assignments
      const weeksWithData = assignments.map(a => a.week)
      const weekIndices = weeks.map((week, index) => ({
        week: formatWeek(week),
        index
      })).filter(w => weeksWithData.includes(w.week))
      
      if (weekIndices.length > 0) {
        const minIndex = Math.max(0, Math.min(...weekIndices.map(w => w.index)) - 2)
        const maxIndex = Math.min(weeks.length - 1, Math.max(...weekIndices.map(w => w.index)) + 2)
        console.log(`📍 Found data in weeks ${minIndex} to ${maxIndex} (weeks: ${formatWeek(weeks[minIndex])} - ${formatWeek(weeks[maxIndex])})`)
        // For now, still show all weeks but this helps us understand where the data is
      }
    }
  }, [assignments, weeks])

  // Check if a week falls within project date range
  const isWeekInProjectRange = (weekDate: Date, project: Project) => {
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 })
    return isWithinInterval(weekDate, { start: project.startDate, end: project.endDate }) ||
           isWithinInterval(weekEnd, { start: project.startDate, end: project.endDate }) ||
           (weekDate <= project.startDate && weekEnd >= project.endDate)
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
    // Try to find by ID first, then by name
    const employee = filteredData.employees.find(e => e.id === employeeId)
    const project = filteredData.projects.find(p => p.id === projectId)
    
    const found = filteredData.assignments.find(a => {
      const employeeMatch = a.employeeId === employeeId || 
                           a.employeeId === employee?.name ||
                           (employee && a.employeeId === employee.name)
      const projectMatch = a.projectId === projectId || 
                          a.projectId === project?.name ||
                          (project && a.projectId === project.name)
      return employeeMatch && projectMatch && a.week === week
    })
    
    // Debug: Log when we're looking for an assignment
    if (!found && filteredData.assignments.length > 0) {
      const projectAssignments = filteredData.assignments.filter(a => {
        const employeeMatch = a.employeeId === employeeId || 
                             a.employeeId === employee?.name
        const projectMatch = a.projectId === projectId || 
                            a.projectId === project?.name
        return employeeMatch && projectMatch
      })
      if (projectAssignments.length > 0) {
        console.log(`  🔍 Looking for week "${week}" but found:`, projectAssignments.map(a => a.week))
      }
    }
    
    return found
  }

  const handleHoursChange = (employeeId: string, projectId: string, week: string, hours: number) => {
    const existing = getOrCreateAssignment(employeeId, projectId, week)
    
    // Get the actual employee and project to handle name vs ID
    const employee = filteredData.employees.find(e => e.id === employeeId)
    const project = filteredData.projects.find(p => p.id === projectId)
    
    if (existing) {
      if (hours === 0) {
        removeAssignment(existing.id)
      } else {
        updateAssignment(existing.id, { hours })
      }
    } else if (hours > 0) {
      // Use the name if that's what's being used in assignments, otherwise use ID
      const firstAssignment = filteredData.assignments[0]
      const useNames = firstAssignment && 
                       (firstAssignment.employeeId === employee?.name || 
                        firstAssignment.projectId === project?.name)
      
      addAssignment({
        id: generateId(),
        employeeId: useNames ? (employee?.name || employeeId) : employeeId,
        projectId: useNames ? (project?.name || projectId) : projectId,
        week,
        hours
      })
    }
  }

  const renderEmployeeView = () => {
    // Group assignments by employee and week
    const getEmployeeWeekTotal = (employeeId: string, week: string) => {
      const employee = filteredData.employees.find(e => e.id === employeeId)
      return filteredData.assignments
        .filter(a => (a.employeeId === employeeId || a.employeeId === employee?.name) && a.week === week)
        .reduce((sum, a) => sum + a.hours, 0)
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {/* Month/Year header row */}
            <tr className="bg-gray-100">
              <th className="text-left p-2 border border-gray-200 font-semibold sticky left-0 bg-gray-100 z-10" rowSpan={2}>
                Employee
              </th>
              <th className="text-left p-2 border border-gray-200 font-semibold" rowSpan={2}>
                Team
              </th>
              {monthGroups.map((group, idx) => (
                <th 
                  key={idx} 
                  colSpan={group.count}
                  className="text-center p-1 border border-gray-200 font-semibold bg-gray-100 text-sm"
                >
                  {group.month} {group.year}
                </th>
              ))}
              <th className="text-center p-2 border border-gray-200 font-semibold bg-blue-50" rowSpan={2}>
                Total
              </th>
            </tr>
            {/* Day header row */}
            <tr className="bg-gray-50">
              {weeks.map((week) => (
                <th key={week.toISOString()} className="text-center p-1 border border-gray-200 font-normal min-w-[50px]">
                  <div className="text-xs">{format(week, 'd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.employees.map(employee => {
              const totalHours = filteredData.assignments
                .filter(a => a.employeeId === employee.id || a.employeeId === employee.name)
                .reduce((sum, a) => sum + a.hours, 0)
              
              const isExpanded = expandedRows.has(employee.id)
              
              // Get projects this employee is assigned to
              const employeeProjects = filteredData.projects.filter(project => {
                const hasAssignment = filteredData.assignments.some(a => 
                  (a.employeeId === employee.id || a.employeeId === employee.name) && 
                  (a.projectId === project.id || a.projectId === project.name)
                )
                
                // Debug logging for first employee
                if (employee === filteredData.employees[0] && filteredData.assignments.length > 0) {
                  console.log(`🔍 Checking projects for ${employee.name} (ID: ${employee.id}):`)
                  console.log('  Sample assignment:', filteredData.assignments[0])
                  console.log('  Looking for assignments with:', {
                    employeeId: employee.id,
                    employeeName: employee.name,
                    projectId: project.id,
                    projectName: project.name
                  })
                  console.log('  Found match:', hasAssignment)
                }
                
                return hasAssignment
              })

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
                    {weeks.map((week) => {
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
                      a => (a.employeeId === employee.id || a.employeeId === employee.name) && 
                           (a.projectId === project.id || a.projectId === project.name)
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
                        {weeks.map((week) => {
                          const weekStr = formatWeek(week)
                          const assignment = getOrCreateAssignment(employee.id, project.id, weekStr)
                          const isInRange = isWeekInProjectRange(week, project)
                          
                          return (
                            <td key={week.toISOString()} className={`p-1 border border-gray-200 text-center ${isInRange ? 'bg-white' : 'bg-gray-50'}`}>
                              {isInRange ? (
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
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="p-2 border border-gray-200 text-center text-sm text-gray-600">
                          {projectAssignments.reduce((sum, a) => sum + a.hours, 0)}
                        </td>
                      </tr>
                    )
                  })}
                  
                  {/* Add Project row */}
                  {isExpanded && (
                    <tr className="bg-blue-50/30">
                      <td className="pl-12 p-2 border border-gray-200 sticky left-0 bg-blue-50/30 text-sm">
                        {addingToRow === employee.id ? (
                          <select
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => {
                              if (e.target.value) {
                                // Create initial assignment for first week
                                const firstWeek = formatWeek(weeks[0])
                                handleHoursChange(employee.id, e.target.value, firstWeek, 0)
                                setAddingToRow(null)
                                // Keep row expanded to show the new project
                              }
                            }}
                            onBlur={() => setAddingToRow(null)}
                            autoFocus
                          >
                            <option value="">Select a project...</option>
                            {filteredData.projects
                              .filter(p => !employeeProjects.some(ep => ep.id === p.id))
                              .map(project => (
                                <option key={project.id} value={project.id}>
                                  {project.name}
                                </option>
                              ))
                            }
                          </select>
                        ) : (
                          <button
                            onClick={() => setAddingToRow(employee.id)}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Add Project
                          </button>
                        )}
                      </td>
                      <td className="p-2 border border-gray-200" colSpan={weeks.length + 2}></td>
                    </tr>
                  )}
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
      const project = filteredData.projects.find(p => p.id === projectId)
      return filteredData.assignments
        .filter(a => (a.projectId === projectId || a.projectId === project?.name) && a.week === week)
        .reduce((sum, a) => sum + a.hours, 0)
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {/* Month/Year header row */}
            <tr className="bg-gray-100">
              <th className="text-left p-2 border border-gray-200 font-semibold sticky left-0 bg-gray-100 z-10" rowSpan={2}>
                Project
              </th>
              {monthGroups.map((group, idx) => (
                <th 
                  key={idx} 
                  colSpan={group.count}
                  className="text-center p-1 border border-gray-200 font-semibold bg-gray-100 text-sm"
                >
                  {group.month} {group.year}
                </th>
              ))}
              <th className="text-center p-2 border border-gray-200 font-semibold bg-blue-50" rowSpan={2}>
                Total
              </th>
            </tr>
            {/* Day header row */}
            <tr className="bg-gray-50">
              {weeks.map((week) => (
                <th key={week.toISOString()} className="text-center p-1 border border-gray-200 font-normal min-w-[50px]">
                  <div className="text-xs">{format(week, 'd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.projects.map(project => {
              const totalHours = filteredData.assignments
                .filter(a => a.projectId === project.id || a.projectId === project.name)
                .reduce((sum, a) => sum + a.hours, 0)
              
              const isExpanded = expandedRows.has(project.id)
              
              // Get employees assigned to this project
              const projectEmployees = filteredData.employees.filter(employee => 
                filteredData.assignments.some(a => 
                  (a.employeeId === employee.id || a.employeeId === employee.name) && 
                  (a.projectId === project.id || a.projectId === project.name)
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
                    {weeks.map((week) => {
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
                      a => (a.employeeId === employee.id || a.employeeId === employee.name) && 
                           (a.projectId === project.id || a.projectId === project.name)
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
                        {weeks.map((week) => {
                          const weekStr = formatWeek(week)
                          const assignment = getOrCreateAssignment(employee.id, project.id, weekStr)
                          const isInRange = isWeekInProjectRange(week, project)
                          
                          return (
                            <td key={week.toISOString()} className={`p-1 border border-gray-200 text-center ${isInRange ? 'bg-white' : 'bg-gray-50'}`}>
                              {isInRange ? (
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
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="p-2 border border-gray-200 text-center text-sm text-gray-600">
                          {employeeAssignments.reduce((sum, a) => sum + a.hours, 0)}
                        </td>
                      </tr>
                    )
                  })}
                  
                  {/* Add Employee row */}
                  {isExpanded && (
                    <tr className="bg-blue-50/30">
                      <td className="pl-12 p-2 border border-gray-200 sticky left-0 bg-blue-50/30 text-sm">
                        {addingToRow === project.id ? (
                          <select
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => {
                              if (e.target.value) {
                                // Create initial assignment for first week
                                const firstWeek = formatWeek(weeks[0])
                                handleHoursChange(e.target.value, project.id, firstWeek, 0)
                                setAddingToRow(null)
                                // Keep row expanded to show the new employee
                              }
                            }}
                            onBlur={() => setAddingToRow(null)}
                            autoFocus
                          >
                            <option value="">Select an employee...</option>
                            {filteredData.employees
                              .filter(e => !projectEmployees.some(pe => pe.id === e.id))
                              .map(employee => (
                                <option key={employee.id} value={employee.id}>
                                  {employee.name} ({employee.team})
                                </option>
                              ))
                            }
                          </select>
                        ) : (
                          <button
                            onClick={() => setAddingToRow(project.id)}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Add Employee
                          </button>
                        )}
                      </td>
                      <td className="p-2 border border-gray-200" colSpan={weeks.length + 1}></td>
                    </tr>
                  )}
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
      {/* View Toggle and Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
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
        
        {/* Week Information */}
        <div className="text-sm text-gray-600">
          Showing all {weeks.length} weeks of {new Date().getFullYear()} 
          {assignments.length > 0 && ` (${assignments.length} assignments)`}
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
        <strong>Tips:</strong> Click on a row to expand and see detailed allocations. 
        Enter hours directly in the cells. Red highlights indicate overtime (&gt;40 hours/week).
        Scroll horizontally to see all weeks of the year.
        {viewMode === 'employee' ? ' View shows each employee\'s project assignments per week.' : ' View shows each project\'s team allocations per week.'}
      </div>

      {/* Grid */}
      {viewMode === 'employee' ? renderEmployeeView() : renderProjectView()}
    </div>
  )
}