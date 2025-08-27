import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ScheduleData, Employee, Project, Assignment } from '@/types/schedule'

interface DateRange {
  startDate: Date
  endDate: Date
}

interface ScheduleState extends ScheduleData {
  selectedTeam: string
  dateRange: DateRange | null
  hasHydrated: boolean
  
  // Actions
  loadData: (data: ScheduleData) => void
  setSelectedTeam: (team: string) => void
  setDateRange: (range: DateRange | null) => void
  updateEmployee: (id: string, data: Partial<Employee>) => void
  updateProject: (id: string, data: Partial<Project>) => void
  addProject: (project: Omit<Project, 'id'>) => void
  updateAssignment: (id: string, data: Partial<Assignment>) => void
  addAssignment: (assignment: Assignment) => void
  removeAssignment: (id: string) => void
  clearData: () => void
  setHasHydrated: (state: boolean) => void
}

const initialState: ScheduleData = {
  employees: [],
  projects: [],
  assignments: [],
  skills: [],
  teams: ['All Teams'],
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      ...initialState,
      selectedTeam: 'All Teams',
      dateRange: null,
      hasHydrated: false,

      loadData: (data) => {
        console.log('📦 Storing data in Zustand:', {
          employees: data.employees.length,
          projects: data.projects.length,
          assignments: data.assignments.length,
          sampleAssignment: data.assignments[0],
          assignmentStructure: data.assignments.slice(0, 3).map(a => ({
            employeeId: a.employeeId,
            projectId: a.projectId,
            week: a.week,
            hours: a.hours
          }))
        })
        
        return set(() => ({
          ...data,
          teams: ['All Teams', ...Array.from(new Set(data.employees.map(e => e.team).filter((t): t is string => Boolean(t))))],
        }))
      },

      setSelectedTeam: (team) => set({ selectedTeam: team }),
      
      setDateRange: (range) => set({ dateRange: range }),

      updateEmployee: (id, data) => set((state) => ({
        employees: state.employees.map(e => 
          e.id === id ? { ...e, ...data } : e
        ),
      })),

      updateProject: (id, data) => set((state) => {
        const oldProject = state.projects.find(p => p.id === id)
        
        console.log('=== updateProject Debug ===')
        console.log('Project ID:', id)
        console.log('Old Project:', oldProject)
        console.log('Update Data:', data)
        
        // If project dates are being changed, calculate the week shift for assignments
        if (oldProject && data.startDate && data.startDate !== oldProject.startDate) {
          console.log('Date change detected!')
          console.log('Old start date:', oldProject.startDate)
          console.log('New start date:', data.startDate)
          
          const oldStartDate = new Date(oldProject.startDate)
          const newStartDate = new Date(data.startDate)
          
          console.log('Parsed old date:', oldStartDate.toISOString())
          console.log('Parsed new date:', newStartDate.toISOString())
          
          // Calculate the difference in weeks
          const msPerWeek = 7 * 24 * 60 * 60 * 1000
          const weekDifference = Math.round((newStartDate.getTime() - oldStartDate.getTime()) / msPerWeek)
          
          console.log('Week difference calculated:', weekDifference)
          
          if (weekDifference !== 0) {
            // Find assignments for this project
            const projectAssignments = state.assignments.filter(a => 
              a.projectId === id || a.projectId === oldProject.name
            )
            
            console.log('Found assignments for project:', projectAssignments.length)
            console.log('Sample assignments:', projectAssignments.slice(0, 3))
            
            // Update assignments for this project by shifting their weeks
            const updatedAssignments = state.assignments.map(a => {
              // Check if assignment belongs to this project (handle both ID and name references)
              if (a.projectId === id || a.projectId === oldProject.name) {
                console.log('Updating assignment:', a)
                console.log('Old week value:', a.week)
                console.log('Old date value:', a.date)
                
                // If assignment has a date field (yyyy-MM-dd format), use that
                // Otherwise we need to keep the week field as is (it's a display format like "JAN 1")
                if (a.date) {
                  const oldDate = new Date(a.date)
                  const newDate = new Date(oldDate.getTime() + (weekDifference * msPerWeek))
                  const newDateStr = newDate.toISOString().split('T')[0] // yyyy-MM-dd format
                  
                  console.log('Updated date from', a.date, 'to', newDateStr)
                  
                  // Also update the week display string
                  const newWeekStr = new Date(newDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  }).toUpperCase()
                  
                  return { ...a, date: newDateStr, week: newWeekStr }
                } else {
                  // For older data without date field, we can't reliably shift the week
                  // because week is stored as "JAN 1" format which doesn't include year
                  console.log('Warning: Assignment has no date field, cannot shift week reliably')
                  // We'll need to infer the date from the week string and current year
                  // This is a best effort approach
                  
                  // Try to parse the week string (format: "MMM D")
                  const currentYear = new Date().getFullYear()
                  const monthMap: Record<string, number> = {
                    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
                    'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
                  }
                  
                  const parts = a.week.split(' ')
                  if (parts.length === 2) {
                    const month = monthMap[parts[0]]
                    const day = parseInt(parts[1])
                    
                    if (!isNaN(month) && !isNaN(day)) {
                      // Create date for the current year
                      const oldDate = new Date(currentYear, month, day)
                      
                      // Check if this date makes sense relative to the old project dates
                      // If the date is way off, try adjacent years
                      const projectYear = new Date(oldProject.startDate).getFullYear()
                      if (Math.abs(currentYear - projectYear) > 1) {
                        oldDate.setFullYear(projectYear)
                      }
                      
                      const newDate = new Date(oldDate.getTime() + (weekDifference * msPerWeek))
                      const newDateStr = newDate.toISOString().split('T')[0]
                      const newWeekStr = newDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      }).toUpperCase()
                      
                      console.log('Inferred date shift from', a.week, 'to', newWeekStr)
                      
                      return { ...a, date: newDateStr, week: newWeekStr }
                    }
                  }
                  
                  // If we can't parse it, keep as is
                  console.log('Could not parse week string, keeping as is')
                  return a
                }
              }
              return a
            })
            
            console.log('Updated assignments count:', updatedAssignments.filter(a => 
              a.projectId === id || a.projectId === oldProject.name
            ).length)
            
            return {
              projects: state.projects.map(p => 
                p.id === id ? { ...p, ...data } : p
              ),
              assignments: updatedAssignments
            }
          } else {
            console.log('No week difference, skipping assignment update')
          }
        } else {
          console.log('No date change or missing data, only updating project')
        }
        
        // If no date change or no assignments affected, just update the project
        return {
          projects: state.projects.map(p => 
            p.id === id ? { ...p, ...data } : p
          ),
        }
      }),

      addProject: (project) => set((state) => {
        // Generate a unique ID for the new project
        const newId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newProject: Project = {
          ...project,
          id: newId
        }
        return {
          projects: [...state.projects, newProject]
        }
      }),

      updateAssignment: (id, data) => set((state) => ({
        assignments: state.assignments.map(a => 
          a.id === id ? { ...a, ...data } : a
        ),
      })),

      addAssignment: (assignment) => set((state) => ({
        assignments: [...state.assignments, assignment],
      })),

      removeAssignment: (id) => set((state) => ({
        assignments: state.assignments.filter(a => a.id !== id),
      })),

      clearData: () => set(initialState),
      
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: 'schedule-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        employees: state.employees,
        projects: state.projects,
        assignments: state.assignments,
        skills: state.skills,
        teams: state.teams,
        selectedTeam: state.selectedTeam,
        dateRange: state.dateRange,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert dateRange strings back to Date objects after rehydration
        if (state?.dateRange) {
          state.dateRange = {
            startDate: new Date(state.dateRange.startDate),
            endDate: new Date(state.dateRange.endDate)
          }
        }
        state?.setHasHydrated(true)
      },
    }
  )
)