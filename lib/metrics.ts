import { Employee, Project, Assignment } from '@/types/schedule'

export function calculateMetrics(
  employees: Employee[],
  projects: Project[],
  assignments: Assignment[]
) {
  let overtimeHours = 0
  let totalCapacity = 0
  let totalUsed = 0
  let skillsMatching = 0

  // Calculate overtime and utilization
  const employeeHours = new Map<string, number>()
  
  assignments.forEach(assignment => {
    const current = employeeHours.get(assignment.employeeId) || 0
    employeeHours.set(assignment.employeeId, current + assignment.hours)
  })

  employees.forEach(employee => {
    const hours = employeeHours.get(employee.id) || 0
    totalCapacity += employee.maxHours
    totalUsed += Math.min(hours, employee.maxHours)
    
    if (hours > employee.maxHours) {
      overtimeHours += hours - employee.maxHours
    }
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
              skillsMatching += 3
              break
            case 'Intermediate':
              skillsMatching += 2
              break
            case 'Beginner':
              skillsMatching += 1
              break
          }
        }
      })
    }
  })

  const resourceUtilization = totalCapacity > 0 
    ? Math.round((totalUsed / totalCapacity) * 100)
    : 0

  return {
    overtimeHours: Math.round(overtimeHours),
    resourceUtilization,
    skillsMatching: Math.round(skillsMatching),
  }
}