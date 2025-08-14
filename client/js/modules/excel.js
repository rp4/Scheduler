// Excel import/export module
import { scheduleData, updateScheduleData, generateId, getCurrentWeek, parseDate } from '../core/state.js';
import eventBus from '../core/events.js';

export function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    updateDebugInfo('Loading file', `File: ${file.name}\nSize: ${(file.size/1024).toFixed(2)}KB`);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            updateDebugInfo('Parsing Excel', `Sheets found: ${Object.keys(workbook.Sheets).join(', ')}`);
            parseExcelData(workbook);
            eventBus.emit('dataLoaded', scheduleData);
        } catch (error) {
            updateDebugInfo('Error', `Failed to parse: ${error.message}`);
            console.error('Excel parsing error:', error);
        }
    };
    reader.onerror = function(error) {
        updateDebugInfo('Error', `File read failed: ${error}`);
    };
    reader.readAsArrayBuffer(file);
}

export function parseExcelData(workbook) {
    const newData = {
        employees: [],
        projects: [],
        assignments: [],
        skills: [],
        teams: ['All Teams']
    };
    
    const debugDetails = [];
    
    if (workbook.Sheets['Employees']) {
        const employeeSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Employees']);
        debugDetails.push(`Employees: ${employeeSheet.length} rows`);
        console.log('Raw Employee data:', employeeSheet);
        newData.employees = employeeSheet.map(row => ({
            id: row.ID || generateId(),
            name: row.Name || row.Employee,
            email: row.Email || '',
            maxHours: row['Max Hours'] || 40,
            team: row.Team || 'Default',
            skills: parseSkills(row)
        }));
    }
    
    if (workbook.Sheets['Projects']) {
        const projectSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Projects']);
        debugDetails.push(`Projects: ${projectSheet.length} rows`);
        console.log('Raw Project data:', projectSheet);
        newData.projects = projectSheet.map(row => ({
            id: row.ID || generateId(),
            name: row.Name || row.Project,
            startDate: parseDate(row['Start Date']),
            endDate: parseDate(row['End Date']),
            requiredSkills: row['Required Skills'] ? row['Required Skills'].split(',').map(s => s.trim()) : []
        }));
    }
    
    if (workbook.Sheets['Assignments']) {
        const assignmentSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Assignments']);
        debugDetails.push(`Assignments: ${assignmentSheet.length} rows`);
        console.log('Raw Assignment data:', assignmentSheet);
        
        newData.assignments = assignmentSheet.map((row, index) => {
            const assignment = {
                id: generateId(),
                employeeId: row['Employee ID'] || row.Employee,
                projectId: row['Project ID'] || row.Project,
                hours: parseFloat(row.Hours) || 0,
                week: row.Week || getCurrentWeek()
            };
            console.log(`Assignment ${index + 1}:`, assignment);
            return assignment;
        });
        
        console.log('Total assignments parsed:', newData.assignments.length);
    } else {
        debugDetails.push('Assignments: Sheet not found');
    }
    
    if (workbook.Sheets['Skills']) {
        const skillsSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Skills']);
        debugDetails.push(`Skills: ${skillsSheet.length} rows`);
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
    
    const teams = new Set(['All Teams']);
    newData.employees.forEach(e => {
        if (e.team) teams.add(e.team);
    });
    newData.teams = Array.from(teams);
    
    // Update debug display
    const summary = `E:${newData.employees.length} P:${newData.projects.length} A:${newData.assignments.length}`;
    updateDebugInfo(summary, debugDetails.join('\n'));
    
    console.log('Final parsed data:', newData);
    updateScheduleData(newData);
    
    // Verify data was actually stored
    setTimeout(() => {
        console.log('Verified state after update:', {
            employees: scheduleData.employees.length,
            projects: scheduleData.projects.length,
            assignments: scheduleData.assignments.length
        });
    }, 100);
}

function parseSkills(row) {
    const skills = {};
    Object.keys(row).forEach(key => {
        if (key !== 'Name' && key !== 'Employee' && key !== 'Email' && key !== 'ID' && key !== 'Max Hours' && key !== 'Team') {
            const value = row[key];
            if (value && value !== 'None') {
                skills[key] = value;
            }
        }
    });
    return skills;
}

function updateDebugInfo(status, details) {
    const debugStatus = document.getElementById('debugStatus');
    const debugDetails = document.getElementById('debugDetails');
    if (debugStatus) debugStatus.textContent = status;
    if (debugDetails) debugDetails.textContent = details;
}

export function exportToExcel() {
    const wb = XLSX.utils.book_new();
    
    // Employees sheet
    const employeesData = scheduleData.employees.map(emp => {
        const row = {
            ID: emp.id,
            Name: emp.name,
            Email: emp.email || '',
            'Max Hours': emp.maxHours || 40,
            Team: emp.team || 'Default'
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