import { ScheduleData, Assignment } from '@/types/schedule'
import { generateId } from '@/lib/utils'

interface OptimizationWeights {
  overtime: number
  utilization: number
  skills: number
}

interface OptimizationResult {
  assignments: Assignment[]
  score: number
  metrics: {
    overtimeReduction: number
    utilizationImprovement: number
    skillsMatchImprovement: number
  }
}

export async function optimizeSchedule(
  data: ScheduleData,
  algorithm: 'genetic' | 'annealing' | 'constraint',
  weights: OptimizationWeights,
  onProgress?: (progress: number) => void
): Promise<OptimizationResult> {
  // Simulate async optimization
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // For now, return a simple optimization that reduces overtime
  const optimizedAssignments = redistributeHours(data)
  
  // Simulate progress
  if (onProgress) {
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      onProgress(i)
    }
  }

  return {
    assignments: optimizedAssignments,
    score: calculateScore(optimizedAssignments, data, weights),
    metrics: {
      overtimeReduction: 15,
      utilizationImprovement: 10,
      skillsMatchImprovement: 8,
    },
  }
}

function redistributeHours(data: ScheduleData): Assignment[] {
  const { employees, projects, assignments } = data
  const newAssignments: Assignment[] = []

  // Calculate current load per employee
  const employeeHours = new Map<string, number>()
  assignments.forEach(a => {
    const current = employeeHours.get(a.employeeId) || 0
    employeeHours.set(a.employeeId, current + a.hours)
  })

  // Redistribute hours from overloaded employees
  assignments.forEach(assignment => {
    const employee = employees.find(e => e.id === assignment.employeeId)
    if (!employee) {
      newAssignments.push(assignment)
      return
    }

    const currentHours = employeeHours.get(employee.id) || 0
    
    if (currentHours > employee.maxHours) {
      // Reduce hours proportionally
      const ratio = employee.maxHours / currentHours
      newAssignments.push({
        ...assignment,
        hours: Math.round(assignment.hours * ratio),
      })
    } else {
      newAssignments.push(assignment)
    }
  })

  return newAssignments
}

function calculateScore(
  assignments: Assignment[],
  data: ScheduleData,
  weights: OptimizationWeights
): number {
  const { employees, projects } = data
  
  let overtimeScore = 0
  let utilizationScore = 0
  let skillsScore = 0

  // Calculate overtime penalty
  const employeeHours = new Map<string, number>()
  assignments.forEach(a => {
    const current = employeeHours.get(a.employeeId) || 0
    employeeHours.set(a.employeeId, current + a.hours)
  })

  employees.forEach(employee => {
    const hours = employeeHours.get(employee.id) || 0
    if (hours > employee.maxHours) {
      overtimeScore -= (hours - employee.maxHours) * weights.overtime
    }
    utilizationScore += (hours / employee.maxHours) * weights.utilization
  })

  // Calculate skills matching
  assignments.forEach(assignment => {
    const employee = employees.find(e => e.id === assignment.employeeId)
    const project = projects.find(p => p.id === assignment.projectId)
    
    if (employee && project && project.requiredSkills) {
      project.requiredSkills.forEach(skill => {
        if (employee.skills[skill]) {
          switch (employee.skills[skill]) {
            case 'Expert':
              skillsScore += 3 * weights.skills
              break
            case 'Intermediate':
              skillsScore += 2 * weights.skills
              break
            case 'Beginner':
              skillsScore += 1 * weights.skills
              break
          }
        }
      })
    }
  })

  return overtimeScore + utilizationScore + skillsScore
}