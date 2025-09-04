'use client'

import { useState, useEffect, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus, Edit2 } from 'lucide-react'
import { format } from 'date-fns'
import { useScheduleStore } from '@/store/useScheduleStore'
import type { Project } from '@/types/schedule'

interface ProjectFormProps {
  mode: 'add' | 'edit'
  project?: Project | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSubmit: (projectData: Partial<Project>) => void
  triggerButton?: React.ReactNode
}

export function ProjectForm({ 
  mode, 
  project, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange, 
  onSubmit,
  triggerButton
}: ProjectFormProps) {
  const employees = useScheduleStore((state) => state.employees)
  
  // Internal state for uncontrolled mode
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use controlled or uncontrolled mode
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen
  
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get all unique skills from employees
  const availableSkills = useMemo(() => {
    const skillsSet = new Set<string>()
    employees.forEach(employee => {
      Object.keys(employee.skills || {}).forEach(skill => {
        skillsSet.add(skill)
      })
    })
    return Array.from(skillsSet).sort()
  }, [employees])

  const handleSkillToggle = (skill: string) => {
    const newSkills = new Set(selectedSkills)
    if (newSkills.has(skill)) {
      newSkills.delete(skill)
    } else {
      newSkills.add(skill)
    }
    setSelectedSkills(newSkills)
  }

  // Update form when project changes (edit mode)
  useEffect(() => {
    if (mode === 'edit' && project && isOpen) {
      setName(project.name)
      setStartDate(format(new Date(project.startDate), 'yyyy-MM-dd'))
      setEndDate(format(new Date(project.endDate), 'yyyy-MM-dd'))
      setSelectedSkills(new Set(project.requiredSkills || []))
      setErrors({})
    } else if (mode === 'add' && isOpen) {
      // Reset form for add mode when opening
      setName('')
      setStartDate('')
      setEndDate('')
      setSelectedSkills(new Set())
      setErrors({})
    }
  }, [project, mode, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: Record<string, string> = {}
    
    if (!name.trim()) {
      newErrors.name = 'Project name is required'
    }
    
    if (!startDate) {
      newErrors.startDate = 'Start date is required'
    }
    
    if (!endDate) {
      newErrors.endDate = 'End date is required'
    }
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = 'End date must be after start date'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    const projectData: Partial<Project> = {
      name: name.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      requiredSkills: Array.from(selectedSkills)
    }
    
    // Add project ID for edit mode
    if (mode === 'edit' && project) {
      projectData.id = project.id
    }
    
    onSubmit(projectData)
    
    // Reset form and close dialog
    setName('')
    setStartDate('')
    setEndDate('')
    setSelectedSkills(new Set())
    setErrors({})
    setOpen(false)
  }
  
  const handleCancel = () => {
    setName('')
    setStartDate('')
    setEndDate('')
    setSelectedSkills(new Set())
    setErrors({})
    setOpen(false)
  }

  // Default trigger button if not provided
  const defaultTrigger = mode === 'add' ? (
    <button
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <Plus className="w-4 h-4" />
      Add Project
    </button>
  ) : (
    <button
      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
    >
      <Edit2 className="w-3 h-3" />
      Edit
    </button>
  )

  // Don't render anything in edit mode if no project
  if (mode === 'edit' && !project) return null

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      {(mode === 'add' || !controlledOpen) && (
        <Dialog.Trigger asChild>
          {triggerButton || defaultTrigger}
        </Dialog.Trigger>
      )}
      
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {mode === 'add' ? 'Add New Project' : 'Edit Project'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                Project Name
              </label>
              <input
                id="project-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) {
                    setErrors({ ...errors, name: '' })
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter project name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (errors.startDate) {
                    setErrors({ ...errors, startDate: '' })
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  if (errors.endDate) {
                    setErrors({ ...errors, endDate: '' })
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
              )}
            </div>
            
            {/* Required Skills */}
            {availableSkills.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Skills
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                  {availableSkills.map(skill => (
                    <label key={skill} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedSkills.has(skill)}
                        onChange={() => handleSkillToggle(skill)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {mode === 'add' ? 'Add Project' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}