# Resource Scheduling Tool

A comprehensive HTML-based employee scheduling application with Excel import/export capabilities, optimization algorithms, and MCP server integration for AI agents.

## Features

- **Gantt Chart View**: Visual timeline of projects
- **Hours Management**: Track employee assignments by employee or project
- **Skills Matrix**: Manage employee skills and proficiency levels
- **Key Metrics**: Monitor overtime hours, resource utilization, and skills matching
- **Excel Integration**: Upload and download schedule data in Excel format
- **Optimization Algorithms**:
  - Genetic Algorithm for complex multi-objective optimization
  - Simulated Annealing for local optimization
  - Constraint Satisfaction for rule-based assignment
- **MCP Server**: AI agent integration for automated scheduling operations
- **Vercel Deployment Ready**: Serverless functions for API endpoints

## Quick Start

### Local Development

1. Open `index.html` in a web browser
2. Click "Upload Excel" to load your schedule data
3. Use the "Optimize Schedule" button to run optimization algorithms
4. Navigate between Gantt Chart, Hours, and Skills tabs
5. Make assignments and track resource allocation
6. Click "Download Excel" to export your updated schedule

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy to Vercel:
```bash
vercel
```

3. Follow the prompts to deploy your application

### Generate Sample Data

1. Open `generate_sample.html` in a browser
2. Click "Generate Sample Excel File"
3. Upload the generated file in the main application

### MCP Server Setup (Local)

1. Install dependencies:
```bash
npm install
```

2. Run the MCP server:
```bash
npm start
```

3. Configure your AI agent to connect to the MCP server

## Excel File Format

The Excel file should contain the following sheets:

### Employees Sheet
- ID: Unique employee identifier
- Name: Employee name
- Email: Employee email
- Max Hours: Maximum weekly hours (default: 40)
- [Skill columns]: Proficiency levels (None, Beginner, Intermediate, Advanced, Expert)

### Projects Sheet
- ID: Unique project identifier
- Name: Project name
- Start Date: Project start date
- End Date: Project end date
- Portfolio: Project portfolio/category
- Required Skills: Comma-separated list of required skills

### Assignments Sheet
- Employee ID: Reference to employee
- Project ID: Reference to project
- Hours: Weekly hours allocated
- Week: Week number

### Skills Sheet (Optional)
- Employee: Employee name
- [Skill columns]: Proficiency levels

## MCP Server Tools

The MCP server provides the following tools for AI agents:

- `load_schedule`: Load schedule from Excel file
- `get_employees`: Retrieve employee list
- `get_projects`: Retrieve project list
- `get_assignments`: Get current assignments
- `assign_resource`: Create or update assignments
- `calculate_metrics`: Calculate scheduling metrics
- `check_availability`: Check employee availability
- `find_skilled_employees`: Find employees with specific skills
- `optimize_schedule`: Get optimization recommendations
- `export_schedule`: Export schedule to Excel

## Development

### File Structure
```
/Scheduler
├── index.html              # Main application
├── styles.css             # Styling
├── scheduler.js           # Core JavaScript logic
├── mcp-server.js         # MCP server implementation
├── package.json          # Node.js dependencies
├── generate_sample.html  # Sample data generator
└── README.md            # Documentation
```

### Technologies Used
- HTML5/CSS3/JavaScript
- XLSX.js for Excel processing
- MCP SDK for AI agent integration

## Browser Compatibility

Works in all modern browsers (Chrome, Firefox, Safari, Edge)

## License

MIT