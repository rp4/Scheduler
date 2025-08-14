// Gantt chart module
import { scheduleData, getSelectedTeam, updateScheduleData } from '../core/state.js';
import eventBus from '../core/events.js';

export function renderGanttChart() {
    const container = document.getElementById('ganttChart');
    
    if (!container) {
        console.error('Gantt container not found');
        return;
    }
    
    console.log('Rendering Gantt Chart with data:', {
        projects: scheduleData.projects?.length || 0,
        employees: scheduleData.employees?.length || 0,
        assignments: scheduleData.assignments?.length || 0
    });
    
    updateDebugDisplay('Gantt render', `P:${scheduleData.projects?.length || 0} E:${scheduleData.employees?.length || 0} A:${scheduleData.assignments?.length || 0}`);
    
    if (!scheduleData.projects || scheduleData.projects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No projects to display. Upload an Excel file to get started.</p>';
        console.log('No projects found in scheduleData');
        return;
    }
    
    const filteredProjects = filterProjectsByTeam();
    
    if (filteredProjects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No projects for selected team.</p>';
        return;
    }
    
    // Calculate date range: previous year, current year, and next year
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Set to January 1st of previous year
    const startDate = new Date(currentYear - 1, 0, 1);
    
    // Set to December 31st of next year
    const endDate = new Date(currentYear + 1, 11, 31);
    
    let html = '<div class="gantt-chart">';
    
    // Build multi-layer header structure
    html += '<div class="gantt-header-wrapper">';
    html += '<div class="gantt-header-multi">';
    html += '<div class="gantt-header-spacer"></div>';
    html += '<div class="gantt-header-layers">';
    
    // Year row
    html += '<div class="gantt-header-row gantt-header-years">';
    let yearStartIdx = 0;
    const dates = [];
    
    // Collect all dates and track year changes
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
        dates.push(new Date(d));
    }
    
    // Build year headers
    let yearCounts = {};
    dates.forEach(date => {
        const year = date.getFullYear();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
    });
    
    for (let year in yearCounts) {
        html += `<div class="gantt-year" style="flex: ${yearCounts[year]};">${year}</div>`;
    }
    html += '</div>';
    
    // Month row
    html += '<div class="gantt-header-row gantt-header-months">';
    let currentMonth = -1;
    let monthCount = 0;
    let monthsHtml = '';
    
    dates.forEach((date, idx) => {
        const month = date.getMonth();
        if (month !== currentMonth) {
            if (monthCount > 0) {
                const monthName = dates[idx - 1].toLocaleDateString('en-US', { month: 'short' });
                monthsHtml += `<div class="gantt-month" style="flex: ${monthCount};">${monthName}</div>`;
            }
            currentMonth = month;
            monthCount = 1;
        } else {
            monthCount++;
        }
    });
    // Add last month
    if (monthCount > 0) {
        const monthName = dates[dates.length - 1].toLocaleDateString('en-US', { month: 'short' });
        monthsHtml += `<div class="gantt-month" style="flex: ${monthCount};">${monthName}</div>`;
    }
    html += monthsHtml + '</div>';
    
    // Week dates row
    html += '<div class="gantt-header-row gantt-header-weeks">';
    dates.forEach(d => {
        const day = d.getDate();
        html += `<div class="gantt-week">${day}</div>`;
    });
    html += '</div>';
    
    html += '</div></div></div>';
    
    const today = new Date();
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const todayOffset = (today - startDate) / (1000 * 60 * 60 * 24);
    const todayPosition = (todayOffset / totalDays) * 100;
    
    if (todayPosition >= 0 && todayPosition <= 100) {
        html += `<div class="today-marker" style="left: calc(150px + ${todayPosition}% * (100% - 150px) / 100);"></div>`;
    }
    
    console.log('Rendering projects:', filteredProjects.length);
    
    filteredProjects.forEach((project, index) => {
        console.log(`Project ${index + 1}:`, project);
        if (!project.startDate || !project.endDate) {
            console.warn(`Project ${project.name} missing dates:`, {startDate: project.startDate, endDate: project.endDate});
            return;
        }
        
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
            html += `<div class="gantt-bar" 
                data-project-id="${project.id}" 
                data-start-date="${project.startDate}" 
                data-end-date="${project.endDate}"
                style="left: ${barLeft}%; width: ${barWidth}%;" 
                title="${project.name}\n${projectStart.toLocaleDateString()} - ${projectEnd.toLocaleDateString()}">
                ${project.name}
                <div class="gantt-bar-resize-handle"></div>
            </div>`;
        }
        html += '</div></div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Initialize drag-and-drop interactions
    initGanttInteractions();
}

