'use client'

import { useScheduleStore } from '@/store/useScheduleStore'
import { useMemo, useRef, useState, useEffect } from 'react'
import { format, startOfYear, endOfYear, eachMonthOfInterval, eachWeekOfInterval, addYears, differenceInDays, addDays, startOfWeek, getMonth, getYear, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter'

export function GanttChart() {
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const employees = useScheduleStore((state) => state.employees)
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)
  const [draggedProject, setDraggedProject] = useState<string | null>(null)
  const [dragStartX, setDragStartX] = useState<number>(0)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week')
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasAutoScrolled = useRef(false)
  const updateProject = useScheduleStore((state) => state.updateProject)

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

  // Calculate timeline range (3 years: last year, current year, next year)
  const timelineRange = useMemo(() => {
    const now = new Date()
    const start = startOfYear(addYears(now, -1))
    const end = endOfYear(addYears(now, 1))
    
    // Get time periods based on zoom level
    let periods: Date[] = []
    let subPeriods: Date[] = []
    
    switch (zoomLevel) {
      case 'day':
        // Show weeks as main periods, days as sub-periods
        periods = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
        subPeriods = eachDayOfInterval({ start, end })
        break
      case 'week':
        // Show months as main periods, weeks as sub-periods
        periods = eachMonthOfInterval({ start, end })
        subPeriods = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
        break
      case 'month':
        // Show quarters as main periods, months as sub-periods
        const quarters: Date[] = []
        let currentQuarter = startOfMonth(start)
        while (currentQuarter <= end) {
          quarters.push(currentQuarter)
          currentQuarter = addDays(currentQuarter, 92) // Roughly 3 months
        }
        periods = quarters
        subPeriods = eachMonthOfInterval({ start, end })
        break
      case 'quarter':
        // Show years as main periods, quarters as sub-periods
        const years: Date[] = []
        let currentYear = startOfYear(start)
        while (currentYear <= end) {
          years.push(currentYear)
          currentYear = addYears(currentYear, 1)
        }
        periods = years
        const quarterPeriods: Date[] = []
        let currentQ = startOfMonth(start)
        while (currentQ <= end) {
          quarterPeriods.push(currentQ)
          currentQ = addDays(currentQ, 92)
        }
        subPeriods = quarterPeriods
        break
    }
    
    return { start, end, periods, subPeriods }
  }, [zoomLevel])

  // Calculate column width based on zoom level
  const getColumnWidth = () => {
    switch (zoomLevel) {
      case 'day': return 40
      case 'week': return 60
      case 'month': return 100
      case 'quarter': return 150
      default: return 60
    }
  }

  // Group sub-periods under main periods for double-axis header
  const periodGroups = useMemo(() => {
    const groups: { label: string; count: number; startIndex: number }[] = []
    let currentGroup: { label: string; startIndex: number; count: number } | null = null
    
    timelineRange.subPeriods.forEach((subPeriod, index) => {
      let groupLabel = ''
      
      switch (zoomLevel) {
        case 'day':
          groupLabel = format(subPeriod, 'MMM yyyy')
          break
        case 'week':
          groupLabel = format(subPeriod, 'MMM yyyy')
          break
        case 'month':
          groupLabel = `Q${Math.floor(getMonth(subPeriod) / 3) + 1} ${getYear(subPeriod)}`
          break
        case 'quarter':
          groupLabel = format(subPeriod, 'yyyy')
          break
      }
      
      if (!currentGroup || currentGroup.label !== groupLabel) {
        if (currentGroup) {
          groups.push(currentGroup)
        }
        currentGroup = { label: groupLabel, startIndex: index, count: 1 }
      } else {
        currentGroup.count++
      }
    })
    
    if (currentGroup) {
      groups.push(currentGroup)
    }
    
    return groups
  }, [timelineRange.subPeriods, zoomLevel])

  const calculatePosition = (date: Date) => {
    const totalDays = differenceInDays(timelineRange.end, timelineRange.start)
    const dayOffset = differenceInDays(date, timelineRange.start)
    return (dayOffset / totalDays) * 100
  }

  // Auto-scroll to current period on mount
  useEffect(() => {
    if (!hasAutoScrolled.current && scrollRef.current && filteredProjects.length > 0) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          const now = new Date()
          const position = calculatePosition(now)
          const scrollWidth = scrollRef.current.scrollWidth
          const containerWidth = scrollRef.current.offsetWidth
          const targetScroll = (scrollWidth * position / 100) - (containerWidth / 2)
          
          scrollRef.current.scrollLeft = Math.max(0, targetScroll)
          hasAutoScrolled.current = true
          console.log(`📍 Auto-scrolled Gantt to current date`)
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [filteredProjects.length])

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggedProject(projectId)
    setDragStartX(e.clientX)
    
    // Create a ghost image for drag feedback
    const dragImage = new Image()
    dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
    e.dataTransfer.setDragImage(dragImage, 0, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (!draggedProject || !containerRef.current) {
      setDraggedProject(null)
      return
    }

    const project = projects.find(p => p.id === draggedProject)
    if (!project) {
      setDraggedProject(null)
      return
    }

    // Calculate the distance moved
    const deltaX = e.clientX - dragStartX
    const containerWidth = containerRef.current.offsetWidth
    const totalDays = differenceInDays(timelineRange.end, timelineRange.start)
    const daysToMove = Math.round((deltaX / containerWidth) * totalDays)

    if (daysToMove !== 0) {
      // Update project dates
      const newStartDate = addDays(project.startDate, daysToMove)
      const newEndDate = addDays(project.endDate, daysToMove)
      
      updateProject(draggedProject, {
        startDate: newStartDate,
        endDate: newEndDate
      })
    }

    setDraggedProject(null)
  }

  const handleZoomIn = () => {
    const levels: ZoomLevel[] = ['day', 'week', 'month', 'quarter']
    const currentIndex = levels.indexOf(zoomLevel)
    if (currentIndex > 0) {
      setZoomLevel(levels[currentIndex - 1])
    }
  }

  const handleZoomOut = () => {
    const levels: ZoomLevel[] = ['day', 'week', 'month', 'quarter']
    const currentIndex = levels.indexOf(zoomLevel)
    if (currentIndex < levels.length - 1) {
      setZoomLevel(levels[currentIndex + 1])
    }
  }

  const handleFitToScreen = () => {
    setZoomLevel('month')
    if (scrollRef.current) {
      const now = new Date()
      const position = calculatePosition(now)
      const scrollWidth = scrollRef.current.scrollWidth
      const containerWidth = scrollRef.current.offsetWidth
      const targetScroll = (scrollWidth * position / 100) - (containerWidth / 2)
      scrollRef.current.scrollLeft = Math.max(0, targetScroll)
    }
  }

  const formatSubPeriod = (date: Date) => {
    switch (zoomLevel) {
      case 'day':
        return format(date, 'd')
      case 'week':
        return format(date, 'MMM d').toUpperCase()
      case 'month':
        return format(date, 'MMM')
      case 'quarter':
        return `Q${Math.floor(getMonth(date) / 3) + 1}`
      default:
        return format(date, 'MMM d')
    }
  }

  if (filteredProjects.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No projects to display. Upload an Excel file or load sample data to get started.
      </div>
    )
  }

  const columnWidth = getColumnWidth()
  const totalWidth = timelineRange.subPeriods.length * columnWidth

  return (
    <div className="relative">
      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 z-20 flex gap-2">
        <button
          onClick={handleZoomIn}
          disabled={zoomLevel === 'day'}
          className="p-2 bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          disabled={zoomLevel === 'quarter'}
          className="p-2 bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-2 bg-white border rounded hover:bg-gray-50"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="px-3 py-2 bg-white border rounded text-sm">
          View: {zoomLevel}
        </div>
      </div>

      <div className="overflow-x-auto" ref={scrollRef}>
        <div style={{ minWidth: `${totalWidth}px` }} ref={containerRef}>
          {/* Timeline Header */}
          <div className="border-b border-gray-200 bg-gray-50">
            {/* Main period groups (months/quarters/years) */}
            <div className="flex border-b border-gray-200">
              {periodGroups.map((group, idx) => (
                <div
                  key={idx}
                  className="text-xs text-center border-r border-gray-200 font-semibold bg-gray-100 py-1"
                  style={{ width: `${group.count * columnWidth}px` }}
                >
                  {group.label}
                </div>
              ))}
            </div>
            {/* Sub-periods (days/weeks/months) */}
            <div className="flex">
              {timelineRange.subPeriods.map((period, idx) => {
                const isCurrentPeriod = isWithinInterval(new Date(), {
                  start: period,
                  end: zoomLevel === 'day' 
                    ? period 
                    : zoomLevel === 'week'
                    ? addDays(period, 6)
                    : zoomLevel === 'month'
                    ? endOfMonth(period)
                    : addDays(period, 91)
                })
                
                return (
                  <div
                    key={idx}
                    className={`px-1 py-1 text-xs text-center border-r border-gray-200 ${
                      isCurrentPeriod ? 'bg-blue-50 font-semibold' : ''
                    }`}
                    style={{ width: `${columnWidth}px` }}
                    data-period-index={idx}
                  >
                    {formatSubPeriod(period)}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Project Rows with Grid Lines */}
          <div className="relative">
            {/* Vertical grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              {timelineRange.subPeriods.map((_, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 border-l border-gray-100"
                  style={{ left: `${idx * columnWidth}px` }}
                />
              ))}
            </div>

            {/* Project bars */}
            {filteredProjects.map((project) => {
              const startPos = calculatePosition(project.startDate)
              const endPos = calculatePosition(project.endDate)
              const width = endPos - startPos

              return (
                <div key={project.id} className="relative h-12 border-b border-gray-200 hover:bg-gray-50">
                  <div
                    className={`absolute top-2 h-8 bg-blue-500 hover:bg-blue-600 rounded cursor-move transition-colors ${
                      draggedProject === project.id ? 'opacity-50' : ''
                    }`}
                    style={{
                      left: `${startPos}%`,
                      width: `${width}%`,
                      minWidth: '40px'
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id)}
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
              )
            })}

            {/* Today Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
              style={{
                left: `${calculatePosition(new Date())}%`,
              }}
            >
              <div className="absolute -top-6 -left-8 bg-red-500 text-white text-xs px-2 py-1 rounded">
                Today
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}