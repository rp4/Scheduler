import * as XLSX from 'xlsx'
import { ScheduleData, Employee, Project, Assignment, ProficiencyLevel } from '@/types/schedule'
import { generateId, parseDate, getCurrentWeek } from '@/lib/utils'
import { format, parse, isValid, startOfWeek } from 'date-fns'

// Function to normalize date to yyyy-MM-dd format (Monday of the week)
function normalizeDateToMonday(dateValue: any): { date: string, week: string } {
  let parsedDate: Date | null = null
  
  // Handle Date objects from Excel parsing
  if (dateValue instanceof Date && isValid(dateValue)) {
    parsedDate = dateValue
    console.log(`    📅 Processing Date object: ${format(dateValue, 'yyyy-MM-dd')}`)
  }
  // Handle Excel date numbers
  else if (typeof dateValue === 'number' && dateValue > 0) {
    parsedDate = new Date((dateValue - 25569) * 86400 * 1000)
    console.log(`    📅 Excel number ${dateValue} -> ${format(parsedDate, 'yyyy-MM-dd')}`)
  }
  // Handle string dates
  else if (typeof dateValue === 'string') {
    const dateStr = dateValue.trim()
    
    // Priority: yyyy-MM-dd format
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const dateOnly = dateStr.split('T')[0]
      parsedDate = parse(dateOnly, 'yyyy-MM-dd', new Date())
      if (isValid(parsedDate)) {
        console.log(`    📅 Parsed yyyy-MM-dd: ${dateOnly}`)
      }
    }
    // Try other formats
    else {
      const formats = ['MM/dd/yyyy', 'M/d/yyyy', 'MMM d yyyy', 'd-MMM-yyyy']
      for (const fmt of formats) {
        try {
          const parsed = parse(dateStr, fmt, new Date())
          if (isValid(parsed)) {
            parsedDate = parsed
            console.log(`    📅 Parsed ${fmt}: ${dateStr} -> ${format(parsed, 'yyyy-MM-dd')}`)
            break
          }
        } catch {}
      }
    }
  }
  
  // If we couldn't parse, use current date
  if (!parsedDate || !isValid(parsedDate)) {
    console.warn(`    ⚠️ Could not parse date: "${dateValue}", using current date`)
    parsedDate = new Date()
  }
  
  // Convert to Monday of that week
  const monday = startOfWeek(parsedDate, { weekStartsOn: 1 })
  const dateFormatted = format(monday, 'yyyy-MM-dd')
  const weekFormatted = format(monday, 'MMM d').toUpperCase()
  
  const dayName = format(parsedDate, 'EEEE')
  if (parsedDate.getDay() === 1) {
    console.log(`    ✅ Date is already Monday: ${dateFormatted} -> Week: "${weekFormatted}"`)
  } else {
    console.log(`    📅 Converted ${dayName} ${format(parsedDate, 'yyyy-MM-dd')} -> Monday: ${dateFormatted} (Week: "${weekFormatted}")`)
  }
  
  return { date: dateFormatted, week: weekFormatted }
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
        const employeeId = row.Employee || row['Employee'] || row['Employee ID'] || ''
        const projectId = row.Project || row['Project'] || row['Project ID'] || ''
        
        if (!employeeId || !projectId) {
          console.log(`  ⚠️ Skipping row ${rowIndex + 1}: missing employee or project`)
          return
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
        
        const assignment: Assignment = {
          id: generateId(),
          employeeId: row['Employee ID'] || row.Employee || row['Employee'] || row['employee'] || '',
          projectId: row['Project ID'] || row.Project || row['Project'] || row['project'] || '',
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