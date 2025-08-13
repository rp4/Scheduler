let scheduleData = {
    employees: [],
    projects: [],
    assignments: [],
    skills: [],
    portfolios: ['All Portfolios']
};

let currentView = 'gantt';
let hoursView = 'employee';

document.getElementById('fileInput').addEventListener('change', handleFileUpload);
document.getElementById('addProjectBtn').addEventListener('click', showProjectModal);
document.getElementById('projectForm').addEventListener('submit', saveProject);
document.querySelector('.close').addEventListener('click', hideProjectModal);
document.getElementById('optimizeBtn').addEventListener('click', showOptimizeModal);

let optimizationResult = null;

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        parseExcelData(workbook);
        updateUI();
    };
    reader.readAsArrayBuffer(file);
}

function parseExcelData(workbook) {
    scheduleData.employees = [];
    scheduleData.projects = [];
    scheduleData.assignments = [];
    scheduleData.skills = [];
    
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
            startDate: parseDate(row['Start Date']),
            endDate: parseDate(row['End Date']),
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
        scheduleData.skills = Array.from(uniqueSkills);
    }
    
    const portfolios = new Set(['All Portfolios']);
    scheduleData.projects.forEach(p => {
        if (p.portfolio) portfolios.add(p.portfolio);
    });
    scheduleData.portfolios = Array.from(portfolios);
    
    updatePortfolioDropdown();
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

function parseDate(dateValue) {
    if (!dateValue) return new Date();
    
    if (typeof dateValue === 'number') {
        return excelDateToJSDate(dateValue);
    }
    
    return new Date(dateValue);
}

function excelDateToJSDate(excelDate) {
    return new Date((excelDate - 25569) * 86400 * 1000);
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

function updateUI() {
    calculateMetrics();
    
    switch(currentView) {
        case 'gantt':
            renderGanttChart();
            break;
        case 'hours':
            renderHoursView();
            break;
        case 'skills':
            renderSkillsMatrix();
            break;
    }
}

function calculateMetrics() {
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
            switch(level) {
                case 'Expert': skillsScore += 4; break;
                case 'Advanced': skillsScore += 3; break;
                case 'Intermediate': skillsScore += 2; break;
                case 'Beginner': skillsScore += 1; break;
            }
        });
    });
    
    document.getElementById('overtimeHours').textContent = totalOvertime;
    document.getElementById('resourceUtilization').textContent = 
        employeeCount > 0 ? Math.round(totalUtilization / employeeCount) + '%' : '0%';
    document.getElementById('skillsMatching').textContent = skillsScore;
}

function switchTab(tab) {
    currentView = tab;
    
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    document.querySelector(`.tab-button:nth-child(${tab === 'gantt' ? 1 : tab === 'hours' ? 2 : 3})`).classList.add('active');
    document.getElementById(tab + 'Tab').style.display = 'block';
    
    updateUI();
}

function switchHoursView(view) {
    hoursView = view;
    
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    renderHoursView();
}

