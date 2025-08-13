// Main application entry point
import * as state from './core/state.js';
import eventBus from './core/events.js';
import { handleFileUpload, exportToExcel } from './modules/excel.js';
import { calculateMetrics } from './modules/metrics.js';
import { renderGanttChart } from './modules/gantt.js';
import { renderHoursView, assignToProject } from './modules/hours.js';
import { renderSkillsMatrix, updateSkill } from './modules/skills.js';

// Global variables for optimization
let optimizationResult = null;
let ScheduleOptimizer = null;

// Initialize the application
function init() {
    setupEventListeners();
    
    // Check if we have pre-loaded data from landing page
    const storedFile = sessionStorage.getItem('scheduleFile');
    if (storedFile) {
        loadStoredFile(storedFile);
        sessionStorage.removeItem('scheduleFile');
        sessionStorage.removeItem('scheduleFileName');
    } else {
        updateUI();
    }
    
    // Expose necessary functions to window for inline event handlers
    window.switchTab = switchTab;
    window.switchHoursView = switchHoursView;
    window.exportToExcel = exportToExcel;
    window.toggleDropdown = toggleDropdown;
    window.assignToProject = assignToProject;
    window.updateSkill = updateSkill;
    window.showOptimizeModal = showOptimizeModal;
    window.hideOptimizeModal = hideOptimizeModal;
    window.runOptimization = runOptimization;
    window.applyOptimization = applyOptimization;
    window.discardOptimization = discardOptimization;
}

// Load file from sessionStorage
function loadStoredFile(dataUrl) {
    // Convert data URL to array buffer
    fetch(dataUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Import using existing excel module
            const excelModule = import('./modules/excel.js');
            excelModule.then(module => {
                module.parseExcelData(workbook);
                updateUI();
            });
        });
}

function setupEventListeners() {
    // Download button
    document.getElementById('downloadBtn').addEventListener('click', exportToExcel);
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Hours view toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => switchHoursView(btn.dataset.view));
    });
    
    // Portfolio selector
    document.getElementById('portfolio').addEventListener('change', (e) => {
        state.setSelectedPortfolio(e.target.value);
        updateUI();
    });
    
    // Project modal (keeping modal but removing button listener)
    document.getElementById('projectForm').addEventListener('submit', saveProject);
    document.querySelector('#projectModal .close').addEventListener('click', hideProjectModal);
    
    // Optimize modal
    document.getElementById('optimizeBtn').addEventListener('click', showOptimizeModal);
    document.getElementById('closeOptimizeModal').addEventListener('click', hideOptimizeModal);
    document.getElementById('runOptimizationBtn').addEventListener('click', runOptimization);
    document.getElementById('cancelOptimizationBtn').addEventListener('click', hideOptimizeModal);
    document.getElementById('applyOptimizationBtn').addEventListener('click', applyOptimization);
    document.getElementById('discardOptimizationBtn').addEventListener('click', discardOptimization);
    
    // Algorithm selection
    document.querySelectorAll('input[name="algorithm"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.param-group').forEach(group => {
                group.style.display = 'none';
            });
            
            if (e.target.value === 'genetic') {
                document.getElementById('geneticParams').style.display = 'block';
            } else if (e.target.value === 'annealing') {
                document.getElementById('annealingParams').style.display = 'block';
            } else if (e.target.value === 'constraint') {
                document.getElementById('constraintParams').style.display = 'block';
            }
        });
    });
    
    
    // Listen for data updates
    eventBus.on('dataUpdated', () => {
        updatePortfolioDropdown();
        updateUI();
    });
    
    eventBus.on('dataLoaded', () => {
        updatePortfolioDropdown();
        updateUI();
    });
}

