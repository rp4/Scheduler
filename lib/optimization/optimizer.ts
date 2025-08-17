import { ScheduleData, Assignment } from '@/types/schedule'
import { calculateSkillsMatch, createSkillScoreMatrix, calculateResourceUtilization } from '@/lib/metrics'

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
  // Pre-compute skill score matrix for performance
  const skillScoreMatrix = createSkillScoreMatrix(data.employees, data.projects)
  
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
    score: calculateScoreOptimized(optimizedAssignments, data, weights, skillScoreMatrix),
    metrics: {
      overtimeReduction: 15,
      utilizationImprovement: 10,
      skillsMatchImprovement: 8,
    },
  }
}

function redistributeHours(data: ScheduleData): Assignment[] {
  const { employees, assignments } = data
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

/**
 * Optimized score calculation using pre-computed skill matrix and efficient utilization
 */
function calculateScoreOptimized(
  assignments: Assignment[],
  data: ScheduleData,
  weights: OptimizationWeights,
  skillScoreMatrix: Map<string, Map<string, number>>
): number {
  const { employees } = data
  
  let overtimeScore = 0
  let skillsScore = 0

  // Calculate overtime penalty and skills in single pass
  const employeeHours = new Map<string, number>()
  
  for (const assignment of assignments) {
    // Update employee hours
    const current = employeeHours.get(assignment.employeeId) || 0
    employeeHours.set(assignment.employeeId, current + assignment.hours)
    
    // Add skills score using pre-computed matrix
    const employeeSkills = skillScoreMatrix.get(assignment.employeeId)
    if (employeeSkills) {
      const score = employeeSkills.get(assignment.projectId)
      if (score) {
        skillsScore += score * weights.skills
      }
    }
  }

  // Calculate overtime penalty
  for (const employee of employees) {
    const hours = employeeHours.get(employee.id) || 0
    if (hours > employee.maxHours) {
      overtimeScore -= (hours - employee.maxHours) * weights.overtime
    }
  }
  
  // Use the optimized utilization calculation
  const utilization = calculateResourceUtilization(employees, assignments)
  const utilizationScore = utilization * weights.utilization

  return overtimeScore + utilizationScore + skillsScore
}

/**
 * Legacy score calculation using new optimized utilization
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _calculateScore(
  assignments: Assignment[],
  data: ScheduleData,
  weights: OptimizationWeights
): number {
  // Create maps for efficient lookup
  const employeeMap = new Map(data.employees.map(e => [e.id, e]))
  const projectMap = new Map(data.projects.map(p => [p.id, p]))
  
  // Use the optimized skills matching function
  const skillsScore = calculateSkillsMatch(assignments, employeeMap, projectMap) * weights.skills
  
  let overtimeScore = 0

  // Calculate overtime penalty
  const employeeHours = new Map<string, number>()
  assignments.forEach(a => {
    const current = employeeHours.get(a.employeeId) || 0
    employeeHours.set(a.employeeId, current + a.hours)
  })

  data.employees.forEach(employee => {
    const hours = employeeHours.get(employee.id) || 0
    if (hours > employee.maxHours) {
      overtimeScore -= (hours - employee.maxHours) * weights.overtime
    }
  })
  
  // Use the optimized utilization calculation
  const utilization = calculateResourceUtilization(data.employees, assignments)
  const utilizationScore = utilization * weights.utilization

  return overtimeScore + utilizationScore + skillsScore
}