function renderGanttChart() {
    const container = document.getElementById('ganttChart');
    
    if (!scheduleData.projects || scheduleData.projects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No projects to display. Upload an Excel file to get started.</p>';
        return;
    }
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    
    let html = '<div class="gantt-chart">';
    html += '<div class="gantt-header"><div style="width: 150px;"></div><div class="gantt-dates">';
    
    const dates = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
        dates.push(new Date(d));
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const day = d.getDate();
        html += `<div class="gantt-date">${month} ${day}</div>`;
    }
    html += '</div></div>';
    
    const todayPosition = ((new Date() - startDate) / (endDate - startDate)) * 100;
    html += `<div class="today-marker" style="left: calc(150px + ${todayPosition}%);"></div>`;
    
    scheduleData.projects.forEach(project => {
        const projectStart = new Date(project.startDate);
        const projectEnd = new Date(project.endDate);
        const leftPos = ((projectStart - startDate) / (endDate - startDate)) * 100;
        const width = ((projectEnd - projectStart) / (endDate - startDate)) * 100;
        
        html += '<div class="gantt-row">';
        html += `<div class="gantt-project-name">${project.name}</div>`;
        html += '<div class="gantt-timeline">';
        if (leftPos >= 0 && leftPos < 100) {
            html += `<div class="gantt-bar" style="left: ${Math.max(0, leftPos)}%; width: ${Math.min(width, 100 - leftPos)}%;">${project.name}</div>`;
        }
        html += '</div></div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderHoursView() {
    const container = document.getElementById('hoursGrid');
    
    if (!scheduleData.employees || scheduleData.employees.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No data to display. Upload an Excel file to get started.</p>';
        return;
    }
    
    const weeks = generateWeekHeaders();
    let html = '<table class="hours-table"><thead><tr>';
    
    if (hoursView === 'employee') {
        html += '<th>EMPLOYEE</th>';
        weeks.forEach(week => {
            html += `<th>${week.label}</th>`;
        });
        html += '<th>TOTAL</th></tr></thead><tbody>';
        
        scheduleData.employees.forEach(employee => {
            html += '<tr>';
            html += `<td class="employee-name">
                <span class="expand-arrow">▼</span> ${employee.name}
            </td>`;
            
            let total = 0;
            weeks.forEach(week => {
                const hours = getHoursForWeek(employee.id, null, week.date);
                total += hours;
                html += `<td>${hours || 0}</td>`;
            });
            html += `<td>${total}</td>`;
            html += '</tr>';
            
            html += `<tr style="display: none;">
                <td style="padding-left: 30px;">
                    <div class="assign-dropdown">
                        <button class="assign-btn" onclick="toggleDropdown(event)">
                            Assign to project... <span>▼</span>
                        </button>
                        <div class="dropdown-content">`;
            
            scheduleData.projects.forEach(project => {
                html += `<div class="dropdown-item" onclick="assignToProject('${employee.id}', '${project.id}')">${project.name}</div>`;
            });
            
            html += '</div></div></td>';
            weeks.forEach(() => html += '<td></td>');
            html += '<td></td></tr>';
        });
        
    } else {
        html += '<th>PROJECT</th>';
        weeks.forEach(week => {
            html += `<th>${week.label}</th>`;
        });
        html += '<th>TOTAL</th></tr></thead><tbody>';
        
        scheduleData.projects.forEach(project => {
            html += '<tr>';
            html += `<td class="project-name">
                <span class="expand-arrow">▼</span> ${project.name}
            </td>`;
            
            let total = 0;
            weeks.forEach(week => {
                const hours = getHoursForWeek(null, project.id, week.date);
                total += hours;
                html += `<td>${hours || 0}</td>`;
            });
            html += `<td>${total}</td>`;
            html += '</tr>';
            
            html += `<tr style="display: none;">
                <td style="padding-left: 30px;">
                    <div class="assign-dropdown">
                        <button class="assign-btn" onclick="toggleDropdown(event)">
                            Assign employee... <span>▼</span>
                        </button>
                        <div class="dropdown-content">`;
            
            scheduleData.employees.forEach(employee => {
                html += `<div class="dropdown-item" onclick="assignToProject('${employee.id}', '${project.id}')">${employee.name}</div>`;
            });
            
            html += '</div></div></td>';
            weeks.forEach(() => html += '<td></td>');
            html += '<td></td></tr>';
        });
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    document.querySelectorAll('.expand-arrow').forEach(arrow => {
        arrow.addEventListener('click', function() {
            const nextRow = this.closest('tr').nextElementSibling;
            if (nextRow) {
                nextRow.style.display = nextRow.style.display === 'none' ? 'table-row' : 'none';
                this.textContent = nextRow.style.display === 'none' ? '▼' : '▲';
            }
        });
    });
}

function generateWeekHeaders() {
    const weeks = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (startDate.getDay() || 7) + 1);
    startDate.setDate(startDate.getDate() - 14);
    
    for (let i = 0; i < 12; i++) {
        const weekDate = new Date(startDate);
        weekDate.setDate(weekDate.getDate() + (i * 7));
        const month = weekDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const day = weekDate.getDate();
        weeks.push({
            label: `${month} ${day}`,
            date: weekDate
        });
    }
    
    return weeks;
}

function getHoursForWeek(employeeId, projectId, weekDate) {
    return scheduleData.assignments
        .filter(a => {
            const matchEmployee = !employeeId || a.employeeId === employeeId || 
                                scheduleData.employees.find(e => e.name === a.employeeId)?.id === employeeId;
            const matchProject = !projectId || a.projectId === projectId || 
                               scheduleData.projects.find(p => p.name === a.projectId)?.id === projectId;
            return matchEmployee && matchProject;
        })
        .reduce((sum, a) => sum + (a.hours || 0), 0);
}

function renderSkillsMatrix() {
    const container = document.getElementById('skillsMatrix');
    
    if (!scheduleData.employees || scheduleData.employees.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No employee data to display. Upload an Excel file to get started.</p>';
        return;
    }
    
    const allSkills = new Set();
    scheduleData.employees.forEach(emp => {
        Object.keys(emp.skills || {}).forEach(skill => allSkills.add(skill));
    });
    
    if (scheduleData.skills && scheduleData.skills.length > 0) {
        scheduleData.skills.forEach(skill => allSkills.add(skill));
    }
    
    const skills = Array.from(allSkills);
    
    if (skills.length === 0) {
        skills.push('Communication', 'Cybersecurity', 'Data Analysis', 'Financial Auditing');
    }
    
    let html = '<table class="skills-table"><thead><tr><th>Employee</th>';
    skills.forEach(skill => {
        html += `<th>${skill}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    scheduleData.employees.forEach(employee => {
        html += '<tr>';
        html += `<td class="employee-cell">
            <div>${employee.name}</div>
            <div class="email">${employee.email || ''}</div>
        </td>`;
        
        skills.forEach(skill => {
            const level = employee.skills?.[skill] || 'None';
            html += `<td>
                <select class="skill-select" onchange="updateSkill('${employee.id}', '${skill}', this.value)">
                    <option value="None" ${level === 'None' ? 'selected' : ''}>None</option>
                    <option value="Beginner" ${level === 'Beginner' ? 'selected' : ''}>Beginner</option>
                    <option value="Intermediate" ${level === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                    <option value="Advanced" ${level === 'Advanced' ? 'selected' : ''}>Advanced</option>
                    <option value="Expert" ${level === 'Expert' ? 'selected' : ''}>Expert</option>
                </select>
            </td>`;
        });
        
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    const searchInput = document.getElementById('employeeSearch');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = container.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const name = row.querySelector('.employee-cell').textContent.toLowerCase();
            row.style.display = name.includes(searchTerm) ? '' : 'none';
        });
    });
}

function updateSkill(employeeId, skill, level) {
    const employee = scheduleData.employees.find(e => e.id === employeeId);
    if (employee) {
        if (!employee.skills) employee.skills = {};
        employee.skills[skill] = level;
        calculateMetrics();
    }
}

function toggleDropdown(event) {
    event.stopPropagation();
    const dropdown = event.target.nextElementSibling;
    dropdown.classList.toggle('show');
    
    document.addEventListener('click', function closeDropdown() {
        dropdown.classList.remove('show');
        document.removeEventListener('click', closeDropdown);
    });
}

function assignToProject(employeeId, projectId) {
    const existingAssignment = scheduleData.assignments.find(
        a => a.employeeId === employeeId && a.projectId === projectId
    );
    
    if (!existingAssignment) {
        scheduleData.assignments.push({
            id: generateId(),
            employeeId: employeeId,
            projectId: projectId,
            hours: 20,
            week: getCurrentWeek()
        });
        updateUI();
    }
}

function showProjectModal() {
    document.getElementById('projectModal').style.display = 'block';
    
    const employeeSelect = document.getElementById('projectEmployee');
    employeeSelect.innerHTML = '<option value="">Select Employee</option>';
    scheduleData.employees.forEach(emp => {
        employeeSelect.innerHTML += `<option value="${emp.id}">${emp.name}</option>`;
    });
}

function hideProjectModal() {
    document.getElementById('projectModal').style.display = 'none';
    document.getElementById('projectForm').reset();
}

function saveProject(event) {
    event.preventDefault();
    
    const project = {
        id: generateId(),
        name: document.getElementById('projectName').value,
        startDate: new Date(document.getElementById('projectStart').value),
        endDate: new Date(document.getElementById('projectEnd').value),
        portfolio: 'Default'
    };
    
    scheduleData.projects.push(project);
    
    const employeeId = document.getElementById('projectEmployee').value;
    const hours = parseInt(document.getElementById('projectHours').value) || 20;
    
    if (employeeId) {
        scheduleData.assignments.push({
            id: generateId(),
            employeeId: employeeId,
            projectId: project.id,
            hours: hours,
            week: getCurrentWeek()
        });
    }
    
    hideProjectModal();
    updateUI();
}

function updatePortfolioDropdown() {
    const select = document.getElementById('portfolio');
    select.innerHTML = '';
    scheduleData.portfolios.forEach(portfolio => {
        select.innerHTML += `<option value="${portfolio}">${portfolio}</option>`;
    });
}

function exportToExcel() {
    const wb = XLSX.utils.book_new();
    
    const employees = scheduleData.employees.map(emp => {
        const row = {
            ID: emp.id,
            Name: emp.name,
            Email: emp.email,
            'Max Hours': emp.maxHours || 40
        };
        
        Object.keys(emp.skills || {}).forEach(skill => {
            row[skill] = emp.skills[skill];
        });
        
        return row;
    });
    const wsEmployees = XLSX.utils.json_to_sheet(employees);
    XLSX.utils.book_append_sheet(wb, wsEmployees, 'Employees');
    
    const projects = scheduleData.projects.map(proj => ({
        ID: proj.id,
        Name: proj.name,
        'Start Date': proj.startDate.toLocaleDateString(),
        'End Date': proj.endDate.toLocaleDateString(),
        Portfolio: proj.portfolio,
        'Required Skills': proj.requiredSkills ? proj.requiredSkills.join(', ') : ''
    }));
    const wsProjects = XLSX.utils.json_to_sheet(projects);
    XLSX.utils.book_append_sheet(wb, wsProjects, 'Projects');
    
    const assignments = scheduleData.assignments.map(assign => ({
        'Employee ID': assign.employeeId,
        'Project ID': assign.projectId,
        Hours: assign.hours,
        Week: assign.week
    }));
    const wsAssignments = XLSX.utils.json_to_sheet(assignments);
    XLSX.utils.book_append_sheet(wb, wsAssignments, 'Assignments');
    
    const skills = scheduleData.employees.map(emp => {
        const row = { Employee: emp.name };
        Object.keys(emp.skills || {}).forEach(skill => {
            row[skill] = emp.skills[skill];
        });
        return row;
    });
    const wsSkills = XLSX.utils.json_to_sheet(skills);
    XLSX.utils.book_append_sheet(wb, wsSkills, 'Skills');
    
    XLSX.writeFile(wb, 'schedule_export.xlsx');
}

function showOptimizeModal() {
    document.getElementById('optimizeModal').style.display = 'block';
    
    document.querySelectorAll('input[name="algorithm"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.querySelectorAll('.param-group').forEach(group => {
                group.style.display = 'none';
            });
            
            if (this.value === 'genetic') {
                document.getElementById('geneticParams').style.display = 'block';
            } else if (this.value === 'annealing') {
                document.getElementById('annealingParams').style.display = 'block';
            } else if (this.value === 'constraint') {
                document.getElementById('constraintParams').style.display = 'block';
            }
        });
    });
}

function hideOptimizeModal() {
    document.getElementById('optimizeModal').style.display = 'none';
    document.getElementById('optimizationProgress').style.display = 'none';
    document.getElementById('optimizationResults').style.display = 'none';
    document.querySelector('.optimize-options').style.display = 'block';
}

function runOptimization() {
    const algorithm = document.querySelector('input[name="algorithm"]:checked').value;
    const optimizer = new ScheduleOptimizer(scheduleData.employees, scheduleData.projects, scheduleData.assignments);
    
    document.querySelector('.optimize-options').style.display = 'none';
    document.getElementById('optimizationProgress').style.display = 'block';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('optimizationStatus').textContent = 'Initializing optimization...';
    
    setTimeout(() => {
        let result;
        
        switch(algorithm) {
            case 'genetic':
                const generations = parseInt(document.getElementById('generations').value);
                const populationSize = parseInt(document.getElementById('populationSize').value);
                const mutationRate = parseFloat(document.getElementById('mutationRate').value);
                
                let currentGen = 0;
                const updateProgress = setInterval(() => {
                    currentGen += 10;
                    const progress = (currentGen / generations) * 100;
                    document.getElementById('progressFill').style.width = progress + '%';
                    document.getElementById('optimizationStatus').textContent = `Generation ${currentGen} of ${generations}`;
                    
                    if (currentGen >= generations) {
                        clearInterval(updateProgress);
                    }
                }, 100);
                
                result = optimizer.geneticAlgorithm({
                    generations,
                    populationSize,
                    mutationRate
                });
                
                setTimeout(() => clearInterval(updateProgress), generations * 10);
                break;
                
            case 'annealing':
                const initialTemp = parseInt(document.getElementById('initialTemp').value);
                const coolingRate = parseFloat(document.getElementById('coolingRate').value);
                const maxIterations = parseInt(document.getElementById('maxIterations').value);
                
                let currentIter = 0;
                const updateProgressSA = setInterval(() => {
                    currentIter += 100;
                    const progress = (currentIter / maxIterations) * 100;
                    document.getElementById('progressFill').style.width = progress + '%';
                    document.getElementById('optimizationStatus').textContent = `Iteration ${currentIter} of ${maxIterations}`;
                    
                    if (currentIter >= maxIterations) {
                        clearInterval(updateProgressSA);
                    }
                }, 50);
                
                result = optimizer.simulatedAnnealing({
                    initialTemp,
                    coolingRate,
                    maxIterations
                });
                
                setTimeout(() => clearInterval(updateProgressSA), maxIterations * 0.5);
                break;
                
            case 'constraint':
                const constraintIterations = parseInt(document.getElementById('constraintIterations').value);
                
                document.getElementById('progressFill').style.width = '50%';
                document.getElementById('optimizationStatus').textContent = 'Applying constraints...';
                
                result = optimizer.constraintSatisfaction({
                    maxIterations: constraintIterations
                });
                
                setTimeout(() => {
                    document.getElementById('progressFill').style.width = '100%';
                }, 500);
                break;
        }
        
        setTimeout(() => {
            optimizationResult = result;
            displayOptimizationResults(result, optimizer);
        }, algorithm === 'constraint' ? 1000 : 2000);
    }, 100);
}

function displayOptimizationResults(result, optimizer) {
    document.getElementById('optimizationProgress').style.display = 'none';
    document.getElementById('optimizationResults').style.display = 'block';
    
    const summary = optimizer.getOptimizationSummary(result);
    
    let html = '<h4>Optimization Complete</h4>';
    html += `<p><strong>Fitness Score:</strong> ${summary.fitness.toFixed(2)}</p>`;
    html += `<p><strong>Total Assignments:</strong> ${summary.totalAssignments}</p>`;
    
    html += '<h4>Employee Utilization</h4><ul>';
    summary.employeeUtilization.forEach(emp => {
        const utilClass = emp.overtime > 0 ? 'style="color: #ff6b35;"' : '';
        html += `<li ${utilClass}>${emp.employee}: ${emp.hours}h / ${emp.maxHours}h (${emp.utilization})`;
        if (emp.overtime > 0) html += ` - ${emp.overtime}h overtime`;
        html += '</li>';
    });
    html += '</ul>';
    
    html += '<h4>Project Coverage</h4><ul>';
    summary.projectCoverage.forEach(proj => {
        html += `<li>${proj.project}: ${proj.assignedEmployees} employees, ${proj.totalHours}h total</li>`;
    });
    html += '</ul>';
    
    if (summary.skillMatches && summary.skillMatches.length > 0) {
        html += '<h4>Skills Matching</h4><ul>';
        const unmatched = summary.skillMatches.filter(m => !m.matched);
        if (unmatched.length > 0) {
            html += '<li style="color: #ff6b35;">Unmatched skills:<ul>';
            unmatched.forEach(m => {
                html += `<li>${m.project}: ${m.skill}</li>`;
            });
            html += '</ul></li>';
        }
        
        const matched = summary.skillMatches.filter(m => m.matched);
        if (matched.length > 0) {
            html += '<li style="color: #34a853;">Matched skills: ' + matched.length + '</li>';
        }
        html += '</ul>';
    }
    
    document.getElementById('resultsSummary').innerHTML = html;
}

function applyOptimization() {
    if (optimizationResult && optimizationResult.solution) {
        scheduleData.assignments = optimizationResult.solution;
        updateUI();
        hideOptimizeModal();
        alert('Optimization applied successfully!');
    }
}

function discardOptimization() {
    optimizationResult = null;
    hideOptimizeModal();
}

window.onclick = function(event) {
    if (event.target === document.getElementById('projectModal')) {
        hideProjectModal();
    }
    if (event.target === document.getElementById('optimizeModal')) {
        hideOptimizeModal();
    }
}

updateUI();