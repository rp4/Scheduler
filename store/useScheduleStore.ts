import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ScheduleData, Employee, Project, Assignment } from '@/types/schedule'

interface ScheduleState extends ScheduleData {
  selectedTeam: string
  hasHydrated: boolean
  
  // Actions
  loadData: (data: ScheduleData) => void
  setSelectedTeam: (team: string) => void
  updateEmployee: (id: string, data: Partial<Employee>) => void
  updateProject: (id: string, data: Partial<Project>) => void
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
          teams: ['All Teams', ...Array.from(new Set(data.employees.map(e => e.team).filter(Boolean)))],
        }))
      },

      setSelectedTeam: (team) => set({ selectedTeam: team }),

      updateEmployee: (id, data) => set((state) => ({
        employees: state.employees.map(e => 
          e.id === id ? { ...e, ...data } : e
        ),
      })),

      updateProject: (id, data) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === id ? { ...p, ...data } : p
        ),
      })),

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
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)