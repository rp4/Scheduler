// Skills matrix module
import { scheduleData } from '../core/state.js';
import eventBus from '../core/events.js';

export function renderSkillsMatrix() {
    const container = document.getElementById('skillsMatrix');
    
    if (!container) return;
    
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
                <select class="skill-select" onchange="window.updateSkill('${employee.id}', '${skill}', this.value)">
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
    
    initSearchFilter();
}

function initSearchFilter() {
    const searchInput = document.getElementById('employeeSearch');
    const container = document.getElementById('skillsMatrix');
    
    if (!searchInput || !container) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = container.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const name = row.querySelector('.employee-cell').textContent.toLowerCase();
            row.style.display = name.includes(searchTerm) ? '' : 'none';
        });
    });
}

export function updateSkill(employeeId, skill, level) {
    const employee = scheduleData.employees.find(e => e.id === employeeId);
    if (!employee) return;
    
    if (!employee.skills) {
        employee.skills = {};
    }
    
    if (level === 'None') {
        delete employee.skills[skill];
    } else {
        employee.skills[skill] = level;
    }
    
    eventBus.emit('skillUpdated', { employeeId, skill, level });
    eventBus.emit('dataUpdated', scheduleData);
}

export function getEmployeesBySkill(skill, minLevel = 'Beginner') {
    const levelValues = {
        'None': 0,
        'Beginner': 1,
        'Intermediate': 2,
        'Advanced': 3,
        'Expert': 4
    };
    
    const minLevelValue = levelValues[minLevel] || 1;
    
    return scheduleData.employees.filter(emp => {
        const empLevel = emp.skills?.[skill];
        if (!empLevel) return false;
        return levelValues[empLevel] >= minLevelValue;
    });
}

export function getSkillCoverage(requiredSkills) {
    const coverage = {};
    
    requiredSkills.forEach(skill => {
        coverage[skill] = getEmployeesBySkill(skill).length;
    });
    
    return coverage;
}

// Listen for data changes
eventBus.on('dataUpdated', () => {
    if (document.getElementById('skillsTab')?.style.display !== 'none') {
        renderSkillsMatrix();
    }
});