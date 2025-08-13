// Core state management for the scheduler application
export const scheduleData = {
    employees: [],
    projects: [],
    assignments: [],
    skills: [],
    teams: ['All Teams']
};

export let currentView = 'gantt';
export let hoursView = 'employee';
export let selectedTeam = 'all';

export function setCurrentView(view) {
    currentView = view;
    emit('viewChanged', view);
}

export function setHoursView(view) {
    hoursView = view;
    emit('hoursViewChanged', view);
}

export function setSelectedTeam(team) {
    selectedTeam = team;
    emit('teamChanged', team);
}

export function updateScheduleData(newData) {
    Object.assign(scheduleData, newData);
    emit('dataUpdated', scheduleData);
}

export function addEmployee(employee) {
    scheduleData.employees.push(employee);
    emit('employeeAdded', employee);
}

export function addProject(project) {
    scheduleData.projects.push(project);
    emit('projectAdded', project);
}

export function addAssignment(assignment) {
    scheduleData.assignments.push(assignment);
    emit('assignmentAdded', assignment);
}

export function updateAssignment(assignmentId, updates) {
    const assignment = scheduleData.assignments.find(a => a.id === assignmentId);
    if (assignment) {
        Object.assign(assignment, updates);
        emit('assignmentUpdated', assignment);
    }
}

export function removeAssignment(assignmentId) {
    const index = scheduleData.assignments.findIndex(a => a.id === assignmentId);
    if (index !== -1) {
        const removed = scheduleData.assignments.splice(index, 1)[0];
        emit('assignmentRemoved', removed);
    }
}

// Event emitter functionality
const listeners = {};

export function on(event, callback) {
    if (!listeners[event]) {
        listeners[event] = [];
    }
    listeners[event].push(callback);
}

export function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
}

export function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(callback => callback(data));
}

// Utility functions
export function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

export function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek) + 1;
}

export function parseDate(dateValue) {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'number') {
        // Excel date serial number
        return new Date((dateValue - 25569) * 86400 * 1000);
    }
    return new Date(dateValue);
}

export function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}