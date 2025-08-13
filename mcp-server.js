#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
    CallToolRequestSchema, 
    ListToolsRequestSchema 
} = require('@modelcontextprotocol/sdk/types.js');
const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');

class SchedulerMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'scheduler-mcp',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );
        
        this.scheduleData = {
            employees: [],
            projects: [],
            assignments: [],
            skills: []
        };
        
        this.setupToolHandlers();
    }
    
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'load_schedule',
                    description: 'Load schedule data from an Excel file',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            filePath: {
                                type: 'string',
                                description: 'Path to the Excel file to load'
                            }
                        },
                        required: ['filePath']
                    }
                },
                {
                    name: 'get_employees',
                    description: 'Get list of all employees with their details',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'get_projects',
                    description: 'Get list of all projects',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            portfolio: {
                                type: 'string',
                                description: 'Filter by portfolio (optional)'
                            }
                        }
                    }
                },
                {
                    name: 'get_assignments',
                    description: 'Get resource assignments',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            employeeId: {
                                type: 'string',
                                description: 'Filter by employee ID (optional)'
                            },
                            projectId: {
                                type: 'string',
                                description: 'Filter by project ID (optional)'
                            }
                        }
                    }
                },
                {
                    name: 'assign_resource',
                    description: 'Assign an employee to a project',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            employeeId: {
                                type: 'string',
                                description: 'Employee ID or name'
                            },
                            projectId: {
                                type: 'string',
                                description: 'Project ID or name'
                            },
                            hours: {
                                type: 'number',
                                description: 'Hours per week'
                            }
                        },
                        required: ['employeeId', 'projectId', 'hours']
                    }
                },
                {
                    name: 'calculate_metrics',
                    description: 'Calculate scheduling metrics (overtime, utilization, skills matching)',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'check_availability',
                    description: 'Check employee availability for a given period',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            employeeId: {
                                type: 'string',
                                description: 'Employee ID or name'
                            },
                            startDate: {
                                type: 'string',
                                description: 'Start date (YYYY-MM-DD)'
                            },
                            endDate: {
                                type: 'string',
                                description: 'End date (YYYY-MM-DD)'
                            }
                        },
                        required: ['employeeId']
                    }
                },
                {
                    name: 'find_skilled_employees',
                    description: 'Find employees with specific skills',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            skills: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'List of required skills'
                            },
                            minimumLevel: {
                                type: 'string',
                                enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
                                description: 'Minimum proficiency level required'
                            }
                        },
                        required: ['skills']
                    }
                },
                {
                    name: 'optimize_schedule',
                    description: 'Optimize resource allocation based on skills and availability',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            projectId: {
                                type: 'string',
                                description: 'Project to optimize (optional, optimizes all if not specified)'
                            }
                        }
                    }
                },
                {
                    name: 'export_schedule',
                    description: 'Export the current schedule to an Excel file',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            outputPath: {
                                type: 'string',
                                description: 'Path where to save the Excel file'
                            }
                        },
                        required: ['outputPath']
                    }
                }
            ]
        }));
        
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            
            try {
                switch (name) {
                    case 'load_schedule':
                        return await this.loadSchedule(args.filePath);
                    
                    case 'get_employees':
                        return { content: [{ type: 'text', text: JSON.stringify(this.scheduleData.employees, null, 2) }] };
                    
                    case 'get_projects':
                        return await this.getProjects(args.portfolio);
                    
                    case 'get_assignments':
                        return await this.getAssignments(args.employeeId, args.projectId);
                    
                    case 'assign_resource':
                        return await this.assignResource(args.employeeId, args.projectId, args.hours);
                    
                    case 'calculate_metrics':
                        return await this.calculateMetrics();
                    
                    case 'check_availability':
                        return await this.checkAvailability(args.employeeId, args.startDate, args.endDate);
                    
                    case 'find_skilled_employees':
                        return await this.findSkilledEmployees(args.skills, args.minimumLevel);
                    
                    case 'optimize_schedule':
                        return await this.optimizeSchedule(args.projectId);
                    
                    case 'export_schedule':
                        return await this.exportSchedule(args.outputPath);
                    
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${error.message}` }],
                    isError: true
                };
            }
        });
    }
    
    async loadSchedule(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            
            if (workbook.Sheets['Employees']) {
                const employeeSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Employees']);
                this.scheduleData.employees = employeeSheet.map(row => ({
                    id: row.ID || this.generateId(),
                    name: row.Name || row.Employee,
                    email: row.Email || '',
                    maxHours: row['Max Hours'] || 40,
                    skills: this.parseSkills(row)
                }));
            }
            
            if (workbook.Sheets['Projects']) {
                const projectSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Projects']);
                this.scheduleData.projects = projectSheet.map(row => ({
                    id: row.ID || this.generateId(),
                    name: row.Name || row.Project,
                    startDate: row['Start Date'],
                    endDate: row['End Date'],
                    portfolio: row.Portfolio || 'Default',
                    requiredSkills: row['Required Skills'] ? row['Required Skills'].split(',').map(s => s.trim()) : []
                }));
            }
            
            if (workbook.Sheets['Assignments']) {
                const assignmentSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Assignments']);
                this.scheduleData.assignments = assignmentSheet.map(row => ({
                    id: this.generateId(),
                    employeeId: row['Employee ID'] || row.Employee,
                    projectId: row['Project ID'] || row.Project,
                    hours: row.Hours || 0,
                    week: row.Week || this.getCurrentWeek()
                }));
            }
            
            return {
                content: [{
                    type: 'text',
                    text: `Successfully loaded schedule: ${this.scheduleData.employees.length} employees, ${this.scheduleData.projects.length} projects, ${this.scheduleData.assignments.length} assignments`
                }]
            };
        } catch (error) {
            throw new Error(`Failed to load schedule: ${error.message}`);
        }
    }
    
    parseSkills(row) {
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
    
    async getProjects(portfolio) {
        let projects = this.scheduleData.projects;
        if (portfolio && portfolio !== 'All Portfolios') {
            projects = projects.filter(p => p.portfolio === portfolio);
        }
        
        return {
            content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }]
        };
    }
    
    async getAssignments(employeeId, projectId) {
        let assignments = this.scheduleData.assignments;
        
        if (employeeId) {
            assignments = assignments.filter(a => 
                a.employeeId === employeeId || 
                this.scheduleData.employees.find(e => e.name === employeeId)?.id === a.employeeId
            );
        }
        
        if (projectId) {
            assignments = assignments.filter(a => 
                a.projectId === projectId || 
                this.scheduleData.projects.find(p => p.name === projectId)?.id === a.projectId
            );
        }
        
        return {
            content: [{ type: 'text', text: JSON.stringify(assignments, null, 2) }]
        };
    }
    
    async assignResource(employeeId, projectId, hours) {
        const employee = this.scheduleData.employees.find(e => e.id === employeeId || e.name === employeeId);
        const project = this.scheduleData.projects.find(p => p.id === projectId || p.name === projectId);
        
        if (!employee) throw new Error(`Employee not found: ${employeeId}`);
        if (!project) throw new Error(`Project not found: ${projectId}`);
        
        const existingAssignment = this.scheduleData.assignments.find(
            a => a.employeeId === employee.id && a.projectId === project.id
        );
        
        if (existingAssignment) {
            existingAssignment.hours = hours;
            return {
                content: [{
                    type: 'text',
                    text: `Updated assignment: ${employee.name} to ${project.name} - ${hours} hours/week`
                }]
            };
        } else {
            this.scheduleData.assignments.push({
                id: this.generateId(),
                employeeId: employee.id,
                projectId: project.id,
                hours: hours,
                week: this.getCurrentWeek()
            });
            
            return {
                content: [{
                    type: 'text',
                    text: `Created assignment: ${employee.name} to ${project.name} - ${hours} hours/week`
                }]
            };
        }
    }
    
    async calculateMetrics() {
        let totalOvertime = 0;
        let totalUtilization = 0;
        let employeeCount = 0;
        let skillsScore = 0;
        
        this.scheduleData.employees.forEach(employee => {
            const weeklyHours = this.scheduleData.assignments
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
        
        const avgUtilization = employeeCount > 0 ? Math.round(totalUtilization / employeeCount) : 0;
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    overtimeHours: totalOvertime,
                    resourceUtilization: `${avgUtilization}%`,
                    skillsMatching: skillsScore,
                    totalEmployees: this.scheduleData.employees.length,
                    totalProjects: this.scheduleData.projects.length,
                    totalAssignments: this.scheduleData.assignments.length
                }, null, 2)
            }]
        };
    }
    
    async checkAvailability(employeeId, startDate, endDate) {
        const employee = this.scheduleData.employees.find(e => e.id === employeeId || e.name === employeeId);
        if (!employee) throw new Error(`Employee not found: ${employeeId}`);
        
        const assignments = this.scheduleData.assignments.filter(a => 
            a.employeeId === employee.id || a.employeeId === employee.name
        );
        
        const totalHours = assignments.reduce((sum, a) => sum + (a.hours || 0), 0);
        const availableHours = employee.maxHours - totalHours;
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    employee: employee.name,
                    maxHours: employee.maxHours,
                    assignedHours: totalHours,
                    availableHours: availableHours,
                    isAvailable: availableHours > 0,
                    currentAssignments: assignments.map(a => {
                        const project = this.scheduleData.projects.find(p => p.id === a.projectId || p.name === a.projectId);
                        return {
                            project: project?.name || a.projectId,
                            hours: a.hours
                        };
                    })
                }, null, 2)
            }]
        };
    }
    
    async findSkilledEmployees(skills, minimumLevel = 'Beginner') {
        const levelValues = {
            'Beginner': 1,
            'Intermediate': 2,
            'Advanced': 3,
            'Expert': 4
        };
        
        const minValue = levelValues[minimumLevel] || 1;
        
        const matchingEmployees = this.scheduleData.employees.filter(employee => {
            return skills.every(skill => {
                const employeeLevel = employee.skills?.[skill];
                if (!employeeLevel || employeeLevel === 'None') return false;
                return levelValues[employeeLevel] >= minValue;
            });
        });
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    requestedSkills: skills,
                    minimumLevel: minimumLevel,
                    matchingEmployees: matchingEmployees.map(e => ({
                        id: e.id,
                        name: e.name,
                        email: e.email,
                        skills: Object.fromEntries(
                            Object.entries(e.skills || {}).filter(([k, v]) => skills.includes(k))
                        )
                    }))
                }, null, 2)
            }]
        };
    }
    
    async optimizeSchedule(projectId) {
        const projects = projectId 
            ? this.scheduleData.projects.filter(p => p.id === projectId || p.name === projectId)
            : this.scheduleData.projects;
        
        const recommendations = [];
        
        projects.forEach(project => {
            if (project.requiredSkills && project.requiredSkills.length > 0) {
                const currentAssignments = this.scheduleData.assignments.filter(a => 
                    a.projectId === project.id || a.projectId === project.name
                );
                
                const assignedEmployees = currentAssignments.map(a => 
                    this.scheduleData.employees.find(e => e.id === a.employeeId || e.name === a.employeeId)
                ).filter(Boolean);
                
                project.requiredSkills.forEach(skill => {
                    const hasSkill = assignedEmployees.some(e => 
                        e.skills?.[skill] && e.skills[skill] !== 'None'
                    );
                    
                    if (!hasSkill) {
                        const availableEmployees = this.scheduleData.employees.filter(e => {
                            const hasRequiredSkill = e.skills?.[skill] && e.skills[skill] !== 'None';
                            const currentHours = this.scheduleData.assignments
                                .filter(a => a.employeeId === e.id || a.employeeId === e.name)
                                .reduce((sum, a) => sum + (a.hours || 0), 0);
                            const hasAvailability = currentHours < e.maxHours;
                            
                            return hasRequiredSkill && hasAvailability;
                        });
                        
                        if (availableEmployees.length > 0) {
                            const bestMatch = availableEmployees.sort((a, b) => {
                                const levelValues = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3, 'Expert': 4 };
                                return (levelValues[b.skills[skill]] || 0) - (levelValues[a.skills[skill]] || 0);
                            })[0];
                            
                            recommendations.push({
                                project: project.name,
                                skill: skill,
                                recommendation: `Assign ${bestMatch.name} (${bestMatch.skills[skill]} in ${skill})`,
                                employee: bestMatch.name,
                                proficiency: bestMatch.skills[skill]
                            });
                        } else {
                            recommendations.push({
                                project: project.name,
                                skill: skill,
                                recommendation: `No available employees with ${skill} skill`,
                                employee: null,
                                proficiency: null
                            });
                        }
                    }
                });
            }
        });
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    optimizationComplete: true,
                    recommendationsCount: recommendations.length,
                    recommendations: recommendations
                }, null, 2)
            }]
        };
    }
    
    async exportSchedule(outputPath) {
        const wb = XLSX.utils.book_new();
        
        const employees = this.scheduleData.employees.map(emp => {
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
        
        const projects = this.scheduleData.projects.map(proj => ({
            ID: proj.id,
            Name: proj.name,
            'Start Date': proj.startDate,
            'End Date': proj.endDate,
            Portfolio: proj.portfolio,
            'Required Skills': proj.requiredSkills ? proj.requiredSkills.join(', ') : ''
        }));
        const wsProjects = XLSX.utils.json_to_sheet(projects);
        XLSX.utils.book_append_sheet(wb, wsProjects, 'Projects');
        
        const assignments = this.scheduleData.assignments.map(assign => ({
            'Employee ID': assign.employeeId,
            'Project ID': assign.projectId,
            Hours: assign.hours,
            Week: assign.week
        }));
        const wsAssignments = XLSX.utils.json_to_sheet(assignments);
        XLSX.utils.book_append_sheet(wb, wsAssignments, 'Assignments');
        
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        await fs.writeFile(outputPath, buffer);
        
        return {
            content: [{
                type: 'text',
                text: `Schedule exported successfully to ${outputPath}`
            }]
        };
    }
    
    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }
    
    getCurrentWeek() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now - start;
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        return Math.floor(diff / oneWeek);
    }
    
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Scheduler MCP server running on stdio');
    }
}

const server = new SchedulerMCPServer();
server.run().catch(console.error);