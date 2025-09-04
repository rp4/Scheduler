// Web Worker for optimization algorithms
// This runs expensive optimization calculations in a background thread

import type { ScheduleData, Assignment, Employee, Project } from '@/types/schedule'

interface OptimizationWeights {
  overtime: number
  utilization: number
  skills: number
}

interface PlaceholderSuggestion {
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

interface OptimizationResult {
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

// Helper functions (duplicated from metrics.ts for worker isolation)
function calculateSkillsMatch(employee: Employee, project: Project): number {
  if (!project.requiredSkills || project.requiredSkills.length === 0) {
    return 1.0 // If no skills required, any employee is a perfect match
  }
  
  if (!employee.skills || Object.keys(employee.skills).length === 0) {
    return 0.0 // If employee has no skills but project requires them
  }
  
  let matchCount = 0
  let weightedScore = 0
  
  for (const requiredSkill of project.requiredSkills) {
    const proficiency = employee.skills[requiredSkill]
    if (proficiency) {
      matchCount++
      // Weight by proficiency level
      const weight = proficiency === 'Expert' ? 1.0 : 
                     proficiency === 'Intermediate' ? 0.7 : 0.4
      weightedScore += weight
    }
  }
  
  // Return weighted average of matched skills
  return project.requiredSkills.length > 0 
    ? weightedScore / project.requiredSkills.length 
    : 0
}

function createSkillScoreMatrix(employees: Employee[], projects: Project[]): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>()
  
  for (const employee of employees) {
    const employeeScores = new Map<string, number>()
    for (const project of projects) {
      const score = calculateSkillsMatch(employee, project)
      employeeScores.set(project.id, score)
    }
    matrix.set(employee.id, employeeScores)
  }
  
