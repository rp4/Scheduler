// Gantt chart module
import { scheduleData, selectedPortfolio } from '../core/state.js';
import eventBus from '../core/events.js';

export function renderGanttChart() {
    const container = document.getElementById('ganttChart');
    
    if (!container) return;
    
    if (!scheduleData.projects || scheduleData.projects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No projects to display. Upload an Excel file to get started.</p>';
        return;
    }
    
    const filteredProjects = filterProjectsByPortfolio();
    
    if (filteredProjects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No projects in selected portfolio.</p>';
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
    
    filteredProjects.forEach(project => {
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

function filterProjectsByPortfolio() {
    if (!selectedPortfolio || selectedPortfolio === 'all' || selectedPortfolio === 'All Portfolios') {
        return scheduleData.projects;
    }
    return scheduleData.projects.filter(p => p.portfolio === selectedPortfolio);
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

eventBus.on('portfolioChanged', () => {
    if (document.getElementById('ganttTab')?.style.display !== 'none') {
        renderGanttChart();
    }
});