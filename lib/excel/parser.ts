import * as XLSX from 'xlsx'
import { ScheduleData, Employee, Project, Assignment, ProficiencyLevel } from '@/types/schedule'
import { generateId, parseDate, getCurrentWeek } from '@/lib/utils'
import { format, parse, isValid } from 'date-fns'

// Function to normalize week format to match HoursGrid expectation
function normalizeWeekFormat(weekValue: any): string {
  if (!weekValue) return getCurrentWeek()
  
  const weekStr = String(weekValue).trim()
  
  // Try to parse various date formats
  const dateFormats = [
    'MM/dd/yyyy',
    'M/d/yyyy',
    'yyyy-MM-dd',
    'MMM d yyyy',
    'MMM d',
    'd-MMM',
    'd-MMM-yy',
    'd-MMM-yyyy'
  ]
  
  for (const fmt of dateFormats) {
    try {
      const parsed = parse(weekStr, fmt, new Date())
      if (isValid(parsed)) {
        // Format to match HoursGrid: "MMM D" in uppercase
        return format(parsed, 'MMM d').toUpperCase()
      }
    } catch {
      // Continue to next format
    }
  }
  
  // If week is already in the expected format (e.g., "JAN 15")
  if (/^[A-Z]{3}\s+\d{1,2}$/i.test(weekStr)) {
    return weekStr.toUpperCase()
  }
  
  // If it's a Date object
  if (weekValue instanceof Date && isValid(weekValue)) {
    return format(weekValue, 'MMM d').toUpperCase()
  }
  
  // If it's an Excel date number
  if (typeof weekValue === 'number' && weekValue > 0) {
    const excelDate = new Date((weekValue - 25569) * 86400 * 1000)
    if (isValid(excelDate)) {
      return format(excelDate, 'MMM d').toUpperCase()
    }
  }
  
  console.warn(`  ⚠️ Could not parse week format: "${weekStr}", using current week`)
  return getCurrentWeek()
}

export async function parseExcelFile(file: File): Promise<ScheduleData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        console.log('📊 Starting Excel parsing...')
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        console.log('📋 Workbook sheets found:', Object.keys(workbook.Sheets))
        const result = parseWorkbook(workbook)
        console.log('✅ Parsing complete:', {
          employees: result.employees.length,
          projects: result.projects.length,
          assignments: result.assignments.length,
          skills: result.skills.length,
          teams: result.teams.length
        })
        resolve(result)
      } catch (error) {
        console.error('❌ Error parsing Excel:', error)
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
    console.log('📅 Parsing Assignments sheet...')
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Assignments'])
    console.log(`  Found ${sheet.length} assignment rows`)
    
    // Log first few rows for debugging
    if (sheet.length > 0) {
      console.log('  Sample assignment row:', sheet[0])
      console.log('  Assignment column headers:', Object.keys(sheet[0]))
    }
    
    result.assignments = sheet.map((row: any, index: number) => {
      const rawWeek = row.Week || row['Week'] || row.Date || row['Date']
      const normalizedWeek = normalizeWeekFormat(rawWeek)
      
      const assignment = {
        id: generateId(),
        employeeId: row['Employee ID'] || row.Employee || row['Employee'] || '',
        projectId: row['Project ID'] || row.Project || row['Project'] || '',
        hours: Number(row.Hours || row['Hours'] || 0),
        week: normalizedWeek,
      }
      
      // Debug log for first few assignments
      if (index < 3) {
        console.log(`  Assignment ${index + 1}:`, {
          employeeId: assignment.employeeId,
          projectId: assignment.projectId,
          hours: assignment.hours,
          rawWeek: rawWeek,
          normalizedWeek: assignment.week,
          rawRow: row
        })
      }
      
      return assignment
    })
    
    console.log(`  ✓ Parsed ${result.assignments.length} assignments`)
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