// Sample data generator for testing
import { scheduleData, updateScheduleData, generateId } from '../core/state.js';
import eventBus from '../core/events.js';

export function loadTestData() {
    const testData = {
        employees: [
            { id: 'E001', name: 'John Smith', email: 'john@example.com', maxHours: 40, team: 'Development', skills: { JavaScript: 'Expert', Python: 'Intermediate', React: 'Expert' } },
            { id: 'E002', name: 'Jane Doe', email: 'jane@example.com', maxHours: 40, team: 'Development', skills: { JavaScript: 'Intermediate', Python: 'Expert', Django: 'Expert' } },
            { id: 'E003', name: 'Bob Wilson', email: 'bob@example.com', maxHours: 35, team: 'Design', skills: { Figma: 'Expert', Photoshop: 'Expert', CSS: 'Intermediate' } },
            { id: 'E004', name: 'Alice Johnson', email: 'alice@example.com', maxHours: 40, team: 'QA', skills: { Testing: 'Expert', Selenium: 'Expert', JavaScript: 'Beginner' } },
            { id: 'E005', name: 'Charlie Brown', email: 'charlie@example.com', maxHours: 40, team: 'Development', skills: { Java: 'Expert', Spring: 'Expert', SQL: 'Intermediate' } }
        ],
        projects: [
            { 
                id: 'P001', 
                name: 'Website Redesign', 
                startDate: new Date('2025-01-15'), 
                endDate: new Date('2025-03-30'),
                requiredSkills: ['JavaScript', 'React', 'CSS']
            },
            { 
                id: 'P002', 
                name: 'Mobile App Development', 
                startDate: new Date('2025-02-01'), 
                endDate: new Date('2025-05-15'),
                requiredSkills: ['React Native', 'JavaScript']
            },
            { 
                id: 'P003', 
                name: 'Backend API', 
                startDate: new Date('2025-01-20'), 
                endDate: new Date('2025-04-10'),
                requiredSkills: ['Python', 'Django', 'SQL']
            },
            { 
                id: 'P004', 
                name: 'Testing Automation', 
                startDate: new Date('2025-02-15'), 
                endDate: new Date('2025-04-30'),
                requiredSkills: ['Testing', 'Selenium']
            },
            { 
                id: 'P005', 
                name: 'Database Migration', 
                startDate: new Date('2025-03-01'), 
                endDate: new Date('2025-06-01'),
                requiredSkills: ['SQL', 'Java', 'Spring']
            }
        ],
        assignments: [
            { id: generateId(), employeeId: 'E001', projectId: 'P001', hours: 20, week: 'JAN 15' },
            { id: generateId(), employeeId: 'E001', projectId: 'P002', hours: 20, week: 'JAN 15' },
            { id: generateId(), employeeId: 'E002', projectId: 'P003', hours: 30, week: 'JAN 20' },
            { id: generateId(), employeeId: 'E003', projectId: 'P001', hours: 25, week: 'JAN 15' },
            { id: generateId(), employeeId: 'E004', projectId: 'P004', hours: 35, week: 'FEB 15' },
            { id: generateId(), employeeId: 'E005', projectId: 'P005', hours: 40, week: 'MAR 1' },
            { id: generateId(), employeeId: 'E002', projectId: 'P005', hours: 10, week: 'MAR 1' }
        ],
        skills: ['JavaScript', 'Python', 'React', 'Django', 'Figma', 'Photoshop', 'CSS', 'Testing', 'Selenium', 'Java', 'Spring', 'SQL', 'React Native'],
        teams: ['All Teams', 'Development', 'Design', 'QA']
    };
    
    console.log('Loading test data:', testData);
    updateScheduleData(testData);
    eventBus.emit('dataLoaded', scheduleData);
    
    // Update debug display
    const debugStatus = document.getElementById('debugStatus');
    const debugDetails = document.getElementById('debugDetails');
    if (debugStatus) debugStatus.textContent = 'Test Data Loaded';
    if (debugDetails) debugDetails.textContent = `Employees: ${testData.employees.length}\nProjects: ${testData.projects.length}\nAssignments: ${testData.assignments.length}`;
    
    // Force UI updates if app functions are available
    if (window.updateUI) {
        console.log('Calling updateUI()');
        window.updateUI();
    }
    if (window.updateTeamDropdown) {
        console.log('Calling updateTeamDropdown()');
        window.updateTeamDropdown();
    }
    
    // Also try to render the Gantt chart directly
    import('./gantt.js').then(module => {
        console.log('Rendering Gantt chart directly');
        module.renderGanttChart();
    });
    
    return testData;
}

// Add to window for easy testing
if (typeof window !== 'undefined') {
    window.loadTestData = loadTestData;
}