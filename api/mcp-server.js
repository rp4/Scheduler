const XLSX = require('xlsx');

let scheduleData = {
    employees: [],
    projects: [],
    assignments: [],
    skills: []
};

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

function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek);
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const { action, params } = req.body || {};
    
    try {
        switch (action) {
            case 'loadSchedule':
                const { excelData } = params;
                const workbook = XLSX.read(excelData, { type: 'base64' });
                
                if (workbook.Sheets['Employees']) {
                    const employeeSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Employees']);
                    scheduleData.employees = employeeSheet.map(row => ({
                        id: row.ID || generateId(),
                        name: row.Name || row.Employee,
                        email: row.Email || '',
                        maxHours: row['Max Hours'] || 40,
                        skills: parseSkills(row)
                    }));
                }
                
                if (workbook.Sheets['Projects']) {
                    const projectSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Projects']);
                    scheduleData.projects = projectSheet.map(row => ({
                        id: row.ID || generateId(),
                        name: row.Name || row.Project,
                        startDate: row['Start Date'],
                        endDate: row['End Date'],
                        portfolio: row.Portfolio || 'Default',
                        requiredSkills: row['Required Skills'] ? row['Required Skills'].split(',').map(s => s.trim()) : []
                    }));
                }
                
                if (workbook.Sheets['Assignments']) {
                    const assignmentSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Assignments']);
                    scheduleData.assignments = assignmentSheet.map(row => ({
                        id: generateId(),
                        employeeId: row['Employee ID'] || row.Employee,
                        projectId: row['Project ID'] || row.Project,
                        hours: row.Hours || 0,
                        week: row.Week || getCurrentWeek()
                    }));
                }
                
                return res.status(200).json({
                    success: true,
                    data: scheduleData
                });
                
            case 'getEmployees':
                return res.status(200).json({
                    success: true,
                    data: scheduleData.employees
                });
                
            case 'getProjects':
                const { portfolio } = params || {};
                let projects = scheduleData.projects;
                if (portfolio && portfolio !== 'All Portfolios') {
                    projects = projects.filter(p => p.portfolio === portfolio);
                }
                return res.status(200).json({
                    success: true,
                    data: projects
                });
                
            case 'getAssignments':
                const { employeeId, projectId } = params || {};
                let assignments = scheduleData.assignments;
                
                if (employeeId) {
                    assignments = assignments.filter(a => 
                        a.employeeId === employeeId || 
                        scheduleData.employees.find(e => e.name === employeeId)?.id === a.employeeId
                    );
                }
                
                if (projectId) {
                    assignments = assignments.filter(a => 
                        a.projectId === projectId || 
                        scheduleData.projects.find(p => p.name === projectId)?.id === a.projectId
                    );
                }
                
                return res.status(200).json({
                    success: true,
                    data: assignments
                });
                
            case 'assignResource':
                const { employeeId: empId, projectId: projId, hours } = params;
                const employee = scheduleData.employees.find(e => e.id === empId || e.name === empId);
                const project = scheduleData.projects.find(p => p.id === projId || p.name === projId);
                
                if (!employee || !project) {
                    return res.status(400).json({
                        error: 'Employee or project not found'
                    });
                }
                
                const existingAssignment = scheduleData.assignments.find(
                    a => a.employeeId === employee.id && a.projectId === project.id
                );
                
                if (existingAssignment) {
                    existingAssignment.hours = hours;
                } else {
                    scheduleData.assignments.push({
                        id: generateId(),
                        employeeId: employee.id,
                        projectId: project.id,
                        hours: hours,
                        week: getCurrentWeek()
                    });
                }
                
                return res.status(200).json({
                    success: true,
                    data: scheduleData.assignments
                });
                
            case 'calculateMetrics':
                const skillLevels = {
                    'None': 0,
                    'Beginner': 1,
                    'Intermediate': 2,
                    'Advanced': 3,
                    'Expert': 4
                };
                
                let totalOvertime = 0;
                let totalUtilization = 0;
                let employeeCount = 0;
                let skillsScore = 0;
                
                scheduleData.employees.forEach(employee => {
                    const weeklyHours = scheduleData.assignments
                        .filter(a => a.employeeId === employee.id || a.employeeId === employee.name)
                        .reduce((sum, a) => sum + (a.hours || 0), 0);
                    
                    if (weeklyHours > 40) {
                        totalOvertime += weeklyHours - 40;
                    }
                    
                    if (employee.maxHours > 0) {
                        totalUtilization += (weeklyHours / employee.maxHours) * 100;
                        employeeCount++;
                    }
                    
                    Object.values(employee.skills || {}).forEach(level => {
                        skillsScore += skillLevels[level] || 0;
                    });
                });
                
                const avgUtilization = employeeCount > 0 ? Math.round(totalUtilization / employeeCount) : 0;
                
                return res.status(200).json({
                    success: true,
                    data: {
                        overtimeHours: totalOvertime,
                        resourceUtilization: `${avgUtilization}%`,
                        skillsMatching: skillsScore,
                        totalEmployees: scheduleData.employees.length,
                        totalProjects: scheduleData.projects.length,
                        totalAssignments: scheduleData.assignments.length
                    }
                });
                
            default:
                return res.status(400).json({
                    error: 'Invalid action'
                });
        }
    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
};