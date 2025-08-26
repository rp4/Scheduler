'use client'

import { useScheduleStore } from '@/store/useScheduleStore'
import { useMemo, useState, useRef, useEffect } from 'react'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import { EditProjectForm } from './EditProjectForm'
import type { Project } from '@/types/schedule'
import "gantt-task-react/dist/index.css"

type GanttViewMode = 'week' | 'month' | 'year'

export function GanttChart() {
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const employees = useScheduleStore((state) => state.employees)
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)
  const dateRangeFilter = useScheduleStore((state) => state.dateRange)
  const updateProject = useScheduleStore((state) => state.updateProject)
  
  const [viewMode, setViewMode] = useState<GanttViewMode>('week')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const ganttRef = useRef<any>(null)
  
  // Get the view date - use filtered range start date or current date
  const viewDate = useMemo(() => {
    if (dateRangeFilter) {
      const filterStart = dateRangeFilter.startDate instanceof Date 
        ? dateRangeFilter.startDate 
        : new Date(dateRangeFilter.startDate)
      return filterStart
    }
    return new Date()
  }, [dateRangeFilter])
  
  // Calculate optimal column width based on date range span
  const columnWidth = useMemo(() => {
    if (!dateRangeFilter) {
      // Default widths
      return viewMode === 'week' ? 60 : viewMode === 'month' ? 120 : 200
    }
    
    const filterStart = dateRangeFilter.startDate instanceof Date 
      ? dateRangeFilter.startDate 
      : new Date(dateRangeFilter.startDate)
    const filterEnd = dateRangeFilter.endDate instanceof Date
      ? dateRangeFilter.endDate
      : new Date(dateRangeFilter.endDate)
    
    // Calculate span in days
    const spanInDays = Math.ceil((filterEnd.getTime() - filterStart.getTime()) / (1000 * 60 * 60 * 24))
    
    // Adjust column width to fit the view better
    if (viewMode === 'week') {
      // For week view
      if (spanInDays < 60) return 100
      if (spanInDays < 180) return 80
      return 60
    } else if (viewMode === 'month') {
      // For month view
      if (spanInDays < 365) return 150
      return 120
    } else {
      // Year view
      return 200
    }
  }, [viewMode, dateRangeFilter])
  
  // Listen for zoom changes from Navigation
  useEffect(() => {
    const handleZoomChange = (event: CustomEvent) => {
      setViewMode(event.detail as GanttViewMode)
    }
    
    window.addEventListener('gantt-zoom-change', handleZoomChange as EventListener)
    return () => window.removeEventListener('gantt-zoom-change', handleZoomChange as EventListener)
  }, [])
  
  // Filter projects by team and date range
  const filteredProjects = useMemo(() => {
    let filtered = projects
    
    // Filter by team - show all projects that team members work on
    if (selectedTeam !== 'All Teams') {
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
      
      // Filter projects that team members work on
      filtered = filtered.filter(p => 
        projectsWithTeamMembers.has(p.id) || projectsWithTeamMembers.has(p.name)
      )
    }
    
    // Filter by date range if specified
    if (dateRangeFilter) {
      // Ensure dates are Date objects (they might be strings from localStorage)
      const filterStart = dateRangeFilter.startDate instanceof Date 
        ? dateRangeFilter.startDate 
        : new Date(dateRangeFilter.startDate)
      const filterEnd = dateRangeFilter.endDate instanceof Date
        ? dateRangeFilter.endDate
        : new Date(dateRangeFilter.endDate)
        
      filtered = filtered.filter(project => {
        const projectStart = new Date(project.startDate)
        const projectEnd = new Date(project.endDate)
        
        // Only show projects that have some portion within the date range
        // Hide projects that are completely outside the range
        return !(projectEnd < filterStart || projectStart > filterEnd)
      })
    }
    
    return filtered
  }, [projects, assignments, employees, selectedTeam, dateRangeFilter])
  
  // Convert projects to Gantt tasks format with boundary markers
  const tasks: Task[] = useMemo(() => {
    // Ensure we have at least one task for the chart to render properly
    if (filteredProjects.length === 0) {
      return []
    }
    
    const projectTasks = filteredProjects.map(project => ({
      start: new Date(project.startDate),
      end: new Date(project.endDate),
      name: project.name,
      id: project.id,
      type: 'task' as const, // Use 'task' instead of 'project' for better dragging
      progress: 0, // No progress bars
      isDisabled: false,
      styles: {
        backgroundColor: '#3b82f6', // Single blue color
        backgroundSelectedColor: '#3b82f6', // Same color when selected
        progressColor: 'transparent', // Hide progress bar
        progressSelectedColor: 'transparent' // Hide progress bar when selected
      }
    }))
    
    // Add invisible boundary markers if date range filter is active
    if (dateRangeFilter) {
      const filterStart = dateRangeFilter.startDate instanceof Date 
        ? dateRangeFilter.startDate 
        : new Date(dateRangeFilter.startDate)
      const filterEnd = dateRangeFilter.endDate instanceof Date
        ? dateRangeFilter.endDate
        : new Date(dateRangeFilter.endDate)
      
      // Add boundary markers to constrain the view
      const boundaryTasks: Task[] = [
        {
          start: filterStart,
          end: filterStart,
          name: '',
          id: '__boundary_start__',
          type: 'task' as const,
          progress: 0,
          isDisabled: true,
          styles: {
            backgroundColor: 'transparent',
            backgroundSelectedColor: 'transparent',
            progressColor: 'transparent',
            progressSelectedColor: 'transparent'
          }
        },
        {
          start: filterEnd,
          end: filterEnd,
          name: '',
          id: '__boundary_end__',
          type: 'task' as const,
          progress: 0,
          isDisabled: true,
          styles: {
            backgroundColor: 'transparent',
            backgroundSelectedColor: 'transparent',
            progressColor: 'transparent',
            progressSelectedColor: 'transparent'
          }
        }
      ]
      
      return [...boundaryTasks, ...projectTasks]
    }
    
    return projectTasks
  }, [filteredProjects, dateRangeFilter])
  
  // Handle date changes from drag and drop
  const handleDateChange = (task: Task) => {
    // Ignore boundary markers
    if (task.id.startsWith('__boundary_')) return
    
    console.log(`Date changed for ${task.name}: ${task.start} to ${task.end}`)
    updateProject(task.id, {
      startDate: task.start,
      endDate: task.end
    })
  }
  
  // Handle double click to edit project
  const handleDoubleClick = (task: Task) => {
    // Ignore boundary markers
    if (task.id.startsWith('__boundary_')) return
    
    const project = filteredProjects.find(p => p.id === task.id)
    if (project) {
      setEditingProject(project)
      setEditDialogOpen(true)
    }
  }
  
  // Handle project update from edit form
  const handleProjectUpdate = (projectId: string, updates: Partial<Project>) => {
    updateProject(projectId, updates)
    setEditingProject(null)
    setEditDialogOpen(false)
  }
  
  // Convert view mode to gantt-task-react format
  const getGanttViewMode = (): ViewMode => {
    switch (viewMode) {
      case 'week':
        return ViewMode.Week
      case 'month':
        return ViewMode.Month
      case 'year':
        return ViewMode.Year
      default:
        return ViewMode.Week
    }
  }
  
  // Auto-scroll to view date on mount or when date range changes
  useEffect(() => {
    if (ganttRef.current && tasks.length > 0) {
      // Small delay to ensure the chart is rendered
      setTimeout(() => {
        const ganttSvg = document.querySelector('.gantt-container svg.gantt')
        if (ganttSvg) {
          // The library should auto-scroll to viewDate
          console.log('Gantt chart initialized with view date')
        }
      }, 100)
    }
  }, [tasks.length, viewDate])
  
  // Replace week numbers with dates when in week view
  useEffect(() => {
    if (viewMode === 'week' && ganttRef.current) {
      const observer = new MutationObserver(() => {
        // Find all text elements that contain "W" followed by numbers (week labels)
        const weekLabels = document.querySelectorAll('.gantt-container text')
        weekLabels.forEach(label => {
          const text = label.textContent || ''
          // Match W followed by 1-2 digits (week number)
          if (/^W\d{1,2}$/.test(text)) {
            // Extract week number
            const weekNum = parseInt(text.substring(1))
            // Calculate the date for this week number
            // This is approximate - ideally we'd calculate the actual Monday
            const yearStart = new Date(new Date().getFullYear(), 0, 1)
            const daysToAdd = (weekNum - 1) * 7
            const weekDate = new Date(yearStart)
            weekDate.setDate(yearStart.getDate() + daysToAdd)
            // Find the Monday of that week
            const dayOfWeek = weekDate.getDay()
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
            weekDate.setDate(weekDate.getDate() + daysToMonday)
            // Format as day number with suffix
            const day = weekDate.getDate()
            const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                         day === 2 || day === 22 ? 'nd' :
                         day === 3 || day === 23 ? 'rd' : 'th'
            label.textContent = `${day}${suffix}`
          }
        })
      })
      
      observer.observe(ganttRef.current, {
        childList: true,
        subtree: true,
        characterData: true
      })
      
      return () => observer.disconnect()
    }
  }, [viewMode, tasks])
  
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No projects to display. Upload an Excel file or load sample data to get started.
      </div>
    )
  }
  
  return (
    <div>
      {/* Gantt Chart */}
      <div className="gantt-container" ref={ganttRef}>
        <Gantt
          tasks={tasks}
          viewMode={getGanttViewMode()}
          viewDate={viewDate}
          onDateChange={handleDateChange}
          onProgressChange={() => {}} // Disable progress changes
          onDoubleClick={handleDoubleClick} // Enable double click for editing
          onClick={() => {}} // Disable click
          listCellWidth="" // Hide the task list
          columnWidth={columnWidth}
          ganttHeight={Math.max(400, tasks.length * 45 + 100)}
          fontSize="12px"
          rowHeight={40}
          barCornerRadius={4}
          todayColor="rgba(239, 68, 68, 0.5)"
          // Ensure dragging is enabled
          handleWidth={8}
          timeStep={1000 * 60 * 60 * 24} // 1 day steps for dragging
          locale="en-GB" // Use British locale for Monday-first weeks
        />
      </div>
      
      {/* Custom styles to match app theme and hide elements */}
      <style jsx global>{`
        .gantt-container {
          font-family: inherit;
        }
        
        /* Hide the task list completely */
        .gantt-container ._lnNfm {
          display: none !important;
        }
        
        /* Hide the vertical divider between list and chart */
        .gantt-container ._1sNtG {
          display: none !important;
        }
        
        /* Make the chart take full width */
        .gantt-container ._3ZbQT {
          width: 100% !important;
          grid-template-columns: 0 0 1fr !important;
        }
        
        /* Style the chart area */
        .gantt-container .gantt {
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        /* Header styling */
        .gantt-container ._3F-uD {
          background: #f9fafb;
          border-color: #e5e7eb;
        }
        
        /* Calendar header */
        .gantt-container ._1jRuC {
          background: white;
          border-color: #e5e7eb;
        }
        
        /* Month text */
        .gantt-container ._2Odod {
          color: #374151;
          font-weight: 500;
        }
        
        /* Day text */
        .gantt-container ._34SS0 {
          color: #6b7280;
        }
        
        /* Grid lines */
        .gantt-container ._nI1Xw {
          stroke: #e5e7eb;
        }
        
        /* Today line */
        .gantt-container ._2pYPm {
          stroke: #ef4444;
          stroke-width: 2;
        }
        
        /* Task bars - ensure solid color */
        .gantt-container rect.barBackground {
          fill: #3b82f6 !important;
          rx: 4;
        }
        
        /* Selected task bars - same color */
        .gantt-container rect.barBackgroundSelected {
          fill: #3b82f6 !important;
        }
        
        /* Hide progress bars */
        .gantt-container rect.barProgress {
          display: none !important;
        }
        
        /* Task labels */
        .gantt-container text.barLabel {
          fill: white !important;
          font-weight: 500;
        }
        
        /* Resize handles */
        .gantt-container rect.barHandle {
          fill: #1d4ed8;
          opacity: 0;
          cursor: ew-resize;
        }
        
        .gantt-container g.barWrapper:hover rect.barHandle {
          opacity: 0.5;
        }
        
        /* Ensure dragging cursor */
        .gantt-container g.barWrapper {
          cursor: move;
        }
        
        /* Remove any default task list styles that might show */
        .gantt-container div[class*="task-list"] {
          display: none !important;
        }
        
        /* Ensure full width for the SVG container */
        .gantt-container > div > div {
          width: 100% !important;
        }
      `}</style>
      
      {/* Edit Project Dialog */}
      <EditProjectForm
        project={editingProject}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdateProject={handleProjectUpdate}
      />
    </div>
  )
}