function filterProjectsByTeam() {
    const selectedTeam = getSelectedTeam();
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

function updateDebugDisplay(status, details) {
    const debugStatus = document.getElementById('debugStatus');
    const debugDetails = document.getElementById('debugDetails');
    if (debugStatus) debugStatus.textContent = status;
    if (debugDetails) debugDetails.textContent = details;
}

export function initGanttInteractions() {
    const container = document.getElementById('ganttChart');
    if (!container) return;
    
    let draggedBar = null;
    let dragType = null; // 'move' or 'resize'
    let initialMouseX = 0;
    let initialBarLeft = 0;
    let initialBarWidth = 0;
    let projectData = null;
    
    // Helper function to calculate date from position
    function positionToDate(positionPercent) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const startDate = new Date(currentYear - 1, 0, 1);
        const endDate = new Date(currentYear + 1, 11, 31);
        const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const daysOffset = (positionPercent / 100) * totalDays;
        const newDate = new Date(startDate.getTime() + daysOffset * 1000 * 60 * 60 * 24);
        return newDate;
    }
    
    // Helper function to calculate position from date
    function dateToPosition(date) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const startDate = new Date(currentYear - 1, 0, 1);
        const endDate = new Date(currentYear + 1, 11, 31);
        const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const daysOffset = (date - startDate) / (1000 * 60 * 60 * 24);
        return (daysOffset / totalDays) * 100;
    }
    
    // Format date for storage
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Update project dates and related assignments
    function updateProjectDates(projectId, newStartDate, newEndDate) {
        // Find the project
        const project = scheduleData.projects.find(p => p.id === projectId);
        if (!project) return;
        
        const oldStartDate = new Date(project.startDate);
        const oldEndDate = new Date(project.endDate);
        const oldDuration = (oldEndDate - oldStartDate) / (1000 * 60 * 60 * 24);
        const newDuration = (newEndDate - newStartDate) / (1000 * 60 * 60 * 24);
        
        // Update project dates
        project.startDate = formatDate(newStartDate);
        project.endDate = formatDate(newEndDate);
        
        // Update assignments for this project
        const projectAssignments = scheduleData.assignments.filter(a => a.projectId === projectId);
        
        projectAssignments.forEach(assignment => {
            if (assignment.week) {
                const weekDate = new Date(assignment.week);
                const weekOffset = (weekDate - oldStartDate) / (1000 * 60 * 60 * 24);
                
                // Calculate new week date based on the offset ratio
                const offsetRatio = oldDuration > 0 ? weekOffset / oldDuration : 0;
                const newWeekOffset = offsetRatio * newDuration;
                const newWeekDate = new Date(newStartDate.getTime() + newWeekOffset * 1000 * 60 * 60 * 24);
                
                // Ensure the new week is within project bounds
                if (newWeekDate >= newStartDate && newWeekDate <= newEndDate) {
                    assignment.week = formatDate(newWeekDate);
                }
            }
        });
        
        // Trigger update events
        updateScheduleData(scheduleData);
        eventBus.emit('dataUpdated');
    }
    
    // Mouse down handler
    container.addEventListener('mousedown', (e) => {
        const bar = e.target.closest('.gantt-bar');
        const resizeHandle = e.target.closest('.gantt-bar-resize-handle');
        
        if (!bar) return;
        
        draggedBar = bar;
        projectData = {
            id: bar.dataset.projectId,
            startDate: new Date(bar.dataset.startDate),
            endDate: new Date(bar.dataset.endDate)
        };
        
        if (resizeHandle) {
            dragType = 'resize';
        } else {
            dragType = 'move';
        }
        
        initialMouseX = e.clientX;
        const timeline = bar.parentElement;
        const timelineRect = timeline.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();
        
        initialBarLeft = ((barRect.left - timelineRect.left) / timelineRect.width) * 100;
        initialBarWidth = (barRect.width / timelineRect.width) * 100;
        
        // Add dragging class for visual feedback
        bar.classList.add('dragging');
        document.body.style.cursor = dragType === 'resize' ? 'ew-resize' : 'move';
        
        e.preventDefault();
    });
    
    // Mouse move handler
    document.addEventListener('mousemove', (e) => {
        if (!draggedBar || !projectData) return;
        
        const timeline = draggedBar.parentElement;
        const timelineRect = timeline.getBoundingClientRect();
        const deltaX = e.clientX - initialMouseX;
        const deltaPercent = (deltaX / timelineRect.width) * 100;
        
        if (dragType === 'move') {
            // Move the entire bar
            const newLeft = Math.max(0, Math.min(100 - initialBarWidth, initialBarLeft + deltaPercent));
            draggedBar.style.left = `${newLeft}%`;
            
            // Update tooltip with new dates
            const duration = projectData.endDate - projectData.startDate;
            const newStartDate = positionToDate(newLeft);
            const newEndDate = new Date(newStartDate.getTime() + duration);
            
            draggedBar.title = `${draggedBar.textContent.trim()}\n${newStartDate.toLocaleDateString()} - ${newEndDate.toLocaleDateString()}`;
        } else if (dragType === 'resize') {
            // Resize from the right edge
            const newWidth = Math.max(1, Math.min(100 - initialBarLeft, initialBarWidth + deltaPercent));
            draggedBar.style.width = `${newWidth}%`;
            
            // Update tooltip with new end date
            const newEndDate = positionToDate(initialBarLeft + newWidth);
            draggedBar.title = `${draggedBar.textContent.trim()}\n${projectData.startDate.toLocaleDateString()} - ${newEndDate.toLocaleDateString()}`;
        }
    });
    
    // Mouse up handler
    document.addEventListener('mouseup', (e) => {
        if (!draggedBar || !projectData) return;
        
        const timeline = draggedBar.parentElement;
        const timelineRect = timeline.getBoundingClientRect();
        const barRect = draggedBar.getBoundingClientRect();
        
        const finalBarLeft = ((barRect.left - timelineRect.left) / timelineRect.width) * 100;
        const finalBarWidth = (barRect.width / timelineRect.width) * 100;
        
        let newStartDate, newEndDate;
        
        if (dragType === 'move') {
            // Calculate new dates based on movement
            const duration = projectData.endDate - projectData.startDate;
            newStartDate = positionToDate(finalBarLeft);
            newEndDate = new Date(newStartDate.getTime() + duration);
        } else if (dragType === 'resize') {
            // Keep start date, update end date
            newStartDate = projectData.startDate;
            newEndDate = positionToDate(finalBarLeft + finalBarWidth);
        }
        
        // Update the project and assignments
        updateProjectDates(projectData.id, newStartDate, newEndDate);
        
        // Clean up
        draggedBar.classList.remove('dragging');
        draggedBar = null;
        dragType = null;
        projectData = null;
        document.body.style.cursor = '';
    });
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