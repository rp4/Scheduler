// Gantt chart module
import { scheduleData, selectedTeam } from '../core/state.js';
import eventBus from '../core/events.js';

export function renderGanttChart() {
    const container = document.getElementById('ganttChart');
    
    if (!container) return;
    
    if (!scheduleData.projects || scheduleData.projects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No projects to display. Upload an Excel file to get started.</p>';
        return;
    }
    
    const filteredProjects = filterProjectsByTeam();
    
    if (filteredProjects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No projects for selected team.</p>';
        return;
    }
    
    // Calculate date range from projects
    let startDate = new Date();
    let endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    
    // Find earliest and latest dates from projects
    if (filteredProjects.length > 0) {
        const projectDates = filteredProjects.flatMap(p => [
            p.startDate ? new Date(p.startDate) : null,
            p.endDate ? new Date(p.endDate) : null
        ]).filter(d => d && !isNaN(d));
        
        if (projectDates.length > 0) {
            const minDate = new Date(Math.min(...projectDates));
            const maxDate = new Date(Math.max(...projectDates));
            
            // Add some padding
            startDate = new Date(minDate);
            startDate.setDate(startDate.getDate() - 7);
            endDate = new Date(maxDate);
            endDate.setDate(endDate.getDate() + 14);
        }
    }
    
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
    
    const today = new Date();
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const todayOffset = (today - startDate) / (1000 * 60 * 60 * 24);
    const todayPosition = (todayOffset / totalDays) * 100;
    
    if (todayPosition >= 0 && todayPosition <= 100) {
        html += `<div class="today-marker" style="left: calc(150px + ${todayPosition}% * (100% - 150px) / 100);"></div>`;
    }
    
    filteredProjects.forEach(project => {
        if (!project.startDate || !project.endDate) return;
        
        const projectStart = new Date(project.startDate);
        const projectEnd = new Date(project.endDate);
        
        // Calculate positions as percentages
        const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const startOffset = (projectStart - startDate) / (1000 * 60 * 60 * 24);
        const duration = (projectEnd - projectStart) / (1000 * 60 * 60 * 24);
        
        const leftPos = (startOffset / totalDays) * 100;
        const width = (duration / totalDays) * 100;
        
        html += '<div class="gantt-row">';
        html += `<div class="gantt-project-name" title="${project.name}">${project.name}</div>`;
        html += '<div class="gantt-timeline">';
        
        // Only render bar if it's at least partially visible
        if (leftPos < 100 && (leftPos + width) > 0) {
            const barLeft = Math.max(0, leftPos);
            const barWidth = Math.min(width, 100 - barLeft);
            html += `<div class="gantt-bar" style="left: ${barLeft}%; width: ${barWidth}%;" title="${project.name}\n${projectStart.toLocaleDateString()} - ${projectEnd.toLocaleDateString()}">${project.name}</div>`;
        }
        html += '</div></div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function filterProjectsByTeam() {
    if (!selectedTeam || selectedTeam === 'all' || selectedTeam === 'All Teams') {
        return scheduleData.projects;
    }
    
    // Get employees in the selected team
    const teamEmployees = scheduleData.employees
        .filter(e => e.team === selectedTeam)
        .map(e => e.id);
    
    // Get projects that have assignments from team employees
    const projectIds = new Set();
    scheduleData.assignments.forEach(a => {
        if (teamEmployees.includes(a.employeeId)) {
            projectIds.add(a.projectId);
        }
    });
    
    return scheduleData.projects.filter(p => projectIds.has(p.id));
}

export function initGanttInteractions() {
    // Future: Add drag-and-drop, click handlers, etc.
}

// Listen for data changes
eventBus.on('dataUpdated', () => {
    if (document.getElementById('ganttTab')?.style.display !== 'none') {
        renderGanttChart();
    }
});

eventBus.on('teamChanged', () => {
    if (document.getElementById('ganttTab')?.style.display !== 'none') {
        renderGanttChart();
    }
});