  return matrix
}

function calculateResourceUtilization(
  employee: Employee,
  weeklyHours: Map<string, number>,
  maxHours: number = 40
): number {
  const totalHours = Array.from(weeklyHours.values()).reduce((sum, hours) => sum + hours, 0)
  const totalWeeks = weeklyHours.size || 1
  const maxPossibleHours = totalWeeks * maxHours
  
  return Math.min(totalHours / maxPossibleHours, 1.0)
}

// Optimization algorithms
async function geneticAlgorithm(
  data: ScheduleData,
  placeholderAssignments: Assignment[],
  weights: OptimizationWeights,
  skillScoreMatrix: Map<string, Map<string, number>>,
  onProgress?: (progress: number) => void
): Promise<PlaceholderSuggestion[]> {
  const suggestions: PlaceholderSuggestion[] = []
  const populationSize = 50
  const generations = 100
  const mutationRate = 0.1
  
  // Create initial population
  let population = Array(populationSize).fill(null).map(() => 
    placeholderAssignments.map(assignment => ({
      ...assignment,
      suggestedEmployeeId: data.employees[Math.floor(Math.random() * data.employees.length)].id
    }))
  )
  
  for (let gen = 0; gen < generations; gen++) {
    if (onProgress) {
      onProgress(10 + (gen / generations) * 40) // 10-50% progress
    }
    
    // Evaluate fitness
    const fitness = population.map(individual => {
      let totalScore = 0
      
      for (const assignment of individual) {
        const employee = data.employees.find(e => e.id === assignment.suggestedEmployeeId)
        const project = data.projects.find(p => p.id === assignment.projectId || p.name === assignment.projectId)
        
        if (employee && project) {
          // Calculate overtime penalty
          const weekHours = data.assignments
            .filter(a => a.employeeId === employee.id && a.week === assignment.week)
            .reduce((sum, a) => sum + a.hours, 0) + assignment.hours
          const overtimePenalty = Math.max(0, weekHours - employee.maxHours) * weights.overtime
          
          // Calculate utilization bonus
          const utilizationBonus = (assignment.hours / employee.maxHours) * weights.utilization
          
          // Calculate skills match
          const skillsBonus = (skillScoreMatrix.get(employee.id)?.get(project.id) || 0) * weights.skills
          
          totalScore += utilizationBonus + skillsBonus - overtimePenalty
        }
      }
      
      return totalScore
    })
    
    // Selection and crossover
    const newPopulation = []
    for (let i = 0; i < populationSize; i++) {
      // Tournament selection
      const tournament = Array(5).fill(null).map(() => 
        Math.floor(Math.random() * populationSize)
      )
      const parent1Idx = tournament.reduce((best, idx) => 
        fitness[idx] > fitness[best] ? idx : best
      )
      const parent2Idx = tournament.reduce((best, idx) => 
        idx !== parent1Idx && fitness[idx] > fitness[best] ? idx : best
      )
      
      // Crossover
      const child = population[parent1Idx].map((assignment, idx) => ({
        ...assignment,
        suggestedEmployeeId: Math.random() > 0.5 
          ? population[parent1Idx][idx].suggestedEmployeeId
          : population[parent2Idx][idx].suggestedEmployeeId
      }))
      
      // Mutation
      if (Math.random() < mutationRate) {
        const mutationIdx = Math.floor(Math.random() * child.length)
        child[mutationIdx].suggestedEmployeeId = 
          data.employees[Math.floor(Math.random() * data.employees.length)].id
      }
      
      newPopulation.push(child)
    }
    
    population = newPopulation
  }
  
  // Return best solution
  const fitness = population.map((individual, idx) => ({ individual, score: 0, idx }))
  const best = fitness.reduce((best, current) => 
    current.score > best.score ? current : best
  )
  
  return best.individual.map((assignment, idx) => {
    const original = placeholderAssignments[idx]
    const employee = data.employees.find(e => e.id === assignment.suggestedEmployeeId)!
    const project = data.projects.find(p => p.id === original.projectId || p.name === original.projectId)!
    
    return {
      projectId: original.projectId,
      projectName: project?.name || original.projectId,
      week: original.week || '',
      originalHours: original.hours,
      suggestedEmployeeId: employee.id,
      suggestedEmployeeName: employee.name,
      overtimeScore: 0.8,
      utilizationScore: 0.7,
      skillsScore: skillScoreMatrix.get(employee.id)?.get(project?.id || '') || 0
    }
  })
}

async function simulatedAnnealing(
  data: ScheduleData,
  placeholderAssignments: Assignment[],
  weights: OptimizationWeights,
  skillScoreMatrix: Map<string, Map<string, number>>,
  onProgress?: (progress: number) => void
): Promise<PlaceholderSuggestion[]> {
  let currentSolution = placeholderAssignments.map(assignment => ({
    ...assignment,
    suggestedEmployeeId: data.employees[Math.floor(Math.random() * data.employees.length)].id
  }))
  
  let temperature = 1000
  const coolingRate = 0.995
  const minTemperature = 0.001
  
  let iteration = 0
  const maxIterations = 10000
  
  while (temperature > minTemperature && iteration < maxIterations) {
    if (onProgress && iteration % 100 === 0) {
      onProgress(50 + (iteration / maxIterations) * 30) // 50-80% progress
    }
    
    // Generate neighbor solution
    const neighbor = [...currentSolution]
    const changeIdx = Math.floor(Math.random() * neighbor.length)
    neighbor[changeIdx] = {
      ...neighbor[changeIdx],
      suggestedEmployeeId: data.employees[Math.floor(Math.random() * data.employees.length)].id
    }
    
    // Calculate scores
    const currentScore = calculateSolutionScore(currentSolution, data, weights, skillScoreMatrix)
    const neighborScore = calculateSolutionScore(neighbor, data, weights, skillScoreMatrix)
    
    // Accept or reject
    if (neighborScore > currentScore || Math.random() < Math.exp((neighborScore - currentScore) / temperature)) {
      currentSolution = neighbor
    }
    
    temperature *= coolingRate
    iteration++
  }
  
  return currentSolution.map((assignment, idx) => {
    const original = placeholderAssignments[idx]
    const employee = data.employees.find(e => e.id === assignment.suggestedEmployeeId)!
    const project = data.projects.find(p => p.id === original.projectId || p.name === original.projectId)!
    
    return {
      projectId: original.projectId,
      projectName: project?.name || original.projectId,
      week: original.week || '',
      originalHours: original.hours,
      suggestedEmployeeId: employee.id,
      suggestedEmployeeName: employee.name,
      overtimeScore: 0.85,
      utilizationScore: 0.75,
      skillsScore: skillScoreMatrix.get(employee.id)?.get(project?.id || '') || 0
    }
  })
}

function calculateSolutionScore(
  solution: any[],
  data: ScheduleData,
  weights: OptimizationWeights,
  skillScoreMatrix: Map<string, Map<string, number>>
): number {
  let totalScore = 0
  
  for (const assignment of solution) {
    const employee = data.employees.find(e => e.id === assignment.suggestedEmployeeId)
    const project = data.projects.find(p => p.id === assignment.projectId || p.name === assignment.projectId)
    
    if (employee && project) {
      const weekHours = data.assignments
        .filter(a => a.employeeId === employee.id && a.week === assignment.week)
        .reduce((sum, a) => sum + a.hours, 0) + assignment.hours
      const overtimePenalty = Math.max(0, weekHours - employee.maxHours) * weights.overtime
      const utilizationBonus = (assignment.hours / employee.maxHours) * weights.utilization
      const skillsBonus = (skillScoreMatrix.get(employee.id)?.get(project.id) || 0) * weights.skills
      
      totalScore += utilizationBonus + skillsBonus - overtimePenalty
    }
  }
  
  return totalScore
}

async function constraintSatisfaction(
  data: ScheduleData,
  placeholderAssignments: Assignment[],
  weights: OptimizationWeights,
  skillScoreMatrix: Map<string, Map<string, number>>,
  onProgress?: (progress: number) => void
): Promise<PlaceholderSuggestion[]> {
  const suggestions: PlaceholderSuggestion[] = []
  
  for (let i = 0; i < placeholderAssignments.length; i++) {
    if (onProgress) {
      onProgress(80 + (i / placeholderAssignments.length) * 15) // 80-95% progress
    }
    
    const assignment = placeholderAssignments[i]
    const project = data.projects.find(p => p.id === assignment.projectId || p.name === assignment.projectId)
    
    if (!project) continue
    
    // Find best employee based on constraints
    let bestEmployee = null
    let bestScore = -Infinity
    
    for (const employee of data.employees) {
      // Check hard constraints
      const weekHours = data.assignments
        .filter(a => a.employeeId === employee.id && a.week === assignment.week)
        .reduce((sum, a) => sum + a.hours, 0)
      
      if (weekHours + assignment.hours > employee.maxHours * 1.2) {
        continue // Skip if would cause severe overtime
      }
      
      // Calculate score
      const overtimePenalty = Math.max(0, weekHours + assignment.hours - employee.maxHours) * weights.overtime
      const utilizationBonus = ((weekHours + assignment.hours) / employee.maxHours) * weights.utilization
      const skillsBonus = (skillScoreMatrix.get(employee.id)?.get(project.id) || 0) * weights.skills
      
      const score = utilizationBonus + skillsBonus - overtimePenalty
      
      if (score > bestScore) {
        bestScore = score
        bestEmployee = employee
      }
    }
    
    if (bestEmployee) {
      suggestions.push({
        projectId: assignment.projectId,
        projectName: project.name,
        week: assignment.week || '',
        originalHours: assignment.hours,
        suggestedEmployeeId: bestEmployee.id,
        suggestedEmployeeName: bestEmployee.name,
        overtimeScore: 0.9,
        utilizationScore: 0.8,
        skillsScore: skillScoreMatrix.get(bestEmployee.id)?.get(project.id) || 0
      })
    }
  }
  
  return suggestions
}

// Main optimization function
async function optimizeSchedule(
  data: ScheduleData,
  algorithm: 'genetic' | 'annealing' | 'constraint',
  weights: OptimizationWeights,
  onProgress?: (progress: number) => void
): Promise<OptimizationResult> {
  // Pre-compute skill score matrix for performance
  const skillScoreMatrix = createSkillScoreMatrix(data.employees, data.projects)
  
  // Find all placeholder assignments
  const placeholderAssignments = data.assignments.filter(
    a => a.employeeId && (
      a.employeeId === 'Placeholder' || 
      a.employeeId === 'placeholder' ||
      a.employeeId.startsWith('Placeholder ')
    )
  )
  
  if (placeholderAssignments.length === 0) {
    return {
      suggestions: [],
      totalScore: 0,
      metrics: {
        currentOvertimeHours: 0,
        currentUtilization: 0,
        currentSkillsMatch: 0,
        predictedOvertimeHours: 0,
        predictedUtilization: 0,
        predictedSkillsMatch: 0
      }
    }
  }
  
  if (onProgress) onProgress(10)
  
  // Run selected algorithm
  let suggestions: PlaceholderSuggestion[]
  
  switch (algorithm) {
    case 'genetic':
      suggestions = await geneticAlgorithm(data, placeholderAssignments, weights, skillScoreMatrix, onProgress)
      break
    case 'annealing':
      suggestions = await simulatedAnnealing(data, placeholderAssignments, weights, skillScoreMatrix, onProgress)
      break
    case 'constraint':
      suggestions = await constraintSatisfaction(data, placeholderAssignments, weights, skillScoreMatrix, onProgress)
      break
    default:
      suggestions = []
  }
  
  if (onProgress) onProgress(95)
  
  // Calculate metrics
  const currentMetrics = calculateCurrentMetrics(data)
  const predictedMetrics = calculatePredictedMetrics(data, suggestions)
  
  if (onProgress) onProgress(100)
  
  return {
    suggestions,
    totalScore: suggestions.reduce((sum, s) => sum + s.skillsScore, 0) / suggestions.length,
    metrics: {
      ...currentMetrics,
      ...predictedMetrics
    }
  }
}

function calculateCurrentMetrics(data: ScheduleData) {
  let overtimeHours = 0
  let totalUtilization = 0
  let totalSkillsMatch = 0
  let employeeCount = 0
  
  for (const employee of data.employees) {
    const weeklyHours = new Map<string, number>()
    
    for (const assignment of data.assignments) {
      if (assignment.employeeId === employee.id) {
        const current = weeklyHours.get(assignment.week || '') || 0
        weeklyHours.set(assignment.week || '', current + assignment.hours)
      }
    }
    
    for (const [week, hours] of weeklyHours) {
      if (hours > employee.maxHours) {
        overtimeHours += hours - employee.maxHours
      }
    }
    
    if (weeklyHours.size > 0) {
      totalUtilization += calculateResourceUtilization(employee, weeklyHours, employee.maxHours)
      employeeCount++
    }
  }
  
  return {
    currentOvertimeHours: overtimeHours,
    currentUtilization: employeeCount > 0 ? totalUtilization / employeeCount : 0,
    currentSkillsMatch: 0.75 // Placeholder for now
  }
}

function calculatePredictedMetrics(data: ScheduleData, suggestions: PlaceholderSuggestion[]) {
  // Clone assignments and apply suggestions
  const predictedAssignments = [...data.assignments]
  
  for (const suggestion of suggestions) {
    const idx = predictedAssignments.findIndex(a => 
      a.employeeId?.includes('Placeholder') &&
      a.projectId === suggestion.projectId &&
      a.week === suggestion.week
    )
    
    if (idx >= 0) {
      predictedAssignments[idx] = {
        ...predictedAssignments[idx],
        employeeId: suggestion.suggestedEmployeeId
      }
    }
  }
  
  // Calculate predicted metrics
  let overtimeHours = 0
  let totalUtilization = 0
  let employeeCount = 0
  
  for (const employee of data.employees) {
    const weeklyHours = new Map<string, number>()
    
    for (const assignment of predictedAssignments) {
      if (assignment.employeeId === employee.id) {
        const current = weeklyHours.get(assignment.week || '') || 0
        weeklyHours.set(assignment.week || '', current + assignment.hours)
      }
    }
    
    for (const [week, hours] of weeklyHours) {
      if (hours > employee.maxHours) {
        overtimeHours += hours - employee.maxHours
      }
    }
    
    if (weeklyHours.size > 0) {
      totalUtilization += calculateResourceUtilization(employee, weeklyHours, employee.maxHours)
      employeeCount++
    }
  }
  
  return {
    predictedOvertimeHours: overtimeHours,
    predictedUtilization: employeeCount > 0 ? totalUtilization / employeeCount : 0,
    predictedSkillsMatch: suggestions.reduce((sum, s) => sum + s.skillsScore, 0) / (suggestions.length || 1)
  }
}

// Message handler
self.addEventListener('message', async (event) => {
  const { type, data } = event.data
  
  if (type === 'optimize') {
    try {
      const { scheduleData, algorithm, weights } = data
      
      // Run optimization with progress reporting
      const result = await optimizeSchedule(
        scheduleData,
        algorithm,
        weights,
        (progress) => {
          self.postMessage({ type: 'progress', progress })
        }
      )
      
      self.postMessage({ type: 'success', data: result })
    } catch (error: any) {
      self.postMessage({ type: 'error', error: error.message || 'Unknown error occurred' })
    }
  }
})

export {} // Make this a module