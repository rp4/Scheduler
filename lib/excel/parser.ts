import * as XLSX from 'xlsx'
import { ScheduleData, Assignment, ProficiencyLevel } from '@/types/schedule'
import { generateId } from '@/lib/utils'
import { normalizeDateToWeek, parseFlexibleDate } from '@/lib/date-utils'
import { validateExcelData } from './validator'

// Wrapper function for backward compatibility
function normalizeDateToMonday(dateValue: any): { date: string, week: string } {
  return normalizeDateToWeek(dateValue)
}

export async function parseExcelFile(file: File): Promise<ScheduleData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        console.log('📊 Starting Excel parsing...')
        console.log('📊 File size:', file.size, 'bytes')
        
        if (!e.target?.result) {
          throw new Error('Failed to read file content')
        }
        
        const data = new Uint8Array(e.target.result as ArrayBuffer)
        console.log('📊 Array buffer size:', data.length)
        
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        console.log('📋 Workbook sheets found:', Object.keys(workbook.Sheets))
        
        if (!workbook.Sheets || Object.keys(workbook.Sheets).length === 0) {
          throw new Error('No sheets found in the Excel file')
        }
        
        const result = parseWorkbook(workbook)
        console.log('✅ Parsing complete:', {
          employees: result.employees.length,
          projects: result.projects.length,
          assignments: result.assignments.length,
          skills: result.skills.length,
          teams: result.teams.length
        })
        
        // Validate the parsed data
        const validation = validateExcelData({
          employees: result.employees,
          projects: result.projects,
          assignments: result.assignments
        })
        
        if (!validation.isValid) {
          const errorMessage = 'Excel validation failed:\n' + validation.errors.join('\n')
          throw new Error(errorMessage)
        }
        
        // Log warnings if any
        if (validation.warnings.length > 0) {
          console.warn('⚠️ Excel validation warnings:', validation.warnings)
        }
        
        resolve(result)
      } catch (error) {
        console.error('❌ Error parsing Excel:', error)
        if (error instanceof Error) {
          reject(error)
        } else {
          reject(new Error('Unknown error occurred while parsing Excel file'))
        }
      }
    }
    
    reader.onerror = (error) => {
      console.error('❌ FileReader error:', error)
      reject(new Error('Failed to read file. Please try again.'))
    }
    
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
      startDate: parseFlexibleDate(row['Start Date']) || new Date(),
      endDate: parseFlexibleDate(row['End Date']) || new Date(),
      requiredSkills: row['Required Skills'] 
        ? String(row['Required Skills']).split(',').map(s => s.trim())
        : [],
      portfolio: row.Portfolio || '',
    }))
  }

  // Parse Assignments sheet
  if (workbook.Sheets['Assignments']) {
    console.log('📅 Parsing Assignments sheet...')
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Assignments'])
    console.log(`  Found ${sheet.length} assignment rows`)
    
    // Log first few rows for debugging
    if (sheet.length > 0) {
      console.log('  Sample assignment row:', sheet[0])
      console.log('  Assignment column headers:', Object.keys(sheet[0] as object))
    }
    
    // Check if this is pivot-style format (columns are dates)
    const firstRow = sheet[0] || {}
    const columns = Object.keys(firstRow)
    const dateColumns = columns.filter(col => {
      // Check if column name looks like a date
      return /^\d{4}-\d{2}-\d{2}/.test(col) || 
             /^\d{1,2}\/\d{1,2}\/\d{4}/.test(col) ||
             /^[A-Z][a-z]{2}\s+\d{1,2}/.test(col)
    })
    
    if (dateColumns.length > 0) {
      // Pivot format: Each row is employee-project, columns are week dates
      console.log('  📊 Detected pivot-style format with date columns:', dateColumns.slice(0, 3))
      result.assignments = []
      
      sheet.forEach((row: any, rowIndex: number) => {
        const employeeIdOrName = row.Employee || row['Employee'] || row['Employee ID'] || ''
        const projectIdOrName = row.Project || row['Project'] || row['Project ID'] || ''
        
        if (!employeeIdOrName || !projectIdOrName) {
          console.log(`  ⚠️ Skipping row ${rowIndex + 1}: missing employee or project`)
          return
        }
        
        // Try to find employee by ID first, then by name
        let employeeId = employeeIdOrName
        const employeeById = result.employees.find(e => e.id === employeeIdOrName)
        const employeeByName = result.employees.find(e => e.name === employeeIdOrName)
        
        if (!employeeById && employeeByName) {
          employeeId = employeeByName.id
        }
        
        // Try to find project by ID first, then by name
        let projectId = projectIdOrName
        const projectById = result.projects.find(p => p.id === projectIdOrName)
        const projectByName = result.projects.find(p => p.name === projectIdOrName)
        
        if (!projectById && projectByName) {
          projectId = projectByName.id
        }
        
        // Process each date column
        dateColumns.forEach(dateCol => {
          const hours = row[dateCol]
          if (hours && Number(hours) > 0) {
            const { date, week } = normalizeDateToMonday(dateCol)
            
            const assignment: Assignment = {
              id: generateId(),
              employeeId: employeeId,
              projectId: projectId,
              hours: Number(hours),
              week: week,
              date: date
            }
            
            result.assignments.push(assignment)
            
            // Debug first few
            if (result.assignments.length <= 3) {
              console.log(`  Assignment ${result.assignments.length}:`, {
                employee: employeeId,
                project: projectId,
                date: date,
                week: week,
                hours: hours
              })
            }
          }
        })
      })
      
      console.log(`  ✓ Converted pivot format to ${result.assignments.length} assignments`)
    } else {
      // Traditional format: Each row is one assignment
      result.assignments = sheet.map((row: any, index: number) => {
        // Check all possible column names for week/date
        const rawDate = row.Week || row['Week'] || row.Date || row['Date'] || row.week || row.date
        const { date, week } = normalizeDateToMonday(rawDate)
        
        // Parse hours with better handling
        const rawHours = row.Hours || row['Hours'] || row.hours || 0
        const parsedHours = typeof rawHours === 'string' ? parseFloat(rawHours) || 0 : Number(rawHours) || 0
        
        const employeeIdOrName = row['Employee ID'] || row.Employee || row['Employee'] || row['employee'] || ''
        const projectIdOrName = row['Project ID'] || row.Project || row['Project'] || row['project'] || ''
        
        // Try to find employee by ID first, then by name
        let employeeId = employeeIdOrName
        const employeeById = result.employees.find(e => e.id === employeeIdOrName)
        const employeeByName = result.employees.find(e => e.name === employeeIdOrName)
        
        if (!employeeById && employeeByName) {
          employeeId = employeeByName.id
        }
        
        // Try to find project by ID first, then by name
        let projectId = projectIdOrName
        const projectById = result.projects.find(p => p.id === projectIdOrName)
        const projectByName = result.projects.find(p => p.name === projectIdOrName)
        
        if (!projectById && projectByName) {
          projectId = projectByName.id
        }
        
        const assignment: Assignment = {
          id: generateId(),
          employeeId: employeeId,
          projectId: projectId,
          hours: parsedHours,
          week: week,  // Keep for backwards compatibility
          date: date   // New: Store full date in yyyy-MM-dd format
        }
        
        // Debug log for first few assignments
        if (index < 3) {
          console.log(`  Assignment ${index + 1}:`, {
            employeeId: assignment.employeeId,
            projectId: assignment.projectId,
            hours: `${assignment.hours} (raw: "${rawHours}", type: ${typeof rawHours})`,
            rawDate: rawDate,
            storedDate: assignment.date,
            displayWeek: assignment.week,
            allColumns: Object.keys(row).join(', ')
          })
        }
        
        return assignment
      })
      
      console.log(`  ✓ Parsed ${result.assignments.length} assignments`)
    }
    
    console.log('  Unique weeks found:', [...new Set(result.assignments.map(a => a.week))])
  } else {
    console.log('⚠️ No Assignments sheet found in workbook')
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