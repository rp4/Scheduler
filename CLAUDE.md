# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Resource Scheduling Tool - a web-based employee scheduling application with Excel import/export capabilities, optimization algorithms, and MCP server integration for AI agents. The application provides Gantt chart visualization, resource allocation tracking, and intelligent schedule optimization.

## Development Commands

### Local Development
```bash
# Start local development server (opens at http://localhost:8000)
npm run dev

# Start HTTP server without auto-opening browser
npm run serve

# Run MCP server for AI agent integration
npm start
# or
npm run mcp

# Deploy to Vercel
npm run deploy
```

## Architecture

### Lightweight Modular Structure

The application follows a clean separation between client (static files) and server (MCP/Node.js):

```
/Scheduler
├── client/                    # Pure static files (no Node needed)
│   ├── index.html
│   ├── styles.css
│   ├── js/
│   │   ├── app.js            # Main entry (~5KB)
│   │   ├── core/
│   │   │   ├── state.js      # Data model & state management
│   │   │   └── events.js     # Event bus for modules
│   │   ├── modules/
│   │   │   ├── excel.js      # Import/export logic
│   │   │   ├── gantt.js      # Gantt chart view
│   │   │   ├── hours.js      # Hours tracking view
│   │   │   ├── skills.js     # Skills matrix view
│   │   │   └── metrics.js    # Metrics calculations
│   │   └── optimizer.js      # Lazy-loaded optimization engine
│
├── server/                    # MCP & API (Node required)
│   ├── mcp-server.js         # Standalone MCP server
│   └── api/                  # Vercel serverless functions
```

### Core Components

1. **Client Application (client/ directory)**
   - Pure static HTML/CSS/JS - works without any build process
   - Modular JavaScript with lazy loading for optimization
   - Tab-based navigation (Gantt Chart, Hours, Skills)
   - Excel file upload/download using XLSX.js CDN
   - Total initial load: ~15KB (only loads needed modules)

2. **Optimization Engine (client/js/optimizer.js)**
   - Loaded on-demand when optimization is requested
   - Three optimization algorithms:
     - Genetic Algorithm: Multi-objective optimization for complex scheduling
     - Simulated Annealing: Local optimization for fine-tuning
     - Constraint Satisfaction: Rule-based assignment validation
   - Fitness calculation based on skills matching, resource utilization, and overtime constraints

3. **MCP Server (server/mcp-server.js)**
   - Optional component for AI agent integration
   - Model Context Protocol server
   - Stdio-based transport for communication with AI agents
   - Completely separate from client functionality

4. **Vercel Deployment**
   - Serverless functions in server/api/ directory
   - Configuration in vercel.json for routing and function settings

### Data Model

The application works with Excel files containing these sheets:
- **Employees**: ID, Name, Email, Max Hours, skill proficiency columns
- **Projects**: ID, Name, Start Date, End Date, Portfolio, Required Skills
- **Assignments**: Employee ID, Project ID, Hours, Week
- **Skills** (optional): Employee skill matrix

### Key Functions and Entry Points

#### Client Modules

- **app.js**: Main application entry point
  - Initializes the application
  - Sets up event listeners
  - Manages module loading

- **core/state.js**: Central state management
  - `scheduleData`: Main data store for employees, projects, assignments
  - State update methods with event emission

- **modules/excel.js**: Excel import/export
  - `handleFileUpload()`: Excel file processing entry point
  - `parseExcelData()`: Converts Excel to internal data structure
  - `exportToExcel()`: Generates Excel file from current state

- **modules/gantt.js**: Gantt chart visualization
  - `renderGanttChart()`: Draws timeline view
  - `handleGanttInteractions()`: Manages drag-and-drop

- **modules/hours.js**: Hours management view
  - `renderHoursView()`: Displays employee/project hours
  - `updateAssignments()`: Handles hour allocations

- **modules/skills.js**: Skills matrix view
  - `renderSkillsMatrix()`: Shows employee skills
  - `updateSkills()`: Manages skill proficiency changes

- **modules/metrics.js**: Metrics calculations
  - `calculateMetrics()`: Computes overtime, utilization, skill matching
  - `updateMetricsDisplay()`: Updates UI metrics cards
  
- **optimizer.js** (lazy-loaded):
  - `ScheduleOptimizer`: Main optimization class
  - `calculateFitness()`: Evaluates schedule quality
  - `geneticAlgorithm()`, `simulatedAnnealing()`, `constraintSatisfaction()`: Optimization implementations

#### Server Components

- **server/mcp-server.js**:
  - MCP tool handlers for schedule operations
  - Standalone Node.js server using stdio transport

## MCP Server Tools

When working with the MCP server, these tools are available:
- `load_schedule`: Load Excel schedule file
- `get_employees`, `get_projects`, `get_assignments`: Retrieve data
- `assign_resource`: Create/update assignments
- `calculate_metrics`: Get scheduling metrics
- `check_availability`: Check employee availability
- `find_skilled_employees`: Find employees by skill
- `optimize_schedule`: Get optimization recommendations
- `export_schedule`: Export to Excel format

## Important Notes

- No test framework is currently configured - testing would need to be set up if required
- The application can run entirely client-side (open index.html directly) or with server features via npm commands
- Excel file format must match the expected structure for proper parsing
- Optimization algorithms balance multiple objectives: skill matching, resource utilization, overtime prevention, and project coverage