function updateUI() {
    calculateMetrics();
    
    switch(state.currentView) {
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

function switchTab(tab) {
    state.setCurrentView(tab);
    
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    document.querySelector(`.tab-button[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(tab + 'Tab').style.display = 'block';
    
    updateUI();
}

function switchHoursView(view) {
    state.setHoursView(view);
    
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.view-btn[data-view="${view}"]`).classList.add('active');
    
    renderHoursView();
}

function updatePortfolioDropdown() {
    const dropdown = document.getElementById('portfolio');
    dropdown.innerHTML = '';
    
    state.scheduleData.portfolios.forEach(portfolio => {
        const option = document.createElement('option');
        option.value = portfolio === 'All Portfolios' ? 'all' : portfolio;
        option.textContent = portfolio;
        dropdown.appendChild(option);
    });
}

function toggleDropdown(event) {
    event.stopPropagation();
    const dropdown = event.target.nextElementSibling;
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// Project modal functions
function showProjectModal() {
    const modal = document.getElementById('projectModal');
    const employeeSelect = document.getElementById('projectEmployee');
    
    employeeSelect.innerHTML = '<option value="">Select Employee</option>';
    state.scheduleData.employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.name;
        employeeSelect.appendChild(option);
    });
    
    modal.style.display = 'block';
}

function hideProjectModal() {
    document.getElementById('projectModal').style.display = 'none';
    document.getElementById('projectForm').reset();
}

function saveProject(event) {
    event.preventDefault();
    
    const project = {
        id: state.generateId(),
        name: document.getElementById('projectName').value,
        startDate: new Date(document.getElementById('projectStart').value),
        endDate: new Date(document.getElementById('projectEnd').value),
        portfolio: 'Default',
        requiredSkills: []
    };
    
    state.addProject(project);
    
    const employeeId = document.getElementById('projectEmployee').value;
    const hours = parseInt(document.getElementById('projectHours').value) || 40;
    
    if (employeeId) {
        const assignment = {
            id: state.generateId(),
            employeeId,
            projectId: project.id,
            hours,
            week: state.getCurrentWeek()
        };
        state.addAssignment(assignment);
    }
    
    hideProjectModal();
    updateUI();
}

// Optimization modal functions
async function showOptimizeModal() {
    const modal = document.getElementById('optimizeModal');
    modal.style.display = 'block';
    
    // Reset UI
    document.getElementById('optimizationProgress').style.display = 'none';
    document.getElementById('optimizationResults').style.display = 'none';
    document.querySelector('.optimize-options').style.display = 'block';
}

function hideOptimizeModal() {
    document.getElementById('optimizeModal').style.display = 'none';
}

async function runOptimization() {
    // Lazy load optimizer if not already loaded
    if (!ScheduleOptimizer) {
        const module = await import('../optimizer.js');
        ScheduleOptimizer = module.default || module.ScheduleOptimizer;
    }
    
    const algorithm = document.querySelector('input[name="algorithm"]:checked').value;
    
    document.querySelector('.optimize-options').style.display = 'none';
    document.getElementById('optimizationProgress').style.display = 'block';
    
    const optimizer = new ScheduleOptimizer(
        state.scheduleData.employees,
        state.scheduleData.projects,
        state.scheduleData.assignments
    );
    
    let params = {};
    
    if (algorithm === 'genetic') {
        params = {
            generations: parseInt(document.getElementById('generations').value),
            populationSize: parseInt(document.getElementById('populationSize').value),
            mutationRate: parseFloat(document.getElementById('mutationRate').value)
        };
    } else if (algorithm === 'annealing') {
        params = {
            initialTemp: parseInt(document.getElementById('initialTemp').value),
            coolingRate: parseFloat(document.getElementById('coolingRate').value),
            maxIterations: parseInt(document.getElementById('maxIterations').value)
        };
    } else if (algorithm === 'constraint') {
        params = {
            maxIterations: parseInt(document.getElementById('constraintIterations').value)
        };
    }
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 5;
        if (progress <= 90) {
            document.getElementById('progressFill').style.width = progress + '%';
            document.getElementById('optimizationStatus').textContent = `Processing... ${progress}%`;
        }
    }, 100);
    
    // Run optimization
    setTimeout(() => {
        try {
            if (algorithm === 'genetic') {
                optimizationResult = optimizer.geneticAlgorithm(params);
            } else if (algorithm === 'annealing') {
                optimizationResult = optimizer.simulatedAnnealing(params);
            } else {
                optimizationResult = optimizer.constraintSatisfaction(params);
            }
            
            clearInterval(progressInterval);
            document.getElementById('progressFill').style.width = '100%';
            document.getElementById('optimizationStatus').textContent = 'Complete!';
            
            setTimeout(() => {
                showOptimizationResults();
            }, 500);
        } catch (error) {
            clearInterval(progressInterval);
            alert('Optimization failed: ' + error.message);
            hideOptimizeModal();
        }
    }, 500);
}

function showOptimizationResults() {
    document.getElementById('optimizationProgress').style.display = 'none';
    document.getElementById('optimizationResults').style.display = 'block';
    
    if (optimizationResult && optimizationResult.solution) {
        const summary = document.getElementById('resultsSummary');
        summary.innerHTML = `
            <p><strong>Fitness Score:</strong> ${Math.round(optimizationResult.fitness)}</p>
            <p><strong>Assignments:</strong> ${optimizationResult.solution.length}</p>
            <p><strong>Improvements:</strong></p>
            <ul>
                <li>Better skill matching</li>
                <li>Reduced overtime hours</li>
                <li>Improved resource utilization</li>
            </ul>
        `;
    }
}

function applyOptimization() {
    if (optimizationResult && optimizationResult.solution) {
        state.scheduleData.assignments = optimizationResult.solution;
        state.emit('dataUpdated', state.scheduleData);
        updateUI();
        hideOptimizeModal();
    }
}

function discardOptimization() {
    optimizationResult = null;
    hideOptimizeModal();
}

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-content').forEach(dropdown => {
        dropdown.style.display = 'none';
    });
});

// Initialize the application when this script is loaded
// (which only happens when landing.js loads it after file upload)
init();