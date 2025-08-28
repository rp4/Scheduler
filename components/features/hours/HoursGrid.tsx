'use client'

import React from 'react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { useState, useMemo, useEffect, useRef } from 'react'
import { Users, Briefcase, ChevronDown, ChevronRight, Plus, ArrowRight } from 'lucide-react'
import { format, startOfWeek, addWeeks, startOfYear, endOfYear, endOfWeek, getMonth, getYear } from 'date-fns'
import { generateId } from '@/lib/utils'
import { Project } from '@/types/schedule'

type ViewMode = 'employee' | 'project'

export function HoursGrid() {
  const [viewMode, setViewMode] = useState<ViewMode>('employee')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [addingToRow, setAddingToRow] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const hasScrolledToCurrentWeek = useRef(false)
  const employees = useScheduleStore((state) => state.employees)
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)
  const dateRangeFilter = useScheduleStore((state) => state.dateRange)
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

  // Generate weeks based on date range filter or project dates
  const weeks = useMemo(() => {
    let rangeStart: Date
    let rangeEnd: Date
    
    console.log('📅 Week generation starting...')
    console.log('  dateRangeFilter exists?', !!dateRangeFilter)
    console.log('  projects.length:', projects.length)
    
    if (dateRangeFilter) {
      console.log('  Using dateRangeFilter:', dateRangeFilter.startDate, '-', dateRangeFilter.endDate)
      
      // Parse dates properly to avoid timezone issues
      const parseFilterDate = (dateValue: any): Date => {
        if (dateValue instanceof Date) {
          // Check if the date appears to have timezone corruption
          // (e.g., shows as 19:00 the day before when it should be midnight)
          const hours = dateValue.getHours()
          if (hours === 19 || hours === 18) {
            // This is likely a UTC date that was meant to be local midnight
            // Add hours to get to the next day's midnight
            const corrected = new Date(dateValue)
            corrected.setHours(corrected.getHours() + (24 - hours))
            return corrected
          }
          return dateValue
        }
        const dateStr = String(dateValue)
        // For YYYY-MM-DD format, parse as local date not UTC
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateStr.split('-').map(Number)
          return new Date(year, month - 1, day) // month is 0-indexed
        }
        return new Date(dateValue)
      }
      
      const start = parseFilterDate(dateRangeFilter.startDate)
      const end = parseFilterDate(dateRangeFilter.endDate)
      
      // Check if the earliest date is a Monday
      const startDay = start.getDay()
      if (startDay === 1) {
        // If it starts on Monday, use that Monday directly
        rangeStart = start
      } else {
        rangeStart = startOfWeek(start, { weekStartsOn: 1 })
      }
      rangeEnd = endOfWeek(end, { weekStartsOn: 1 })
    } else if (projects.length > 0) {
      console.log('  Using project dates to determine range')
      
      // Helper to parse dates consistently
      const parseProjectDate = (dateValue: any): Date => {
        if (dateValue instanceof Date) {
          return dateValue
        }
        const dateStr = String(dateValue)
        // For YYYY-MM-DD format, parse as local date not UTC
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateStr.split('-').map(Number)
          return new Date(year, month - 1, day) // month is 0-indexed
        }
        return new Date(dateValue)
      }
      
      console.log('  First project:', projects[0].name)
      console.log('    Raw startDate:', projects[0].startDate, `(type: ${typeof projects[0].startDate})`)
      console.log('    Raw endDate:', projects[0].endDate, `(type: ${typeof projects[0].endDate})`)
      
      // Use actual project dates for default range
      let earliestStart = parseProjectDate(projects[0].startDate)
      let latestEnd = parseProjectDate(projects[0].endDate)
      
      console.log('    Parsed start:', format(earliestStart, 'yyyy-MM-dd EEEE'))
      console.log('    Parsed end:', format(latestEnd, 'yyyy-MM-dd EEEE'))
      
      projects.forEach((project) => {
        const projectStart = parseProjectDate(project.startDate)
        const projectEnd = parseProjectDate(project.endDate)
        
        if (projectStart < earliestStart) {
          earliestStart = projectStart
        }
        if (projectEnd > latestEnd) {
          latestEnd = projectEnd
        }
      })
      
      // Special handling: if earliest project starts on a Monday, 
      // start from that Monday, not the previous one
      const startDay = earliestStart.getDay()
      
      if (startDay === 1) {
        rangeStart = earliestStart // Use the Monday directly
      } else {
        rangeStart = startOfWeek(earliestStart, { weekStartsOn: 1 })
      }
      rangeEnd = endOfWeek(latestEnd, { weekStartsOn: 1 })
    } else {
      // Fallback to current year if no projects
      const now = new Date()
      rangeStart = startOfYear(now)
      rangeEnd = endOfYear(now)
    }
    
    const weekList: Date[] = []
    let currentWeek = startOfWeek(rangeStart, { weekStartsOn: 1 }) // Start on Monday
    
    console.log('  Final range:', format(rangeStart, 'yyyy-MM-dd'), 'to', format(rangeEnd, 'yyyy-MM-dd'))
    console.log('  Starting week generation from:', format(currentWeek, 'yyyy-MM-dd'))
    
    while (currentWeek <= rangeEnd) {
      weekList.push(currentWeek)
      currentWeek = addWeeks(currentWeek, 1)
    }
    
    console.log('  Generated', weekList.length, 'weeks')
    if (weekList.length > 0) {
      console.log('  First 3 weeks:', weekList.slice(0, 3).map(w => format(w, 'yyyy-MM-dd')).join(', '))
    }
    
    return weekList
  }, [dateRangeFilter, projects])
  
  // Find the index of the current week
  const currentWeekIndex = useMemo(() => {
    const now = new Date()
    const currentMonday = startOfWeek(now, { weekStartsOn: 1 })
    return weeks.findIndex(week => 
      format(week, 'yyyy-MM-dd') === format(currentMonday, 'yyyy-MM-dd')
    )
  }, [weeks])
  
  // Auto-scroll to current week on initial load
  useEffect(() => {
    // Only scroll if we haven't done it yet and have data
    if (currentWeekIndex >= 0 && tableRef.current && !hasScrolledToCurrentWeek.current && employees.length > 0) {
      // Small delay to ensure the table is fully rendered
      const timer = setTimeout(() => {
        if (tableRef.current) {
          // Find the table element within the ref
          const table = tableRef.current.querySelector('table')
          if (table) {
            // Calculate the position of the current week column
            // Account for the first 2 fixed columns (Employee/Project and Team)
            const columnIndex = currentWeekIndex + 2
            const targetColumn = table.querySelector(`thead tr:last-child th:nth-child(${columnIndex + 1})`) as HTMLElement
            
            if (targetColumn) {
              // Get the position of the column
              const columnLeft = targetColumn.offsetLeft
              const columnWidth = targetColumn.offsetWidth
              const containerWidth = tableRef.current.offsetWidth
              
              // Calculate scroll position to center the current week
              const scrollLeft = columnLeft - (containerWidth / 2) + (columnWidth / 2)
              
              // Scroll to the calculated position
              tableRef.current.scrollLeft = Math.max(0, scrollLeft)
              hasScrolledToCurrentWeek.current = true
            }
          }
        }
      }, 200) // Slightly longer delay to ensure everything is rendered
      
      return () => clearTimeout(timer)
    }
  }, [currentWeekIndex, viewMode, employees.length]) // Re-run when view mode changes or data loads
  
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
  
  // Auto-detect weeks with data
  useMemo(() => {
    if (assignments.length > 0) {
      // Find the earliest and latest weeks with assignments
      const weeksWithData = assignments.map(a => a.week)
      const weekIndices = weeks.map((week, index) => ({
        week: formatWeek(week),
        index
      })).filter(w => weeksWithData.includes(w.week))
      
      if (weekIndices.length > 0) {
        // For now, still show all weeks but this helps us understand where the data is
      }
    }
  }, [assignments, weeks])

  // Check if a week falls within project date range
  const isWeekInProjectRange = (weekDate: Date, project: Project) => {
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 })
    
    // Parse project dates properly to avoid timezone issues
    // If it's already a Date object, use it; otherwise parse the string
    let projectStart: Date
    let projectEnd: Date
    
    if (project.startDate instanceof Date) {
      // Check for timezone corruption (19:00 or 18:00 on previous day)
      const hours = project.startDate.getHours()
      if (hours === 19 || hours === 18) {
        // This is a corrupted date - advance to next day midnight
        projectStart = new Date(project.startDate)
        projectStart.setHours(projectStart.getHours() + (24 - hours))
        projectStart.setMinutes(0)
        projectStart.setSeconds(0)
        projectStart.setMilliseconds(0)
      } else {
        projectStart = project.startDate
      }
    } else {
      // For date strings in format "YYYY-MM-DD", parse as local date not UTC
      const startStr = String(project.startDate)
      if (startStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = startStr.split('-').map(Number)
        projectStart = new Date(year, month - 1, day) // month is 0-indexed
      } else {
        projectStart = new Date(project.startDate)
      }
    }
    
    if (project.endDate instanceof Date) {
      // Check for timezone corruption (19:00 or 18:00 on previous day)
      const hours = project.endDate.getHours()
      if (hours === 19 || hours === 18) {
        // This is a corrupted date - advance to next day midnight
        projectEnd = new Date(project.endDate)
        projectEnd.setHours(projectEnd.getHours() + (24 - hours))
        projectEnd.setMinutes(0)
        projectEnd.setSeconds(0)
        projectEnd.setMilliseconds(0)
      } else {
        projectEnd = project.endDate
      }
    } else {
      // For date strings in format "YYYY-MM-DD", parse as local date not UTC
      const endStr = String(project.endDate)
      if (endStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = endStr.split('-').map(Number)
        projectEnd = new Date(year, month - 1, day) // month is 0-indexed
      } else {
        projectEnd = new Date(project.endDate)
      }
    }
    
    // Debug logging for specific weeks
    const weekStr = format(weekDate, 'yyyy-MM-dd')
    const projectStartDay = projectStart.getDay()
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    // Log for the week of Aug 25, 2025 (the problematic week before Sep 1)
    if (weekStr === '2025-08-25' || weekStr === '2025-09-01') {
      console.log(`🔍 Checking week ${weekStr} for project "${project.name}":`)
      console.log(`  Raw project.startDate:`, project.startDate, `(type: ${typeof project.startDate})`)
      console.log(`  Raw project.endDate:`, project.endDate, `(type: ${typeof project.endDate})`)
      console.log(`  Parsed projectStart:`, format(projectStart, 'yyyy-MM-dd EEEE'), `(${projectStart.toISOString()})`)
      console.log(`  Parsed projectEnd:`, format(projectEnd, 'yyyy-MM-dd'))
      console.log(`  Project starts on:`, dayNames[projectStartDay])
      console.log(`  Week date:`, format(weekDate, 'yyyy-MM-dd EEEE'))
      console.log(`  Week end:`, format(weekEnd, 'yyyy-MM-dd EEEE'))
    }
    
    // Special case: if project starts on a Monday (day 1), don't include the previous week
    if (projectStartDay === 1) {
      // Week is in range if it starts on or after the project start date
      const result = weekDate >= projectStart && weekDate <= projectEnd
      
      if (weekStr === '2025-08-25' || weekStr === '2025-09-01') {
        console.log(`  Monday start logic: weekDate >= projectStart?`, weekDate >= projectStart)
        console.log(`  weekDate time:`, weekDate.getTime())
        console.log(`  projectStart time:`, projectStart.getTime())
        console.log(`  Result:`, result, result ? '✅ EDITABLE' : '❌ NOT EDITABLE')
      }
      
      return result
    }
    
    // For other days, check if there's any overlap between the week and the project
    // Week overlaps if: weekEnd >= projectStart AND weekStart <= projectEnd
    const result = weekEnd >= projectStart && weekDate <= projectEnd
    
    if (weekStr === '2025-08-25' || weekStr === '2025-09-01') {
      console.log(`  Non-Monday logic: weekEnd >= projectStart?`, weekEnd >= projectStart)
      console.log(`  weekDate <= projectEnd?`, weekDate <= projectEnd)
      console.log(`  Result:`, result, result ? '✅ EDITABLE' : '❌ NOT EDITABLE')
    }
    
    return result
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

  // Filter data by team - show team employees and all projects they work on
  const filteredData = useMemo(() => {
    if (selectedTeam === 'All Teams') {
      return { employees, projects, assignments }
    }

    // Get employees in the selected team
    const teamEmployees = employees.filter(e => e.team === selectedTeam)
    const teamEmployeeIds = new Set(teamEmployees.map(e => e.id))
    
    // Find all projects that have ANY assignments from team members
    const projectsWithTeamMembers = new Set<string>()
    assignments.forEach(a => {
      // Check if this assignment is from a team member (handle both ID and name references)
      const employee = employees.find(e => e.id === a.employeeId || e.name === a.employeeId)
      if (employee && teamEmployeeIds.has(employee.id)) {
        // Add both project ID and name to handle both reference types
        projectsWithTeamMembers.add(a.projectId)
        const project = projects.find(p => p.id === a.projectId || p.name === a.projectId)
        if (project) {
          projectsWithTeamMembers.add(project.id)
        }
      }
    })
    
    // Include all projects that team members work on
    const teamProjects = projects.filter(p => 
      projectsWithTeamMembers.has(p.id) || projectsWithTeamMembers.has(p.name)
    )
    
    // Include ALL assignments for those projects (not just team member assignments)
    // This allows seeing the full context of the project
    const teamProjectIds = new Set(teamProjects.map(p => p.id))
    const teamProjectNames = new Set(teamProjects.map(p => p.name))
    const relevantAssignments = assignments.filter(a => 
      teamProjectIds.has(a.projectId) || teamProjectNames.has(a.projectId)
    )

    return {
      employees: teamEmployees,
      projects: teamProjects,
      assignments: relevantAssignments,
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
      
      
      return employeeMatch && projectMatch && match
    })
    
    return found
  }

  // Copy hours to all remaining weeks in project range
  const copyHoursToRight = (employeeId: string, projectId: string, fromWeekIndex: number, hours: number) => {
    const project = filteredData.projects.find(p => p.id === projectId)
    if (!project) return

    // Handle Placeholder employee specially
    if (employeeId === 'placeholder') {
      for (let i = fromWeekIndex + 1; i < weeks.length; i++) {
        const week = weeks[i]
        if (isWeekInProjectRange(week, project)) {
          const dateStr = formatWeekToDate(week)
          const weekStr = formatWeek(week)
          
          // Check if assignment already exists
          const existing = filteredData.assignments.find(a => 
            a.employeeId === 'Placeholder' && 
            (a.projectId === projectId || a.projectId === project.name) &&
            (a.date === dateStr || (!a.date && a.week === weekStr))
          )
          
          if (existing) {
            if (hours === 0) {
              removeAssignment(existing.id)
            } else {
              updateAssignment(existing.id, { hours, date: dateStr })
            }
          } else if (hours > 0) {
            addAssignment({
              id: generateId(),
              employeeId: 'Placeholder',
              projectId: projectId,
              week: weekStr,
              date: dateStr,
              hours
            })
          }
        }
      }
    } else {
      // Start from the next week after the current one
      for (let i = fromWeekIndex + 1; i < weeks.length; i++) {
        const week = weeks[i]
        if (isWeekInProjectRange(week, project)) {
          handleHoursChange(employeeId, projectId, week, hours)
        }
      }
    }
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
              
              // Get projects this employee is assigned to (including those with 0 hours)
              const employeeProjects = filteredData.projects.filter(project => {
                const hasAssignment = filteredData.assignments.some(a => 
                  (a.employeeId === employee.id || a.employeeId === employee.name) && 
                  (a.projectId === project.id || a.projectId === project.name)
                )
                
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
                    

                    return (
                      <tr key={`${employee.id}-${project.id}`} className="bg-gray-50">
                        <td className="pl-12 p-2 border border-gray-200 sticky left-0 bg-gray-50 text-gray-600 text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-gray-400">↳</span>
                            {project.name}
                          </span>
                        </td>
                        <td className="p-2 border border-gray-200"></td>
                        {weeks.map((week, weekIndex) => {
                          const assignment = getOrCreateAssignment(employee.id, project.id, week)
                          const isInRange = isWeekInProjectRange(week, project)
                          const currentHours = assignment?.hours || 0
                          
                          // Check if there are more weeks in range to the right
                          const hasWeeksToRight = weeks.slice(weekIndex + 1).some(w => isWeekInProjectRange(w, project))
                          
                          return (
                            <td key={week.toISOString()} className={`p-1 border border-gray-200 text-center group ${isInRange ? 'bg-white' : 'bg-gray-50'}`}>
                              {isInRange ? (
                                <div className="flex items-center gap-0.5 justify-center">
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
                                    className="w-12 px-1 py-0.5 text-center border border-gray-300 rounded-l text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 peer"
                                  />
                                  {hasWeeksToRight && (
                                    <button
                                      onClick={() => copyHoursToRight(employee.id, project.id, weekIndex, currentHours)}
                                      className="p-0.5 border border-l-0 border-gray-300 rounded-r bg-gray-50 hover:bg-blue-100 transition-all duration-200 opacity-0 group-hover:opacity-100 peer-focus:opacity-100 -ml-0.5"
                                      title="Copy value to all weeks to the right"
                                    >
                                      <ArrowRight className="w-3 h-3 text-gray-600" />
                                    </button>
                                  )}
                                </div>
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
                    <tr className="bg-blue-50">
                      <td className="pl-12 p-2 border border-gray-200 sticky left-0 bg-blue-50 text-sm">
                        {addingToRow === employee.id ? (
                          <select
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => {
                              if (e.target.value) {
                                const projectId = e.target.value
                                // Find the first week in the project's date range
                                const project = filteredData.projects.find(p => p.id === projectId)
                                if (project) {
                                  const projectWeeks = weeks.filter(w => isWeekInProjectRange(w, project))
                                  if (projectWeeks.length > 0) {
                                    // Create initial assignment with 0 hours for the first week in project range
                                    // This ensures the assignment is created and the row will appear
                                    const firstWeek = projectWeeks[0]
                                    const dateStr = formatWeekToDate(firstWeek)
                                    const weekStr = formatWeek(firstWeek)
                                    
                                    // Use the name if that's what's being used in assignments, otherwise use ID
                                    const firstAssignment = filteredData.assignments[0]
                                    const useNames = firstAssignment && 
                                                     (firstAssignment.employeeId === employee?.name || 
                                                      firstAssignment.projectId === project?.name)
                                    
                                    addAssignment({
                                      id: generateId(),
                                      employeeId: useNames ? (employee?.name || employee.id) : employee.id,
                                      projectId: useNames ? (project?.name || projectId) : projectId,
                                      week: weekStr,
                                      date: dateStr,
                                      hours: 0
                                    })
                                  }
                                }
                                setAddingToRow(null)
                                // Keep row expanded to show the new project
                                if (!expandedRows.has(employee.id)) {
                                  toggleExpanded(employee.id)
                                }
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
              
              // Get employees assigned to this project (including those with 0 hours and Placeholder)
              const regularEmployees = filteredData.employees.filter(employee => 
                filteredData.assignments.some(a => 
                  (a.employeeId === employee.id || a.employeeId === employee.name) && 
                  (a.projectId === project.id || a.projectId === project.name)
                )
              )
              
              // Check if there are any Placeholder assignments for this project
              const hasPlaceholder = filteredData.assignments.some(a => 
                a.employeeId === 'Placeholder' && 
                (a.projectId === project.id || a.projectId === project.name)
              )
              
              // Create a virtual Placeholder employee if needed
              const projectEmployees = hasPlaceholder 
                ? [...regularEmployees, { id: 'placeholder', name: 'Placeholder', team: 'Unassigned', maxHours: 40, skills: {} }]
                : regularEmployees

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
                      a => (a.employeeId === employee.id || a.employeeId === employee.name || 
                           (employee.id === 'placeholder' && a.employeeId === 'Placeholder')) && 
                           (a.projectId === project.id || a.projectId === project.name)
                    )

                    return (
                      <tr key={`${project.id}-${employee.id}`} className="bg-gray-50">
                        <td className="pl-12 p-2 border border-gray-200 sticky left-0 bg-gray-50 text-gray-600 text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-gray-400">↳</span>
                            {employee.name}
                            <span className="text-xs text-gray-500">({employee.team})</span>
                          </span>
                        </td>
                        {weeks.map((week, weekIndex) => {
                          const assignment = employee.id === 'placeholder' 
                            ? filteredData.assignments.find(a => 
                                a.employeeId === 'Placeholder' && 
                                (a.projectId === project.id || a.projectId === project.name) &&
                                (a.date === formatWeekToDate(week) || (!a.date && a.week === formatWeek(week)))
                              )
                            : getOrCreateAssignment(employee.id, project.id, week)
                          const isInRange = isWeekInProjectRange(week, project)
                          const currentHours = assignment?.hours || 0
                          
                          // Check if there are more weeks in range to the right
                          const hasWeeksToRight = weeks.slice(weekIndex + 1).some(w => isWeekInProjectRange(w, project))
                          
                          return (
                            <td key={week.toISOString()} className={`p-1 border border-gray-200 text-center group ${isInRange ? 'bg-white' : 'bg-gray-50'}`}>
                              {isInRange ? (
                                <div className="flex items-center gap-0.5 justify-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="168"
                                    value={assignment?.hours || ''}
                                    onChange={(e) => {
                                      const hours = parseInt(e.target.value) || 0
                                      if (employee.id === 'placeholder') {
                                        // Handle Placeholder assignments
                                        if (assignment) {
                                          if (hours === 0) {
                                            removeAssignment(assignment.id)
                                          } else {
                                            updateAssignment(assignment.id, { hours, date: formatWeekToDate(week) })
                                          }
                                        } else if (hours > 0) {
                                          addAssignment({
                                            id: generateId(),
                                            employeeId: 'Placeholder',
                                            projectId: project.id,
                                            week: formatWeek(week),
                                            date: formatWeekToDate(week),
                                            hours
                                          })
                                        }
                                      } else {
                                        handleHoursChange(employee.id, project.id, week, hours)
                                      }
                                    }}
                                    placeholder="-"
                                    className="w-12 px-1 py-0.5 text-center border border-gray-300 rounded-l text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 peer"
                                  />
                                  {hasWeeksToRight && (
                                    <button
                                      onClick={() => copyHoursToRight(employee.id, project.id, weekIndex, currentHours)}
                                      className="p-0.5 border border-l-0 border-gray-300 rounded-r bg-gray-50 hover:bg-blue-100 transition-all duration-200 opacity-0 group-hover:opacity-100 peer-focus:opacity-100 -ml-0.5"
                                      title="Copy value to all weeks to the right"
                                    >
                                      <ArrowRight className="w-3 h-3 text-gray-600" />
                                    </button>
                                  )}
                                </div>
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
                    <tr className="bg-blue-50">
                      <td className="pl-12 p-2 border border-gray-200 sticky left-0 bg-blue-50 text-sm">
                        {addingToRow === project.id ? (
                          <select
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => {
                              if (e.target.value) {
                                const employeeId = e.target.value
                                
                                // Handle Placeholder employee
                                if (employeeId === 'placeholder') {
                                  // Create a placeholder assignment
                                  const projectWeeks = weeks.filter(w => isWeekInProjectRange(w, project))
                                  if (projectWeeks.length > 0) {
                                    const firstWeek = projectWeeks[0]
                                    const dateStr = formatWeekToDate(firstWeek)
                                    const weekStr = formatWeek(firstWeek)
                                    
                                    addAssignment({
                                      id: generateId(),
                                      employeeId: 'Placeholder',
                                      projectId: project.id,
                                      week: weekStr,
                                      date: dateStr,
                                      hours: 0
                                    })
                                  }
                                } else {
                                  // Find the first week in the project's date range
                                  const employee = filteredData.employees.find(e => e.id === employeeId)
                                  const projectWeeks = weeks.filter(w => isWeekInProjectRange(w, project))
                                  
                                  if (projectWeeks.length > 0) {
                                    // Create initial assignment with 0 hours for the first week in project range
                                    const firstWeek = projectWeeks[0]
                                    const dateStr = formatWeekToDate(firstWeek)
                                    const weekStr = formatWeek(firstWeek)
                                    
                                    // Use the name if that's what's being used in assignments, otherwise use ID
                                    const firstAssignment = filteredData.assignments[0]
                                    const useNames = firstAssignment && 
                                                     (firstAssignment.employeeId === employee?.name || 
                                                      firstAssignment.projectId === project?.name)
                                    
                                    addAssignment({
                                      id: generateId(),
                                      employeeId: useNames ? (employee?.name || employeeId) : employeeId,
                                      projectId: useNames ? (project?.name || project.id) : project.id,
                                      week: weekStr,
                                      date: dateStr,
                                      hours: 0
                                    })
                                  }
                                }
                                
                                setAddingToRow(null)
                                // Keep row expanded to show the new employee
                                if (!expandedRows.has(project.id)) {
                                  toggleExpanded(project.id)
                                }
                              }
                            }}
                            onBlur={() => setAddingToRow(null)}
                            autoFocus
                          >
                            <option value="">Select an employee...</option>
                            {!hasPlaceholder && (
                              <option value="placeholder" className="font-semibold text-blue-600">
                                Placeholder (for optimization)
                              </option>
                            )}
                            <optgroup label="Available Employees">
                              {filteredData.employees
                                .filter(e => !regularEmployees.some(pe => pe.id === e.id))
                                .map(employee => (
                                  <option key={employee.id} value={employee.id}>
                                    {employee.name} ({employee.team})
                                  </option>
                                ))
                              }
                            </optgroup>
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
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-4 shadow-inner">
          <Users className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-subheading mb-2">No Data Available</h3>
        <p className="text-caption mb-6 max-w-md mx-auto">
          Upload an Excel file with employee and project data to start tracking hours.
        </p>
        <button className="btn-primary">
          Get Started
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* View Toggle and Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex bg-gray-50 rounded-lg p-1">
          <button
            onClick={() => {
              setViewMode('employee')
              hasScrolledToCurrentWeek.current = false // Reset scroll flag when changing views
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
              viewMode === 'employee'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            By Employee
          </button>
          <button
            onClick={() => {
              setViewMode('project')
              hasScrolledToCurrentWeek.current = false // Reset scroll flag when changing views
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
              viewMode === 'project'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            By Project
          </button>
        </div>
        
        {/* Week Information */}
        <div className="text-sm text-gray-600">
          Showing {weeks.length} weeks ({format(weeks[0], 'MMM yyyy')} - {format(weeks[weeks.length - 1], 'MMM yyyy')})
          {assignments.length > 0 && ` • ${assignments.length} assignments`}
        </div>
      </div>

      {/* Grid */}
      {viewMode === 'employee' ? renderEmployeeView() : renderProjectView()}
    </div>
  )
}