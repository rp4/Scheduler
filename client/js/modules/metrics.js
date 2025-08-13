// Metrics calculation module
import { scheduleData } from '../core/state.js';
import eventBus from '../core/events.js';

export function calculateMetrics() {
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
    
    const metrics = {
        overtimeHours: totalOvertime,
        resourceUtilization: employeeCount > 0 ? Math.round(totalUtilization / employeeCount) : 0,
        skillsMatching: skillsScore
    };
    
    updateMetricsDisplay(metrics);
    eventBus.emit('metricsCalculated', metrics);
    
    return metrics;
}

export function updateMetricsDisplay(metrics) {
    const overtimeElement = document.getElementById('overtimeHours');
    const utilizationElement = document.getElementById('resourceUtilization');
    const skillsElement = document.getElementById('skillsMatching');
    
    if (overtimeElement) {
        overtimeElement.textContent = metrics.overtimeHours;
    }
    
    if (utilizationElement) {
        utilizationElement.textContent = metrics.resourceUtilization + '%';
    }
    
    if (skillsElement) {
        skillsElement.textContent = metrics.skillsMatching;
    }
}

export function getEmployeeMetrics(employeeId) {
    const employee = scheduleData.employees.find(e => e.id === employeeId || e.name === employeeId);
    if (!employee) return null;
    
    const assignments = scheduleData.assignments.filter(a => 
        a.employeeId === employee.id || a.employeeId === employee.name
    );
    
    const totalHours = assignments.reduce((sum, a) => sum + (a.hours || 0), 0);
    const overtime = Math.max(0, totalHours - (employee.maxHours || 40));
    const utilization = employee.maxHours > 0 ? (totalHours / employee.maxHours) * 100 : 0;
    
    return {
        totalHours,
        overtime,
        utilization: Math.round(utilization),
        assignmentCount: assignments.length
    };
}

export function getProjectMetrics(projectId) {
    const project = scheduleData.projects.find(p => p.id === projectId);
    if (!project) return null;
    
    const assignments = scheduleData.assignments.filter(a => a.projectId === projectId);
    const totalHours = assignments.reduce((sum, a) => sum + (a.hours || 0), 0);
    const uniqueEmployees = new Set(assignments.map(a => a.employeeId)).size;
    
    return {
        totalHours,
        employeeCount: uniqueEmployees,
        assignmentCount: assignments.length
    };
}

// Initialize metrics calculation on data changes
eventBus.on('dataUpdated', calculateMetrics);
eventBus.on('assignmentAdded', calculateMetrics);
eventBus.on('assignmentUpdated', calculateMetrics);
eventBus.on('assignmentRemoved', calculateMetrics);