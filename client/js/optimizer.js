export class ScheduleOptimizer {
    constructor(employees, projects, assignments) {
        this.employees = employees;
        this.projects = projects;
        this.assignments = assignments;
        this.skillLevels = {
            'None': 0,
            'Beginner': 1,
            'Intermediate': 2,
            'Advanced': 3,
            'Expert': 4
        };
    }

    calculateFitness(solution) {
        let fitness = 0;
        let penalties = 0;
        
        const employeeHours = new Map();
        const projectCoverage = new Map();
        
        for (const assignment of solution) {
            const hours = employeeHours.get(assignment.employeeId) || 0;
            employeeHours.set(assignment.employeeId, hours + assignment.hours);
            
            const coverage = projectCoverage.get(assignment.projectId) || [];
            coverage.push(assignment);
            projectCoverage.set(assignment.projectId, coverage);
        }
        
        for (const [empId, hours] of employeeHours) {
            const employee = this.employees.find(e => e.id === empId);
            if (!employee) continue;
            
            if (hours > employee.maxHours) {
                penalties += (hours - employee.maxHours) * 100;
            }
            
            if (hours > 0 && hours <= employee.maxHours) {
                fitness += (hours / employee.maxHours) * 50;
            }
        }
        
        for (const project of this.projects) {
            const assignments = projectCoverage.get(project.id) || [];
            
            if (project.requiredSkills) {
                for (const skill of project.requiredSkills) {
                    let maxSkillLevel = 0;
                    
                    for (const assignment of assignments) {
                        const employee = this.employees.find(e => e.id === assignment.employeeId);
                        if (employee && employee.skills && employee.skills[skill]) {
                            const level = this.skillLevels[employee.skills[skill]] || 0;
                            maxSkillLevel = Math.max(maxSkillLevel, level);
                        }
                    }
                    
                    fitness += maxSkillLevel * 25;
                    
                    if (maxSkillLevel === 0) {
                        penalties += 200;
                    }
                }
            }
            
            const totalProjectHours = assignments.reduce((sum, a) => sum + a.hours, 0);
            if (totalProjectHours > 0) {
                fitness += 30;
            }
        }
        
        const uniqueEmployees = new Set(solution.map(a => a.employeeId)).size;
        fitness += uniqueEmployees * 10;
        
        return fitness - penalties;
    }

    geneticAlgorithm(options = {}) {
        const {
            populationSize = 50,
            generations = 100,
            mutationRate = 0.1,
            eliteSize = 5,
            crossoverRate = 0.7
        } = options;
        
        let population = this.initializePopulation(populationSize);
        let bestSolution = null;
        let bestFitness = -Infinity;
        const history = [];
        
        for (let gen = 0; gen < generations; gen++) {
            const fitnessScores = population.map(individual => ({
                individual,
                fitness: this.calculateFitness(individual)
            }));
            
            fitnessScores.sort((a, b) => b.fitness - a.fitness);
            
            if (fitnessScores[0].fitness > bestFitness) {
                bestFitness = fitnessScores[0].fitness;
                bestSolution = JSON.parse(JSON.stringify(fitnessScores[0].individual));
            }
            
            history.push({
                generation: gen,
                bestFitness,
                avgFitness: fitnessScores.reduce((sum, s) => sum + s.fitness, 0) / fitnessScores.length
            });
            
            const newPopulation = [];
            
            for (let i = 0; i < eliteSize && i < fitnessScores.length; i++) {
                newPopulation.push(fitnessScores[i].individual);
            }
            
            while (newPopulation.length < populationSize) {
                if (Math.random() < crossoverRate && fitnessScores.length >= 2) {
                    const parent1 = this.tournamentSelection(fitnessScores);
                    const parent2 = this.tournamentSelection(fitnessScores);
                    const child = this.crossover(parent1, parent2);
                    
                    if (Math.random() < mutationRate) {
                        this.mutate(child);
                    }
                    
                    newPopulation.push(child);
                } else {
                    const parent = this.tournamentSelection(fitnessScores);
                    const child = JSON.parse(JSON.stringify(parent));
                    
                    if (Math.random() < mutationRate) {
                        this.mutate(child);
                    }
                    
                    newPopulation.push(child);
                }
            }
            
            population = newPopulation;
        }
        
        return {
            solution: bestSolution,
            fitness: bestFitness,
            history
        };
    }

    simulatedAnnealing(options = {}) {
        const {
            initialTemp = 1000,
            coolingRate = 0.95,
            minTemp = 1,
            maxIterations = 1000
        } = options;
        
        let currentSolution = this.generateRandomSolution();
        let currentFitness = this.calculateFitness(currentSolution);
        
        let bestSolution = JSON.parse(JSON.stringify(currentSolution));
        let bestFitness = currentFitness;
        
        let temperature = initialTemp;
        const history = [];
        
        for (let i = 0; i < maxIterations && temperature > minTemp; i++) {
            const neighbor = this.getNeighbor(currentSolution);
            const neighborFitness = this.calculateFitness(neighbor);
            
            const delta = neighborFitness - currentFitness;
            
            if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
                currentSolution = neighbor;
                currentFitness = neighborFitness;
                
                if (currentFitness > bestFitness) {
                    bestSolution = JSON.parse(JSON.stringify(currentSolution));
                    bestFitness = currentFitness;
                }
            }
            
            temperature *= coolingRate;
            
            if (i % 10 === 0) {
                history.push({
                    iteration: i,
                    temperature,
                    currentFitness,
                    bestFitness
                });
            }
        }
        
        return {
            solution: bestSolution,
            fitness: bestFitness,
            history
        };
    }

    constraintSatisfaction(options = {}) {
        const {
            maxIterations = 1000,
            improvementThreshold = 0.01
        } = options;
        
        let solution = [];
        const unassignedProjects = new Set(this.projects.map(p => p.id));
        const employeeAvailability = new Map();
        
        this.employees.forEach(emp => {
            employeeAvailability.set(emp.id, emp.maxHours || 40);
        });
        
        const projectPriorities = this.projects.map(project => {
            let priority = 0;
            
            const duration = (new Date(project.endDate) - new Date(project.startDate)) / (1000 * 60 * 60 * 24);
            priority += 100 / (duration + 1);
            
            if (project.requiredSkills && project.requiredSkills.length > 0) {
                priority += project.requiredSkills.length * 10;
            }
            
            return { project, priority };
        }).sort((a, b) => b.priority - a.priority);
        
        for (const { project } of projectPriorities) {
            if (!unassignedProjects.has(project.id)) continue;
            
            const requiredHours = 20;
            let remainingHours = requiredHours;
            
            const eligibleEmployees = this.employees
                .filter(emp => {
                    const available = employeeAvailability.get(emp.id) || 0;
                    if (available <= 0) return false;
                    
                    if (!project.requiredSkills || project.requiredSkills.length === 0) {
                        return true;
                    }
                    
                    return project.requiredSkills.some(skill => {
                        const level = this.skillLevels[emp.skills?.[skill]] || 0;
                        return level > 0;
                    });
                })
                .map(emp => {
                    let score = 0;
                    
                    if (project.requiredSkills) {
                        project.requiredSkills.forEach(skill => {
                            const level = this.skillLevels[emp.skills?.[skill]] || 0;
                            score += level * 10;
                        });
                    }
                    
                    const available = employeeAvailability.get(emp.id) || 0;
                    score += available / 40 * 5;
                    
                    return { employee: emp, score };
                })
                .sort((a, b) => b.score - a.score);
            
            for (const { employee } of eligibleEmployees) {
                if (remainingHours <= 0) break;
                
                const available = employeeAvailability.get(employee.id) || 0;
                const hoursToAssign = Math.min(remainingHours, available, 20);
                
                if (hoursToAssign > 0) {
                    solution.push({
                        id: `assign_${Date.now()}_${Math.random()}`,
                        employeeId: employee.id,
                        projectId: project.id,
                        hours: hoursToAssign
                    });
                    
                    employeeAvailability.set(employee.id, available - hoursToAssign);
                    remainingHours -= hoursToAssign;
                }
            }
            
            if (remainingHours < requiredHours) {
                unassignedProjects.delete(project.id);
            }
        }
        
        for (let iter = 0; iter < maxIterations; iter++) {
            let improved = false;
            
            for (let i = 0; i < solution.length; i++) {
                for (let j = i + 1; j < solution.length; j++) {
                    const assignment1 = solution[i];
                    const assignment2 = solution[j];
                    
                    const emp1 = this.employees.find(e => e.id === assignment1.employeeId);
                    const emp2 = this.employees.find(e => e.id === assignment2.employeeId);
                    const proj1 = this.projects.find(p => p.id === assignment1.projectId);
                    const proj2 = this.projects.find(p => p.id === assignment2.projectId);
                    
                    if (!emp1 || !emp2 || !proj1 || !proj2) continue;
                    
                    const currentScore = this.getAssignmentScore(emp1, proj1) + this.getAssignmentScore(emp2, proj2);
                    const swapScore = this.getAssignmentScore(emp1, proj2) + this.getAssignmentScore(emp2, proj1);
                    
                    if (swapScore > currentScore * (1 + improvementThreshold)) {
                        assignment1.projectId = proj2.id;
                        assignment2.projectId = proj1.id;
                        improved = true;
                    }
                }
            }
            
            if (!improved) break;
        }
        
        return {
            solution,
            fitness: this.calculateFitness(solution),
            unassignedProjects: Array.from(unassignedProjects)
        };
    }

    initializePopulation(size) {
        const population = [];
        for (let i = 0; i < size; i++) {
            population.push(this.generateRandomSolution());
        }
        return population;
    }

    generateRandomSolution() {
        const solution = [];
        
        for (const project of this.projects) {
            const numAssignments = Math.floor(Math.random() * 3) + 1;
            const availableEmployees = [...this.employees];
            
            for (let i = 0; i < numAssignments && availableEmployees.length > 0; i++) {
                const empIndex = Math.floor(Math.random() * availableEmployees.length);
                const employee = availableEmployees[empIndex];
                availableEmployees.splice(empIndex, 1);
                
                const hours = Math.floor(Math.random() * 20) + 5;
                
                solution.push({
                    id: `assign_${Date.now()}_${Math.random()}`,
                    employeeId: employee.id,
                    projectId: project.id,
                    hours: Math.min(hours, 40)
                });
            }
        }
        
        return solution;
    }

    tournamentSelection(fitnessScores, tournamentSize = 3) {
        const tournament = [];
        for (let i = 0; i < tournamentSize; i++) {
            const index = Math.floor(Math.random() * fitnessScores.length);
            tournament.push(fitnessScores[index]);
        }
        tournament.sort((a, b) => b.fitness - a.fitness);
        return tournament[0].individual;
    }

    crossover(parent1, parent2) {
        const child = [];
        const projectIds = [...new Set([...parent1, ...parent2].map(a => a.projectId))];
        
        for (const projectId of projectIds) {
            const p1Assignments = parent1.filter(a => a.projectId === projectId);
            const p2Assignments = parent2.filter(a => a.projectId === projectId);
            
            if (Math.random() < 0.5) {
                child.push(...p1Assignments.map(a => ({...a})));
            } else {
                child.push(...p2Assignments.map(a => ({...a})));
            }
        }
        
        return child;
    }

    mutate(solution) {
        const mutationType = Math.floor(Math.random() * 4);
        
        switch (mutationType) {
            case 0:
                if (solution.length > 0) {
                    const index = Math.floor(Math.random() * solution.length);
                    const newEmployee = this.employees[Math.floor(Math.random() * this.employees.length)];
                    solution[index].employeeId = newEmployee.id;
                }
                break;
                
            case 1:
                if (solution.length > 0) {
                    const index = Math.floor(Math.random() * solution.length);
                    solution[index].hours = Math.min(40, Math.max(5, solution[index].hours + (Math.random() * 10 - 5)));
                }
                break;
                
            case 2:
                if (solution.length > 1) {
                    const index = Math.floor(Math.random() * solution.length);
                    solution.splice(index, 1);
                }
                break;
                
            case 3:
                const randomProject = this.projects[Math.floor(Math.random() * this.projects.length)];
                const randomEmployee = this.employees[Math.floor(Math.random() * this.employees.length)];
                solution.push({
                    id: `assign_${Date.now()}_${Math.random()}`,
                    employeeId: randomEmployee.id,
                    projectId: randomProject.id,
                    hours: Math.floor(Math.random() * 20) + 5
                });
                break;
        }
    }

    getNeighbor(solution) {
        const neighbor = JSON.parse(JSON.stringify(solution));
        this.mutate(neighbor);
        return neighbor;
    }

    getAssignmentScore(employee, project) {
        let score = 0;
        
        if (project.requiredSkills) {
            project.requiredSkills.forEach(skill => {
                const level = this.skillLevels[employee.skills?.[skill]] || 0;
                score += level * 10;
            });
        }
        
        return score;
    }

    getOptimizationSummary(result) {
        const employeeUtilization = new Map();
        const projectCoverage = new Map();
        const skillMatches = [];
        
        for (const assignment of result.solution) {
            const hours = employeeUtilization.get(assignment.employeeId) || 0;
            employeeUtilization.set(assignment.employeeId, hours + assignment.hours);
            
            const coverage = projectCoverage.get(assignment.projectId) || [];
            coverage.push(assignment);
            projectCoverage.set(assignment.projectId, coverage);
        }
        
        for (const project of this.projects) {
            const assignments = projectCoverage.get(project.id) || [];
            if (project.requiredSkills) {
                for (const skill of project.requiredSkills) {
                    const matches = assignments.filter(a => {
                        const emp = this.employees.find(e => e.id === a.employeeId);
                        return emp && emp.skills && emp.skills[skill] && emp.skills[skill] !== 'None';
                    });
                    
                    skillMatches.push({
                        project: project.name,
                        skill,
                        matched: matches.length > 0,
                        employees: matches.map(a => {
                            const emp = this.employees.find(e => e.id === a.employeeId);
                            return {
                                name: emp.name,
                                level: emp.skills[skill]
                            };
                        })
                    });
                }
            }
        }
        
        const utilizationStats = Array.from(employeeUtilization.entries()).map(([empId, hours]) => {
            const employee = this.employees.find(e => e.id === empId);
            return {
                employee: employee?.name || empId,
                hours,
                maxHours: employee?.maxHours || 40,
                utilization: ((hours / (employee?.maxHours || 40)) * 100).toFixed(1) + '%',
                overtime: Math.max(0, hours - (employee?.maxHours || 40))
            };
        });
        
        const projectStats = Array.from(projectCoverage.entries()).map(([projId, assignments]) => {
            const project = this.projects.find(p => p.id === projId);
            return {
                project: project?.name || projId,
                assignedEmployees: assignments.length,
                totalHours: assignments.reduce((sum, a) => sum + a.hours, 0),
                employees: assignments.map(a => {
                    const emp = this.employees.find(e => e.id === a.employeeId);
                    return {
                        name: emp?.name || a.employeeId,
                        hours: a.hours
                    };
                })
            };
        });
        
        return {
            fitness: result.fitness,
            totalAssignments: result.solution.length,
            employeeUtilization: utilizationStats,
            projectCoverage: projectStats,
            skillMatches,
            unassignedProjects: result.unassignedProjects || []
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScheduleOptimizer;
}