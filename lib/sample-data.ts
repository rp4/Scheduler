import { ScheduleData } from '@/types/schedule'
import { generateId } from '@/lib/utils'

export async function loadSampleData(): Promise<ScheduleData> {
  // Simulate loading delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  return {
    employees: [
      {
        id: 'E001',
        name: 'John Smith',
        email: 'john@example.com',
        maxHours: 40,
        team: 'Development',
        skills: {
          JavaScript: 'Expert',
          Python: 'Intermediate',
          React: 'Expert',
          TypeScript: 'Expert',
        },
      },
      {
        id: 'E002',
        name: 'Jane Doe',
        email: 'jane@example.com',
        maxHours: 40,
        team: 'Development',
        skills: {
          JavaScript: 'Intermediate',
          Python: 'Expert',
          Django: 'Expert',
          SQL: 'Expert',
        },
      },
      {
        id: 'E003',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        maxHours: 35,
        team: 'Design',
        skills: {
          Figma: 'Expert',
          Photoshop: 'Expert',
          CSS: 'Intermediate',
          'UI/UX': 'Expert',
        },
      },
      {
        id: 'E004',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        maxHours: 40,
        team: 'QA',
        skills: {
          Testing: 'Expert',
          Selenium: 'Expert',
          JavaScript: 'Beginner',
          JIRA: 'Expert',
        },
      },
      {
        id: 'E005',
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        maxHours: 40,
        team: 'Development',
        skills: {
          Java: 'Expert',
          Spring: 'Expert',
          SQL: 'Intermediate',
          Docker: 'Intermediate',
        },
      },
    ],
    projects: [
      {
        id: 'P001',
        name: 'Website Redesign',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-03-30'),
        requiredSkills: ['JavaScript', 'React', 'CSS'],
        portfolio: 'Digital',
      },
      {
        id: 'P002',
        name: 'Mobile App Development',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-05-15'),
        requiredSkills: ['React Native', 'JavaScript'],
        portfolio: 'Mobile',
      },
      {
        id: 'P003',
        name: 'Backend API',
        startDate: new Date('2025-01-20'),
        endDate: new Date('2025-04-10'),
        requiredSkills: ['Python', 'Django', 'SQL'],
        portfolio: 'Infrastructure',
      },
      {
        id: 'P004',
        name: 'Testing Automation',
        startDate: new Date('2025-02-15'),
        endDate: new Date('2025-04-30'),
        requiredSkills: ['Testing', 'Selenium'],
        portfolio: 'Quality',
      },
      {
        id: 'P005',
        name: 'Database Migration',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-06-01'),
        requiredSkills: ['SQL', 'Java', 'Spring'],
        portfolio: 'Infrastructure',
      },
    ],
    assignments: [
      { id: generateId(), employeeId: 'E001', projectId: 'P001', hours: 20, week: 'JAN 15' },
      { id: generateId(), employeeId: 'E001', projectId: 'P002', hours: 20, week: 'JAN 15' },
      { id: generateId(), employeeId: 'E002', projectId: 'P003', hours: 30, week: 'JAN 20' },
      { id: generateId(), employeeId: 'E003', projectId: 'P001', hours: 25, week: 'JAN 15' },
      { id: generateId(), employeeId: 'E004', projectId: 'P004', hours: 35, week: 'FEB 15' },
      { id: generateId(), employeeId: 'E005', projectId: 'P005', hours: 40, week: 'MAR 1' },
      { id: generateId(), employeeId: 'E002', projectId: 'P005', hours: 10, week: 'MAR 1' },
    ],
    skills: [
      'JavaScript',
      'Python',
      'React',
      'TypeScript',
      'Django',
      'SQL',
      'Figma',
      'Photoshop',
      'CSS',
      'UI/UX',
      'Testing',
      'Selenium',
      'JIRA',
      'Java',
      'Spring',
      'Docker',
      'React Native',
    ],
    teams: ['All Teams', 'Development', 'Design', 'QA'],
  }
}