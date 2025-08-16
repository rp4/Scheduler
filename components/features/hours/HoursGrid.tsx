'use client'

import React from 'react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { useState, useMemo, useEffect, useRef } from 'react'
import { Users, Briefcase, ChevronDown, ChevronRight, Plus, Calendar } from 'lucide-react'
import { format, startOfWeek, addWeeks, startOfYear, endOfYear, endOfWeek, isWithinInterval, getMonth, getYear, addYears } from 'date-fns'
import { generateId } from '@/lib/utils'
import { Project } from '@/types/schedule'

type ViewMode = 'employee' | 'project'

export function HoursGrid() {
  const [viewMode, setViewMode] = useState<ViewMode>('employee')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [addingToRow, setAddingToRow] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
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
      console.log('  Assignment details:')
      assignments.slice(0, 3).forEach((a, i) => {
        console.log(`    ${i + 1}. Employee: "${a.employeeId}", Project: "${a.projectId}", Week: "${a.week}", Date: "${a.date}", Hours: ${a.hours} (type: ${typeof a.hours})`)
      })
      console.log('  Unique weeks in assignments:', [...new Set(assignments.map(a => a.week))])
      console.log('  Unique dates in assignments:', [...new Set(assignments.map(a => a.date).filter(Boolean))])
      console.log('  Week format expected (sample):', format(new Date(), 'MMM d').toUpperCase())
      
      // Check if any assignments have non-zero hours
      const nonZeroHours = assignments.filter(a => a.hours > 0)
      console.log(`  Assignments with hours > 0: ${nonZeroHours.length} out of ${assignments.length}`)
      if (nonZeroHours.length > 0) {
        console.log('  Sample non-zero assignment:', nonZeroHours[0])
      }
      
      // Debug: Check year in dates
      const datesWithYear = assignments.filter(a => a.date).map(a => a.date)
      if (datesWithYear.length > 0) {
        console.log('  Sample dates with year:', datesWithYear.slice(0, 3))
      }
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
  
  // Format week to yyyy-MM-dd for data lookup
  const formatWeekToDate = (date: Date) => {
    const monday = startOfWeek(date, { weekStartsOn: 1 })
    return format(monday, 'yyyy-MM-dd')
  }

  // Generate weeks for 3 years (last year, current year, next year)
  const weeks = useMemo(() => {
    const now = new Date()
    // Same logic as Gantt chart: show from start of last year to end of next year
    const rangeStart = startOfYear(addYears(now, -1))
    const rangeEnd = endOfYear(addYears(now, 1))
    const weekList: Date[] = []
    
    let currentWeek = startOfWeek(rangeStart, { weekStartsOn: 1 }) // Start on Monday
    while (currentWeek <= rangeEnd) {
      weekList.push(currentWeek)
      currentWeek = addWeeks(currentWeek, 1)
    }
    
    console.log(`📅 Displaying ${weekList.length} weeks from ${format(rangeStart, 'MMM yyyy')} to ${format(rangeEnd, 'MMM yyyy')}`)
    return weekList
  }, [])
  
  // Find the index of the current week
  const currentWeekIndex = useMemo(() => {
    const now = new Date()
    const currentMonday = startOfWeek(now, { weekStartsOn: 1 })
    return weeks.findIndex(week => 
      format(week, 'yyyy-MM-dd') === format(currentMonday, 'yyyy-MM-dd')
    )
  }, [weeks])
  
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
  
  // Determine which weeks to show (show all weeks in the 3-year range)
  const [visibleWeekRange, setVisibleWeekRange] = useState<{start: number, end: number}>({ start: 0, end: weeks.length })
  
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

  // Get or create assignment for a specific week (now using date)
  const getOrCreateAssignment = (employeeId: string, projectId: string, weekDate: Date) => {
    const dateStr = formatWeekToDate(weekDate)
    const weekStr = formatWeek(weekDate)
    
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
      
      // Check both date and week for backwards compatibility
      const dateMatch = a.date === dateStr
      const weekMatch = a.week === weekStr
      const match = dateMatch || (!a.date && weekMatch)
      
      // Debug detailed matching for first few
      if (employeeMatch && projectMatch && !match && filteredData.assignments.indexOf(a) < 3) {
        console.log(`  ⚠️ Assignment match except date:`, {
          employee: `"${employee?.name}"`,
          project: `"${project?.name}"`,
          assignmentDate: a.date,
          assignmentWeek: a.week,
          lookingForDate: dateStr,
          lookingForWeek: weekStr,
          match: match
        })
      }
      
      return employeeMatch && projectMatch && match
    })
    
    return found
  }

  const handleHoursChange = (employeeId: string, projectId: string, weekDate: Date, hours: number) => {
    const existing = getOrCreateAssignment(employeeId, projectId, weekDate)
    const dateStr = formatWeekToDate(weekDate)
    const weekStr = formatWeek(weekDate)
    
    // Get the actual employee and project to handle name vs ID
    const employee = filteredData.employees.find(e => e.id === employeeId)
    const project = filteredData.projects.find(p => p.id === projectId)
    
    if (existing) {
      if (hours === 0) {
        removeAssignment(existing.id)
      } else {
        updateAssignment(existing.id, { hours, date: dateStr })
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
        week: weekStr,
        date: dateStr,
        hours
      })
    }
  }

  const renderEmployeeView = () => {
    // Group assignments by employee and week
    const getEmployeeWeekTotal = (employeeId: string, weekDate: Date) => {
      const employee = filteredData.employees.find(e => e.id === employeeId)
      const dateStr = formatWeekToDate(weekDate)
      const weekStr = formatWeek(weekDate)
      
      return filteredData.assignments
        .filter(a => {
          const employeeMatch = a.employeeId === employeeId || a.employeeId === employee?.name
          const dateMatch = a.date === dateStr || (!a.date && a.week === weekStr)
          return employeeMatch && dateMatch
        })
        .reduce((sum, a) => sum + a.hours, 0)
    }

    return (
      <div className="overflow-x-auto" ref={tableRef}>
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
              {weeks.map((week, index) => {
                const isCurrentWeek = index === currentWeekIndex
                return (
                  <th 
                    key={week.toISOString()} 
                    className={`text-center p-1 border border-gray-200 font-normal min-w-[50px] ${
                      isCurrentWeek ? 'bg-blue-100 border-blue-300' : ''
                    }`}
                  >
                    <div className={`text-xs ${isCurrentWeek ? 'font-semibold text-blue-700' : ''}`}>
                      {format(week, 'd')}
                    </div>
                  </th>
                )
              })}
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
                    {weeks.map((week, weekIndex) => {
                      const weekTotal = getEmployeeWeekTotal(employee.id, week)
                      const isOvertime = weekTotal > employee.maxHours
                      const isCurrentWeek = weekIndex === currentWeekIndex
                      
                      return (
                        <td 
                          key={week.toISOString()} 
                          className={`p-2 border border-gray-200 text-center ${
                            isCurrentWeek ? 'border-blue-300' : ''
                          } ${
                            isOvertime ? 'bg-red-50' : weekTotal > 0 ? 'bg-green-50' : isCurrentWeek ? 'bg-blue-50' : ''
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
                    
                    // Debug first project for first employee
                    if (employee === filteredData.employees[0] && project === employeeProjects[0]) {
                      console.log('🔍 Debug assignment lookup:', {
                        employee: `${employee.name} (ID: ${employee.id})`,
                        project: `${project.name} (ID: ${project.id})`,
                        foundAssignments: projectAssignments.length,
                        assignments: projectAssignments.map(a => ({
                          week: a.week,
                          hours: a.hours
                        }))
                      })
                    }

                    return (
                      <tr key={`${employee.id}-${project.id}`} className="bg-gray-50/50">
                        <td className="pl-12 p-2 border border-gray-200 sticky left-0 bg-gray-50/50 text-gray-600 text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-gray-400">↳</span>
                            {project.name}
                          </span>
                        </td>
                        <td className="p-2 border border-gray-200"></td>
                        {weeks.map((week, weekIndex) => {
                          const assignment = getOrCreateAssignment(employee.id, project.id, week)
                          const isInRange = isWeekInProjectRange(week, project)
                          
                          // Debug specific week where we expect data
                          if (employee === filteredData.employees[0] && 
                              project === employeeProjects[0] && 
                              weekIndex >= 30 && weekIndex <= 34) {
                            console.log(`  Week ${formatWeek(week)} (${formatWeekToDate(week)}):`, {
                              hasAssignment: !!assignment,
                              hours: assignment?.hours || 0,
                              isInRange
                            })
                          }
                          
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
                                    handleHoursChange(employee.id, project.id, week, hours)
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
                                handleHoursChange(employee.id, e.target.value, weeks[0], 0)
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
    const getProjectWeekTotal = (projectId: string, weekDate: Date) => {
      const project = filteredData.projects.find(p => p.id === projectId)
      const dateStr = formatWeekToDate(weekDate)
      const weekStr = formatWeek(weekDate)
      
      return filteredData.assignments
        .filter(a => {
          const projectMatch = a.projectId === projectId || a.projectId === project?.name
          const dateMatch = a.date === dateStr || (!a.date && a.week === weekStr)
          return projectMatch && dateMatch
        })
        .reduce((sum, a) => sum + a.hours, 0)
    }

    return (
      <div className="overflow-x-auto" ref={tableRef}>
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
              {weeks.map((week, index) => {
                const isCurrentWeek = index === currentWeekIndex
                return (
                  <th 
                    key={week.toISOString()} 
                    className={`text-center p-1 border border-gray-200 font-normal min-w-[50px] ${
                      isCurrentWeek ? 'bg-blue-100 border-blue-300' : ''
                    }`}
                  >
                    <div className={`text-xs ${isCurrentWeek ? 'font-semibold text-blue-700' : ''}`}>
                      {format(week, 'd')}
                    </div>
                  </th>
                )
              })}
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
                    {weeks.map((week, weekIndex) => {
                      const weekTotal = getProjectWeekTotal(project.id, week)
                      const isCurrentWeek = weekIndex === currentWeekIndex
                      
                      return (
                        <td 
                          key={week.toISOString()} 
                          className={`p-2 border border-gray-200 text-center ${
                            isCurrentWeek ? 'border-blue-300' : ''
                          } ${
                            weekTotal > 0 ? 'bg-blue-50' : isCurrentWeek ? 'bg-blue-100' : ''
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
                          const assignment = getOrCreateAssignment(employee.id, project.id, week)
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
                                    handleHoursChange(employee.id, project.id, week, hours)
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
                                handleHoursChange(e.target.value, project.id, weeks[0], 0)
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
      {/* Debug Panel - Temporary */}
      {assignments.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
          <strong>Debug - Raw Assignment Data:</strong>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <div className="font-semibold">First 5 Assignments:</div>
              {assignments.slice(0, 5).map((a, i) => (
                <div key={i} className="mt-1 p-1 bg-white rounded border">
                  Employee: "{a.employeeId}" | Project: "{a.projectId}" | Week: "{a.week}" | Hours: {a.hours}
                </div>
              ))}
            </div>
            <div>
              <div className="font-semibold">Data Summary:</div>
              <div>Total Assignments: {assignments.length}</div>
              <div>Assignments with hours {">"} 0: {assignments.filter(a => a.hours > 0).length}</div>
              <div>Unique Weeks: {[...new Set(assignments.map(a => a.week))].join(', ')}</div>
              <div>Sample Employee IDs: {[...new Set(assignments.map(a => a.employeeId))].slice(0, 3).join(', ')}</div>
              <div>Sample Project IDs: {[...new Set(assignments.map(a => a.projectId))].slice(0, 3).join(', ')}</div>
            </div>
          </div>
        </div>
      )}
      
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
          {currentWeekIndex >= 0 && (
            <button
              onClick={() => {
                if (tableRef.current) {
                  const currentWeekElement = tableRef.current.querySelector(`th:nth-child(${currentWeekIndex + 3})`)
                  if (currentWeekElement) {
                    currentWeekElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
                  }
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Current Week
            </button>
          )}
        </div>
        
        {/* Week Information */}
        <div className="text-sm text-gray-600">
          Showing {weeks.length} weeks ({format(weeks[0], 'MMM yyyy')} - {format(weeks[weeks.length - 1], 'MMM yyyy')})
          {assignments.length > 0 && ` • ${assignments.length} assignments`}
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