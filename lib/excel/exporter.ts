import * as XLSX from 'xlsx'
import { ScheduleData } from '@/types/schedule'
import { formatDate } from '@/lib/utils'

export async function exportToExcel(data: ScheduleData): Promise<void> {
  const wb = XLSX.utils.book_new()

  // Employees sheet
  const employeesData = data.employees.map(emp => {
    const row: any = {
      ID: emp.id,
      Name: emp.name,
      Email: emp.email || '',
      'Max Hours': emp.maxHours,
      Team: emp.team || 'Default',
    }
    
    // Add skill columns
    Object.entries(emp.skills).forEach(([skill, level]) => {
      row[skill] = level
    })
    
    return row
  })
  
  if (employeesData.length > 0) {
    const ws1 = XLSX.utils.json_to_sheet(employeesData)
    XLSX.utils.book_append_sheet(wb, ws1, 'Employees')
  }

  // Projects sheet
  const projectsData = data.projects.map(proj => ({
    ID: proj.id,
    Name: proj.name,
    'Start Date': formatDate(proj.startDate),
    'End Date': formatDate(proj.endDate),
    'Required Skills': proj.requiredSkills?.join(', ') || '',
    Portfolio: proj.portfolio || '',
  }))
  
  if (projectsData.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(projectsData)
    XLSX.utils.book_append_sheet(wb, ws2, 'Projects')
  }

  // Assignments sheet
  const assignmentsData = data.assignments.map(assign => ({
    'Employee ID': assign.employeeId,
    'Project ID': assign.projectId,
    Hours: assign.hours,
    Week: assign.week,
  }))
  
  if (assignmentsData.length > 0) {
    const ws3 = XLSX.utils.json_to_sheet(assignmentsData)
    XLSX.utils.book_append_sheet(wb, ws3, 'Assignments')
  }

  // Skills sheet
  if (data.skills && data.skills.length > 0) {
    const skillsData = data.employees.map(emp => {
      const row: any = { Employee: emp.name }
      data.skills.forEach(skill => {
        row[skill] = emp.skills[skill] || 'None'
      })
      return row
    })
    
    const ws4 = XLSX.utils.json_to_sheet(skillsData)
    XLSX.utils.book_append_sheet(wb, ws4, 'Skills')
  }

  // Generate and download file
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `schedule_${new Date().toISOString().split('T')[0]}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}