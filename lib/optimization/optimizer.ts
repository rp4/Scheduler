import { ScheduleData, Assignment, Employee, Project } from '@/types/schedule'
import { calculateSkillsMatch, createSkillScoreMatrix, calculateResourceUtilization } from '@/lib/metrics'

interface OptimizationWeights {
  overtime: number
  utilization: number
  skills: number
}

export interface PlaceholderSuggestion {
  projectId: string
  projectName: string
  week: string
  originalHours: number
  suggestedEmployeeId: string
  suggestedEmployeeName: string
  overtimeScore: number
  utilizationScore: number
  skillsScore: number
}

export interface OptimizationResult {
  suggestions: PlaceholderSuggestion[]
  totalScore: number
  metrics: {
    currentOvertimeHours: number
    currentUtilization: number
    currentSkillsMatch: number
    predictedOvertimeHours: number
    predictedUtilization: number
    predictedSkillsMatch: number
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
  
  // Find all placeholder assignments
  const placeholderAssignments = data.assignments.filter(
    a => a.employeeId === 'Placeholder' || a.employeeId === 'placeholder'
  )
  
  if (placeholderAssignments.length === 0) {
    // No placeholders to optimize
    return {
      suggestions: [],
      totalScore: 0,
      metrics: {
        currentOvertimeHours: calculateTotalOvertime(data.employees, data.assignments),
        currentUtilization: calculateResourceUtilization(data.employees, data.assignments),
        currentSkillsMatch: calculateSkillsMatch(data.assignments, 
          new Map(data.employees.map(e => [e.id, e])),
          new Map(data.projects.map(p => [p.id, p]))
        ),
        predictedOvertimeHours: calculateTotalOvertime(data.employees, data.assignments),
        predictedUtilization: calculateResourceUtilization(data.employees, data.assignments),
        predictedSkillsMatch: calculateSkillsMatch(data.assignments,
          new Map(data.employees.map(e => [e.id, e])),
          new Map(data.projects.map(p => [p.id, p]))
        ),
      }
    }
  }
  
  // Progress tracking
  if (onProgress) onProgress(10)
  
  // Find best employee for each placeholder assignment
  const suggestions: PlaceholderSuggestion[] = []
  const projectMap = new Map(data.projects.map(p => [p.id, p]))
  
  for (let i = 0; i < placeholderAssignments.length; i++) {
    const placeholder = placeholderAssignments[i]
    const project = projectMap.get(placeholder.projectId)
    
    if (!project) continue
    
    // Find best employee based on algorithm
    const bestEmployee = await findBestEmployee(
      placeholder,
      project,
      data,
      weights,
      skillScoreMatrix,
      algorithm
    )
    
    if (bestEmployee) {
      // Calculate individual scores for this assignment
      const scores = calculateAssignmentScores(
        bestEmployee,
        placeholder,
        project,
        data,
        skillScoreMatrix
      )
      
      suggestions.push({
        projectId: project.id,
        projectName: project.name,
        week: placeholder.week,
        originalHours: placeholder.hours,
        suggestedEmployeeId: bestEmployee.id,
        suggestedEmployeeName: bestEmployee.name,
        overtimeScore: scores.overtime,
        utilizationScore: scores.utilization,
        skillsScore: scores.skills,
      })
    }
    
    if (onProgress) {
      onProgress(10 + (i / placeholderAssignments.length) * 80)
    }
  }
  
  // Calculate predicted metrics if suggestions are applied
  const predictedAssignments = applysuggestions(data.assignments, suggestions)
  
  if (onProgress) onProgress(100)
  
  return {
    suggestions,
    totalScore: calculateTotalScore(suggestions, weights),
    metrics: {
      currentOvertimeHours: calculateTotalOvertime(data.employees, data.assignments),
      currentUtilization: calculateResourceUtilization(data.employees, data.assignments),
      currentSkillsMatch: calculateSkillsMatch(data.assignments,
        new Map(data.employees.map(e => [e.id, e])),
        new Map(data.projects.map(p => [p.id, p]))
      ),
      predictedOvertimeHours: calculateTotalOvertime(data.employees, predictedAssignments),
      predictedUtilization: calculateResourceUtilization(data.employees, predictedAssignments),
      predictedSkillsMatch: calculateSkillsMatch(predictedAssignments,
        new Map(data.employees.map(e => [e.id, e])),
        new Map(data.projects.map(p => [p.id, p]))
      ),
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _redistributeHours(data: ScheduleData): Assignment[] {
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _calculateScoreOptimized(
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


// Helper functions for optimization
function calculateTotalOvertime(employees: Employee[], assignments: Assignment[]): number {
  const employeeHours = new Map<string, number>()
  
  assignments.forEach(a => {
    if (a.employeeId !== 'Placeholder' && a.employeeId !== 'placeholder') {
      const current = employeeHours.get(a.employeeId) || 0
      employeeHours.set(a.employeeId, current + a.hours)
    }
  })
  
  let totalOvertime = 0
  employees.forEach(employee => {
    const hours = employeeHours.get(employee.id) || 0
    if (hours > employee.maxHours) {
      totalOvertime += hours - employee.maxHours
    }
  })
  
  return totalOvertime
}

async function findBestEmployee(
  placeholder: Assignment,
  project: Project,
  data: ScheduleData,
  weights: OptimizationWeights,
  skillScoreMatrix: Map<string, Map<string, number>>,
  _algorithm: 'genetic' | 'annealing' | 'constraint'
): Promise<Employee | null> {
  const candidates = data.employees.filter(e => e.id !== 'placeholder' && e.id !== 'Placeholder')
  
  if (candidates.length === 0) return null
  
  let bestEmployee: Employee | null = null
  let bestScore = -Infinity
  
  // Simple greedy approach for now - can be enhanced with actual algorithms
  for (const employee of candidates) {
    // Calculate employee's current hours
    const currentHours = data.assignments
      .filter(a => a.employeeId === employee.id)
      .reduce((sum, a) => sum + a.hours, 0)
    
    // Skip if adding this assignment would cause overtime
    const wouldCauseOvertime = (currentHours + placeholder.hours) > employee.maxHours
    
    // Get skill score
    const employeeSkills = skillScoreMatrix.get(employee.id)
    const skillScore = employeeSkills?.get(project.id) || 0
    
    // Calculate combined score
    let score = 0
    
    // Penalize overtime
    if (wouldCauseOvertime) {
      score -= weights.overtime * ((currentHours + placeholder.hours) - employee.maxHours)
    }
    
    // Reward utilization (closer to max hours is better)
    const utilizationRatio = (currentHours + placeholder.hours) / employee.maxHours
    if (utilizationRatio <= 1) {
      score += weights.utilization * utilizationRatio
    }
    
    // Add skill score
    score += weights.skills * skillScore
    
    if (score > bestScore) {
      bestScore = score
      bestEmployee = employee
    }
  }
  
  return bestEmployee
}

function calculateAssignmentScores(
  employee: Employee,
  assignment: Assignment,
  project: Project,
  data: ScheduleData,
  skillScoreMatrix: Map<string, Map<string, number>>
): { overtime: number; utilization: number; skills: number } {
  // Calculate current hours for the employee
  const currentHours = data.assignments
    .filter(a => a.employeeId === employee.id)
    .reduce((sum, a) => sum + a.hours, 0)
  
  const newTotalHours = currentHours + assignment.hours
  
  // Overtime score (negative if over max hours)
  const overtimeScore = newTotalHours > employee.maxHours 
    ? -(newTotalHours - employee.maxHours) 
    : 0
  
  // Utilization score (0-100%)
  const utilizationScore = Math.min(100, (newTotalHours / employee.maxHours) * 100)
  
  // Skills score (0-100%)
  const employeeSkills = skillScoreMatrix.get(employee.id)
  const skillScore = (employeeSkills?.get(project.id) || 0) * 100
  
  return {
    overtime: overtimeScore,
    utilization: utilizationScore,
    skills: skillScore,
  }
}

function applysuggestions(
  assignments: Assignment[],
  suggestions: PlaceholderSuggestion[]
): Assignment[] {
  const result = [...assignments]
  
  // Remove placeholder assignments
  const filtered = result.filter(
    a => a.employeeId !== 'Placeholder' && a.employeeId !== 'placeholder'
  )
  
  // Add suggested assignments
  suggestions.forEach(suggestion => {
    filtered.push({
      id: `${suggestion.suggestedEmployeeId}-${suggestion.projectId}-${suggestion.week}`,
      employeeId: suggestion.suggestedEmployeeId,
      projectId: suggestion.projectId,
      week: suggestion.week,
      hours: suggestion.originalHours,
    })
  })
  
  return filtered
}

function calculateTotalScore(
  suggestions: PlaceholderSuggestion[],
  weights: OptimizationWeights
): number {
  return suggestions.reduce((total, s) => {
    return total + 
      (s.overtimeScore * weights.overtime) +
      (s.utilizationScore * weights.utilization) +
      (s.skillsScore * weights.skills)
  }, 0)
}
