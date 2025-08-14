import * as XLSX from 'xlsx'
import { ScheduleData, Employee, Project, Assignment, ProficiencyLevel } from '@/types/schedule'
import { generateId, parseDate, getCurrentWeek } from '@/lib/utils'

export async function parseExcelFile(file: File): Promise<ScheduleData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const result = parseWorkbook(workbook)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

function parseWorkbook(workbook: XLSX.WorkBook): ScheduleData {
  const result: ScheduleData = {
    employees: [],
    projects: [],
    assignments: [],
    skills: [],
    teams: ['All Teams'],
  }

  // Parse Employees sheet
  if (workbook.Sheets['Employees']) {
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Employees'])
    result.employees = sheet.map((row: any) => ({
      id: row.ID || row.id || generateId(),
      name: row.Name || row.Employee || '',
      email: row.Email || '',
      maxHours: Number(row['Max Hours']) || 40,
      team: row.Team || 'Default',
      skills: parseSkills(row),
    }))
  }

  // Parse Projects sheet
  if (workbook.Sheets['Projects']) {
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Projects'])
    result.projects = sheet.map((row: any) => ({
      id: row.ID || row.id || generateId(),
      name: row.Name || row.Project || '',
      startDate: parseDate(row['Start Date']) || new Date(),
      endDate: parseDate(row['End Date']) || new Date(),
      requiredSkills: row['Required Skills'] 
        ? String(row['Required Skills']).split(',').map(s => s.trim())
        : [],
      portfolio: row.Portfolio || '',
    }))
  }

  // Parse Assignments sheet
  if (workbook.Sheets['Assignments']) {
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Assignments'])
    result.assignments = sheet.map((row: any) => ({
      id: generateId(),
      employeeId: row['Employee ID'] || row.Employee || '',
      projectId: row['Project ID'] || row.Project || '',
      hours: Number(row.Hours) || 0,
      week: row.Week || getCurrentWeek(),
    }))
  }

  // Parse Skills sheet (optional)
  if (workbook.Sheets['Skills']) {
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Skills'])
    const skillSet = new Set<string>()
    
    sheet.forEach((row: any) => {
      Object.keys(row).forEach(key => {
        if (key !== 'Employee' && key !== 'ID' && key !== 'Name') {
          skillSet.add(key)
        }
      })
    })
    
    result.skills = Array.from(skillSet)
  } else {
    // Extract skills from employees
    const skillSet = new Set<string>()
    result.employees.forEach(emp => {
      Object.keys(emp.skills).forEach(skill => skillSet.add(skill))
    })
    result.skills = Array.from(skillSet)
  }

  // Extract teams
  const teamSet = new Set(['All Teams'])
  result.employees.forEach(emp => {
    if (emp.team) teamSet.add(emp.team)
  })
  result.teams = Array.from(teamSet)

  return result
}

function parseSkills(row: any): Record<string, ProficiencyLevel> {
  const skills: Record<string, ProficiencyLevel> = {}
  const excludeFields = ['Name', 'Employee', 'Email', 'ID', 'id', 'Max Hours', 'Team']
  
  Object.keys(row).forEach(key => {
    if (!excludeFields.includes(key)) {
      const value = row[key]
      if (value && value !== 'None' && value !== '') {
        // Try to parse as proficiency level
        if (['Beginner', 'Intermediate', 'Expert'].includes(value)) {
          skills[key] = value as ProficiencyLevel
        } else if (typeof value === 'number') {
          // Convert numeric values to proficiency levels
          if (value >= 3) skills[key] = 'Expert'
          else if (value >= 2) skills[key] = 'Intermediate'
          else if (value >= 1) skills[key] = 'Beginner'
        } else if (value) {
          // Default to Intermediate for any other non-empty value
          skills[key] = 'Intermediate'
        }
      }
    }
  })
  
  return skills
}