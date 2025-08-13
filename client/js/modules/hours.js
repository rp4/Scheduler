// Hours tracking module
import { scheduleData, hoursView, generateId } from '../core/state.js';
import eventBus from '../core/events.js';

export function renderHoursView() {
    const container = document.getElementById('hoursGrid');
    
    if (!container) return;
    
    if (!scheduleData.employees || scheduleData.employees.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No data to display. Upload an Excel file to get started.</p>';
        return;
    }
    
    const weeks = generateWeekHeaders();
    let html = '<table class="hours-table"><thead><tr>';
    
    if (hoursView === 'employee') {
        html += renderEmployeeHoursView(weeks);
    } else {
        html += renderProjectHoursView(weeks);
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    // Add event listeners for expand arrows
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

function renderEmployeeHoursView(weeks) {
    let html = '<th>EMPLOYEE</th>';
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
                    <button class="assign-btn" onclick="window.toggleDropdown(event)">
                        Assign to project... <span>▼</span>
                    </button>
                    <div class="dropdown-content">`;
        
        scheduleData.projects.forEach(project => {
            html += `<div class="dropdown-item" onclick="window.assignToProject('${employee.id}', '${project.id}')">${project.name}</div>`;
        });
        
        html += '</div></div></td>';
        weeks.forEach(() => html += '<td></td>');
        html += '<td></td></tr>';
    });
    
    return html;
}

function renderProjectHoursView(weeks) {
    let html = '<th>PROJECT</th>';
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
                    <button class="assign-btn" onclick="window.toggleDropdown(event)">
                        Assign employee... <span>▼</span>
                    </button>
                    <div class="dropdown-content">`;
        
        scheduleData.employees.forEach(employee => {
            html += `<div class="dropdown-item" onclick="window.assignToProject('${employee.id}', '${project.id}')">${employee.name}</div>`;
        });
        
        html += '</div></div></td>';
        weeks.forEach(() => html += '<td></td>');
        html += '<td></td></tr>';
    });
    
    return html;
}

export function generateWeekHeaders() {
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

export function getHoursForWeek(employeeId, projectId, weekDate) {
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

export function assignToProject(employeeId, projectId, hours = 40) {
    const assignment = {
        id: generateId(),
        employeeId,
        projectId,
        hours,
        week: getCurrentWeek()
    };
    
    scheduleData.assignments.push(assignment);
    eventBus.emit('assignmentAdded', assignment);
    renderHoursView();
}

function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek);
}

// Listen for data changes
eventBus.on('dataUpdated', () => {
    if (document.getElementById('hoursTab')?.style.display !== 'none') {
        renderHoursView();
    }
});

eventBus.on('hoursViewChanged', renderHoursView);