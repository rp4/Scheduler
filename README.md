# Resource Scheduler - Production-Grade Next.js Application

A client-side only resource scheduling and optimization tool built with Next.js 14+, TypeScript, and Tailwind CSS. All data processing happens in the browser - no backend required.

## 🚀 Features

- **Excel Import/Export**: Upload and download schedule data in Excel format
- **Gantt Chart Visualization**: Interactive timeline view of projects
- **Hours Management**: Track and manage employee hours by project or employee
- **Skills Matrix**: Manage employee skills and proficiency levels  
- **AI-Powered Optimization**: Multiple algorithms for schedule optimization
- **Team Filtering**: Focus on specific teams across all views
- **100% Client-Side**: All processing happens in browser, no data leaves your device
- **Static Export**: Can be deployed anywhere as static files

## 🛠️ Tech Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Radix UI** for accessible components
- **XLSX** for Excel processing
- **date-fns** for date manipulation

## 📁 Project Structure

```
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── schedule/          # Schedule views
├── components/
│   ├── features/          # Feature components
│   │   ├── gantt/        # Gantt chart
│   │   ├── hours/        # Hours tracking
│   │   ├── skills/       # Skills matrix
│   │   └── optimization/ # Optimization modal
│   ├── layout/           # Layout components
│   └── providers.tsx     # React Query provider
├── lib/
│   ├── excel/            # Excel import/export
│   ├── optimization/     # Optimization algorithms
│   └── utils.ts          # Utility functions
├── store/                # Zustand stores
├── types/                # TypeScript types
└── public/               # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Export static files
npm run export
```

The app will be available at http://localhost:3000

## 📊 Excel File Format

The application expects Excel files with the following sheets:

### Employees Sheet
- ID: Unique identifier
- Name: Employee name
- Email: Employee email (optional)
- Max Hours: Maximum hours per week
- Team: Team assignment
- [Skills]: Additional columns for skills with proficiency levels

### Projects Sheet
- ID: Unique identifier
- Name: Project name
- Start Date: Project start date
- End Date: Project end date
- Required Skills: Comma-separated list of required skills
- Portfolio: Project portfolio (optional)

### Assignments Sheet
- Employee ID: Reference to employee
- Project ID: Reference to project
- Hours: Allocated hours
- Week: Week identifier (e.g., "JAN 15")

### Skills Sheet (Optional)
- Employee: Employee name
- [Skill columns]: Proficiency levels (Beginner/Intermediate/Expert)

## 🎯 Optimization Features

### Algorithms

1. **Genetic Algorithm**: Best for complex multi-objective optimization
2. **Simulated Annealing**: Good for local optimization and fine-tuning
3. **Constraint Satisfaction**: Fast, rule-based assignment

### Optimization Weights

Adjust the importance of different metrics:
- **Minimize Overtime**: Reduce hours over employee limits
- **Maximize Utilization**: Optimize resource usage
- **Skills Matching**: Match employee skills to project requirements

## 🔒 Privacy & Security

- **100% Client-Side**: All data processing happens in your browser
- **No Backend**: No servers, no databases, no API calls
- **No Tracking**: No analytics or user tracking
- **Local Storage**: Data persisted only in browser localStorage
- **Export Anytime**: Download your data as Excel at any time

## 📦 Deployment

### Static Export

```bash
# Build and export static files
npm run build

# Files will be in 'out' directory
```

### Deploy to Vercel

```bash
vercel --prod
```

### Deploy to GitHub Pages

1. Update `next.config.js` with your repository name:
```js
const nextConfig = {
  output: 'export',
  basePath: '/your-repo-name',
  // ... rest of config
}
```

2. Build and deploy:
```bash
npm run build
# Push 'out' directory to gh-pages branch
```

## 🧪 Development

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Performance Targets

- Initial Load: < 3 seconds
- Excel Import: < 5 seconds for 1000 rows
- UI Updates: < 100ms
- Bundle Size: < 500KB gzipped

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Known Issues

- Drag-and-drop in Gantt chart is for demonstration (dates don't persist yet)
- Optimization algorithms use simplified logic for demonstration
- Maximum tested with 500 employees and 1000 projects

## 🚗 Roadmap

- [ ] Add undo/redo functionality
- [ ] Implement real drag-and-drop in Gantt chart
- [ ] Add more sophisticated optimization algorithms
- [ ] Add project dependencies
- [ ] Export to PDF reports
- [ ] Add keyboard shortcuts
- [ ] Dark mode support