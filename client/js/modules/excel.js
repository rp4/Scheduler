// Excel import/export module
import { scheduleData, updateScheduleData, generateId, getCurrentWeek, parseDate } from '../core/state.js';
import eventBus from '../core/events.js';

export function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        parseExcelData(workbook);
        eventBus.emit('dataLoaded', scheduleData);
    };
    reader.readAsArrayBuffer(file);
}

export function parseExcelData(workbook) {
    const newData = {
        employees: [],
        projects: [],
        assignments: [],
        skills: [],
        portfolios: ['All Portfolios']
    };
    
    if (workbook.Sheets['Employees']) {
        const employeeSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Employees']);
        newData.employees = employeeSheet.map(row => ({
            id: row.ID || generateId(),
            name: row.Name || row.Employee,
            email: row.Email || '',
            maxHours: row['Max Hours'] || 40,
            skills: parseSkills(row)
        }));
    }
    
    if (workbook.Sheets['Projects']) {
        const projectSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Projects']);
        newData.projects = projectSheet.map(row => ({
            id: row.ID || generateId(),
            name: row.Name || row.Project,
            startDate: parseDate(row['Start Date']),
            endDate: parseDate(row['End Date']),
            portfolio: row.Portfolio || 'Default',
            requiredSkills: row['Required Skills'] ? row['Required Skills'].split(',').map(s => s.trim()) : []
        }));
    }
    
    if (workbook.Sheets['Assignments']) {
        const assignmentSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Assignments']);
        newData.assignments = assignmentSheet.map(row => ({
            id: generateId(),
            employeeId: row['Employee ID'] || row.Employee,
            projectId: row['Project ID'] || row.Project,
            hours: row.Hours || 0,
            week: row.Week || getCurrentWeek()
        }));
    }
    
    if (workbook.Sheets['Skills']) {
        const skillsSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Skills']);
        const uniqueSkills = new Set();
        skillsSheet.forEach(row => {
            Object.keys(row).forEach(key => {
                if (key !== 'Employee' && key !== 'ID') {
                    uniqueSkills.add(key);
                }
            });
        });
        newData.skills = Array.from(uniqueSkills);
    }
    
    const portfolios = new Set(['All Portfolios']);
    newData.projects.forEach(p => {
        if (p.portfolio) portfolios.add(p.portfolio);
    });
    newData.portfolios = Array.from(portfolios);
    
    updateScheduleData(newData);
}

function parseSkills(row) {
    const skills = {};
    Object.keys(row).forEach(key => {
        if (key !== 'Name' && key !== 'Employee' && key !== 'Email' && key !== 'ID' && key !== 'Max Hours') {
            const value = row[key];
            if (value && value !== 'None') {
                skills[key] = value;
            }
        }
    });
    return skills;
}

export function exportToExcel() {
    const wb = XLSX.utils.book_new();
    
    // Employees sheet
    const employeesData = scheduleData.employees.map(emp => {
        const row = {
            ID: emp.id,
            Name: emp.name,
            Email: emp.email || '',
            'Max Hours': emp.maxHours || 40
        };
        
        // Add skill columns
        if (emp.skills) {
            Object.keys(emp.skills).forEach(skill => {
                row[skill] = emp.skills[skill];
            });
        }
        
        return row;
    });
    
    const ws1 = XLSX.utils.json_to_sheet(employeesData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Employees');
    
    // Projects sheet
    const projectsData = scheduleData.projects.map(proj => ({
        ID: proj.id,
        Name: proj.name,
        'Start Date': proj.startDate ? proj.startDate.toISOString().split('T')[0] : '',
        'End Date': proj.endDate ? proj.endDate.toISOString().split('T')[0] : '',
        Portfolio: proj.portfolio || '',
        'Required Skills': proj.requiredSkills ? proj.requiredSkills.join(', ') : ''
    }));
    
    const ws2 = XLSX.utils.json_to_sheet(projectsData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Projects');
    
    // Assignments sheet
    const assignmentsData = scheduleData.assignments.map(assign => ({
        'Employee ID': assign.employeeId,
        'Project ID': assign.projectId,
        Hours: assign.hours,
        Week: assign.week
    }));
    
    const ws3 = XLSX.utils.json_to_sheet(assignmentsData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Assignments');
    
    // Skills sheet
    if (scheduleData.skills && scheduleData.skills.length > 0) {
        const skillsData = scheduleData.employees.map(emp => {
            const row = { Employee: emp.name };
            scheduleData.skills.forEach(skill => {
                row[skill] = emp.skills && emp.skills[skill] ? emp.skills[skill] : 'None';
            });
            return row;
        });
        
        const ws4 = XLSX.utils.json_to_sheet(skillsData);
        XLSX.utils.book_append_sheet(wb, ws4, 'Skills');
    }
    
    // Generate and download file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule_' + new Date().toISOString().split('T')[0] + '.xlsx';
    a.click();
    URL.revokeObjectURL(url);
}