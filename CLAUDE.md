# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production (creates static export in 'out' directory)
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm run test

# Run tests in CI mode
npm run test:ci
```

## Architecture Overview

This is a **client-side only** Next.js 15 application for resource scheduling and optimization. All data processing happens in the browser with no backend required.

### Key Architectural Decisions

1. **Static Export**: Uses `next export` to generate static files deployable anywhere
2. **Client-Side State**: Zustand with localStorage persistence for data management
3. **No Backend**: All processing (Excel parsing, optimization algorithms) runs in browser
4. **TypeScript First**: Strict typing throughout with comprehensive type definitions

### Core Data Flow

1. **Data Import**: Excel files are parsed client-side using XLSX library
2. **State Management**: Zustand store (`useScheduleStore`) holds all application state
3. **Data Persistence**: Browser localStorage maintains data between sessions
4. **Optimization**: Three algorithms (Genetic, Simulated Annealing, Constraint Satisfaction) run in browser

### Project Structure

- **`app/`**: Next.js 15 App Router pages
  - `page.tsx`: Landing page
  - `schedule/`: Main application views (Gantt, Hours, Skills)
  
- **`components/`**: React components
  - `features/`: Feature-specific components (gantt/, hours/, skills/, optimization/)
  - `layout/`: Layout components (Header, Navigation, MetricsBar)
  
- **`lib/`**: Core business logic
  - `excel/`: Excel import/export functionality
  - `optimization/`: Schedule optimization algorithms
  - `metrics.ts`: Metrics calculation logic
  
- **`store/`**: Zustand state management
  - `useScheduleStore.ts`: Central state store with persistence

- **`types/`**: TypeScript type definitions
  - `schedule.ts`: Core data models (Employee, Project, Assignment)

### Key Technologies

- **Next.js 15** with App Router and static export
- **TypeScript** with strict mode enabled
- **Tailwind CSS** for styling
- **Zustand** for state management with localStorage persistence
- **Radix UI** for accessible UI components
- **XLSX** for Excel file processing
- **date-fns** for date manipulation

### Excel File Format

The application expects Excel files with these sheets:
- **Employees**: ID, Name, Email, Max Hours, Team, [Skill columns]
- **Projects**: ID, Name, Start Date, End Date, Required Skills, Portfolio
- **Assignments**: Employee ID, Project ID, Hours, Week
- **Skills** (optional): Employee name with skill proficiency columns

### Optimization System

Three optimization algorithms available:
- **Genetic Algorithm**: Complex multi-objective optimization
- **Simulated Annealing**: Local optimization and fine-tuning
- **Constraint Satisfaction**: Fast rule-based assignment

Optimization considers:
- Overtime minimization
- Resource utilization
- Skills matching
- Project coverage

### Performance Considerations

- Bundle splitting configured for vendor and common chunks
- Images unoptimized for static export compatibility
- Target metrics: <3s initial load, <5s Excel import for 1000 rows
- All processing happens client-side - no network latency

### Deployment

Static export compatible with any static hosting:
- Vercel: `vercel --prod`
- GitHub Pages: Update `basePath` in `next.config.js`
- Any static file server: Deploy contents of `out/` directory