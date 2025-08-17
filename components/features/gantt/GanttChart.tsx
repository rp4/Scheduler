'use client'

import { useScheduleStore } from '@/store/useScheduleStore'
import { useMemo, useState, useRef, useEffect } from 'react'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import { ZoomIn, ZoomOut, Calendar } from 'lucide-react'
import { startOfYear, endOfYear, addYears } from 'date-fns'
import "gantt-task-react/dist/index.css"

type GanttViewMode = 'day' | 'week' | 'month' | 'quarter'

export function GanttChart() {
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const employees = useScheduleStore((state) => state.employees)
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)
  const updateProject = useScheduleStore((state) => state.updateProject)
  
  const [viewMode, setViewMode] = useState<GanttViewMode>('week')
  const ganttRef = useRef<any>(null)
  
  // Calculate 3-year date range
  const dateRange = useMemo(() => {
    const now = new Date()
    return {
      start: startOfYear(addYears(now, -1)),
      end: endOfYear(addYears(now, 1)),
      current: now
    }
  }, [])
  
  // Filter projects by team - show all projects that team members work on
  const filteredProjects = useMemo(() => {
    if (selectedTeam === 'All Teams') return projects
    
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
    
    // Return all projects that team members work on
    return projects.filter(p => 
      projectsWithTeamMembers.has(p.id) || projectsWithTeamMembers.has(p.name)
    )
  }, [projects, assignments, employees, selectedTeam])
  
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
  
  // Convert view mode to gantt-task-react format
  const getGanttViewMode = (): ViewMode => {
    switch (viewMode) {
      case 'day':
        return ViewMode.Day
      case 'week':
        return ViewMode.Week
      case 'month':
        return ViewMode.Month
      case 'quarter':
        return ViewMode.QuarterYear
      default:
        return ViewMode.Week
    }
  }
  
  const handleZoomIn = () => {
    const modes: GanttViewMode[] = ['day', 'week', 'month', 'quarter']
    const currentIndex = modes.indexOf(viewMode)
    if (currentIndex > 0) {
      setViewMode(modes[currentIndex - 1])
    }
  }
  
  const handleZoomOut = () => {
    const modes: GanttViewMode[] = ['day', 'week', 'month', 'quarter']
    const currentIndex = modes.indexOf(viewMode)
    if (currentIndex < modes.length - 1) {
      setViewMode(modes[currentIndex + 1])
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
    <div className="relative">
      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 z-20 flex gap-2 bg-white rounded-lg shadow-md p-1">
        <button
          onClick={handleZoomIn}
          disabled={viewMode === 'day'}
          className="p-2 bg-white hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          disabled={viewMode === 'quarter'}
          className="p-2 bg-white hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 px-2 py-1 border-l">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm capitalize">{viewMode}</span>
        </div>
      </div>
      
      {/* Gantt Chart */}
      <div className="gantt-container" ref={ganttRef}>
        <Gantt
          tasks={tasks}
          viewMode={getGanttViewMode()}
          viewDate={dateRange.current}
          onDateChange={handleDateChange}
          onProgressChange={() => {}} // Disable progress changes
          onDoubleClick={() => {}} // Disable double click
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
    </div>
  )
}