'use client'

import { useScheduleStore } from '@/store/useScheduleStore'
import { useMemo, useState, useRef, useEffect } from 'react'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import { isWithinInterval } from 'date-fns'
import { EditProjectForm } from './EditProjectForm'
import type { Project } from '@/types/schedule'
import "gantt-task-react/dist/index.css"

type GanttViewMode = 'day' | 'week' | 'month' | 'year'

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
  
  // Get the current date for view centering
  const currentDate = useMemo(() => new Date(), [])
  
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
        
        // Show project if it overlaps with the date range filter
        return (
          isWithinInterval(projectStart, { start: filterStart, end: filterEnd }) ||
          isWithinInterval(projectEnd, { start: filterStart, end: filterEnd }) ||
          (projectStart <= filterStart && projectEnd >= filterEnd)
        )
      })
    }
    
    return filtered
  }, [projects, assignments, employees, selectedTeam, dateRangeFilter])
  
  // Convert projects to Gantt tasks format
  const tasks: Task[] = useMemo(() => {
    // Ensure we have at least one task for the chart to render properly
    if (filteredProjects.length === 0) {
      return []
    }
    
    return filteredProjects.map(project => ({
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
  }, [filteredProjects])
  
  // Handle date changes from drag and drop
  const handleDateChange = (task: Task) => {
    console.log(`Date changed for ${task.name}: ${task.start} to ${task.end}`)
    updateProject(task.id, {
      startDate: task.start,
      endDate: task.end
    })
  }
  
  // Handle double click to edit project
  const handleDoubleClick = (task: Task) => {
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
      case 'day':
        return ViewMode.Day
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
  
  // Auto-scroll to current week on mount
  useEffect(() => {
    if (ganttRef.current && tasks.length > 0) {
      // Small delay to ensure the chart is rendered
      setTimeout(() => {
        const ganttSvg = document.querySelector('.gantt-container svg.gantt')
        if (ganttSvg) {
          // The library should auto-scroll to viewDate
          console.log('Gantt chart initialized with current date view')
        }
      }, 100)
    }
  }, [tasks.length])
  
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
          viewDate={currentDate}
          onDateChange={handleDateChange}
          onProgressChange={() => {}} // Disable progress changes
          onDoubleClick={handleDoubleClick} // Enable double click for editing
          onClick={() => {}} // Disable click
          listCellWidth="" // Hide the task list
          columnWidth={viewMode === 'day' ? 50 : viewMode === 'week' ? 60 : viewMode === 'month' ? 120 : 200}
          ganttHeight={Math.max(400, tasks.length * 45 + 100)}
          fontSize="12px"
          rowHeight={40}
          barCornerRadius={4}
          todayColor="rgba(239, 68, 68, 0.5)"
          // Ensure dragging is enabled
          handleWidth={8}
          timeStep={1000 * 60 * 60 * 24} // 1 day steps for dragging
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