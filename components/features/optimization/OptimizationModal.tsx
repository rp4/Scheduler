'use client'

import { useState, useMemo } from 'react'
import { X, Brain, Settings, Play, Check, AlertCircle } from 'lucide-react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { optimizeSchedule, OptimizationResult } from '@/lib/optimization/optimizer'
import * as Slider from '@radix-ui/react-slider'

interface OptimizationModalProps {
  onClose: () => void
}

type Algorithm = 'genetic' | 'annealing' | 'constraint'

export function OptimizationModal({ onClose }: OptimizationModalProps) {
  const [algorithm, setAlgorithm] = useState<Algorithm>('genetic')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<OptimizationResult | null>(null)
  const [progress, setProgress] = useState(0)
  // Use raw values 0-10, will normalize when passing to optimizer
  const [rawWeights, setRawWeights] = useState({
    overtime: 10,
    utilization: 7,
    skills: 7,
  })

  // Get data from store with proper selectors
  const employees = useScheduleStore((state) => state.employees)
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const skills = useScheduleStore((state) => state.skills)
  const teams = useScheduleStore((state) => state.teams)
  
  // Memoize the schedule data object
  const scheduleData = useMemo(() => ({
    employees,
    projects,
    assignments,
    skills: skills || [],
    teams: teams || [],
  }), [employees, projects, assignments, skills, teams])

  const handleOptimize = async () => {
    setIsOptimizing(true)
    setProgress(0)

    // Normalize weights to sum to 1
    const total = rawWeights.overtime + rawWeights.utilization + rawWeights.skills
    const normalizedWeights = {
      overtime: total > 0 ? rawWeights.overtime / total : 0.33,
      utilization: total > 0 ? rawWeights.utilization / total : 0.33,
      skills: total > 0 ? rawWeights.skills / total : 0.34,
    }

    try {
      // Run optimization
      const result = await optimizeSchedule(
        scheduleData,
        algorithm,
        normalizedWeights,
        (prog) => setProgress(prog)
      )

      setProgress(100)
      setResults(result)
      
      // Show results after a brief delay
      setTimeout(() => {
        setIsOptimizing(false)
        setShowResults(true)
      }, 500)
    } catch (error) {
      console.error('Optimization failed:', error)
      setIsOptimizing(false)
    }
  }
  
  const handleApply = () => {
    if (!results) return
    
    // Apply the suggestions by replacing placeholder assignments
    const newAssignments = [...scheduleData.assignments]
    
    // Remove placeholder assignments
    const filtered = newAssignments.filter(
      a => a.employeeId !== 'Placeholder' && a.employeeId !== 'placeholder'
    )
    
    // Add suggested assignments
    results.suggestions.forEach(suggestion => {
      filtered.push({
        id: `${suggestion.suggestedEmployeeId}-${suggestion.projectId}-${suggestion.week}`,
        employeeId: suggestion.suggestedEmployeeId,
        projectId: suggestion.projectId,
        week: suggestion.week,
        hours: suggestion.originalHours,
      })
    })
    
    // Update the store
    useScheduleStore.getState().loadData({
      ...scheduleData,
      assignments: filtered,
      skills: useScheduleStore.getState().skills,
      teams: useScheduleStore.getState().teams,
    })
    
    onClose()
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Optimize Schedule</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {showResults && results ? (
            // Results View
            <div>
              <h3 className="font-semibold mb-4">Optimization Results</h3>
              
              {results.suggestions.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No placeholder assignments found to optimize.</p>
                </div>
              ) : (
                <>
                  {/* Summary Metrics */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Overtime Hours</div>
                        <div className="font-semibold">
                          {results.metrics.currentOvertimeHours.toFixed(0)} → {results.metrics.predictedOvertimeHours.toFixed(0)}
                          <span className={`ml-2 text-xs ${results.metrics.predictedOvertimeHours < results.metrics.currentOvertimeHours ? 'text-green-600' : 'text-orange-600'}`}>
                            ({results.metrics.predictedOvertimeHours - results.metrics.currentOvertimeHours > 0 ? '+' : ''}{(results.metrics.predictedOvertimeHours - results.metrics.currentOvertimeHours).toFixed(0)})
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Utilization</div>
                        <div className="font-semibold">
                          {(results.metrics.currentUtilization * 100).toFixed(1)}% → {(results.metrics.predictedUtilization * 100).toFixed(1)}%
                          <span className={`ml-2 text-xs ${results.metrics.predictedUtilization > results.metrics.currentUtilization ? 'text-green-600' : 'text-orange-600'}`}>
                            ({results.metrics.predictedUtilization > results.metrics.currentUtilization ? '+' : ''}{((results.metrics.predictedUtilization - results.metrics.currentUtilization) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Skills Match</div>
                        <div className="font-semibold">
                          {(results.metrics.currentSkillsMatch * 100).toFixed(1)}% → {(results.metrics.predictedSkillsMatch * 100).toFixed(1)}%
                          <span className={`ml-2 text-xs ${results.metrics.predictedSkillsMatch > results.metrics.currentSkillsMatch ? 'text-green-600' : 'text-orange-600'}`}>
                            ({results.metrics.predictedSkillsMatch > results.metrics.currentSkillsMatch ? '+' : ''}{((results.metrics.predictedSkillsMatch - results.metrics.currentSkillsMatch) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Suggestions Table */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-2">Suggested Assignments</h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Project</th>
                            <th className="px-3 py-2 text-left">Employee</th>
                            <th className="px-3 py-2 text-center">Total Hours</th>
                            <th className="px-3 py-2 text-center">Overtime</th>
                            <th className="px-3 py-2 text-center">Utilization</th>
                            <th className="px-3 py-2 text-center">Skills</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(() => {
                            // Group suggestions by project and employee
                            const grouped = results.suggestions.reduce((acc, suggestion) => {
                              const key = `${suggestion.projectId}-${suggestion.suggestedEmployeeId}`
                              if (!acc[key]) {
                                acc[key] = {
                                  projectName: suggestion.projectName,
                                  employeeName: suggestion.suggestedEmployeeName,
                                  totalHours: 0,
                                  overtimeScore: suggestion.overtimeScore,
                                  utilizationScore: suggestion.utilizationScore,
                                  skillsScore: suggestion.skillsScore,
                                  weeks: []
                                }
                              }
                              acc[key].totalHours += suggestion.originalHours
                              acc[key].weeks.push(suggestion.week)
                              return acc
                            }, {} as Record<string, any>)
                            
                            return Object.values(grouped).map((group: any, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-2">{group.projectName}</td>
                                <td className="px-3 py-2 font-medium">{group.employeeName}</td>
                                <td className="px-3 py-2 text-center">{group.totalHours}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-flex px-2 py-1 rounded text-xs ${
                                    group.overtimeScore < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {group.overtimeScore.toFixed(0)}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                    {group.utilizationScore.toFixed(0)}%
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="inline-flex px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                    {group.skillsScore.toFixed(0)}%
                                  </span>
                                </td>
                              </tr>
                            ))
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleApply}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Apply Changes
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : !isOptimizing ? (
            <>
              {/* Optimization Weights */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Optimization Weights</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Minimize Overtime</span>
                      <span className="text-sm text-gray-600">
                        {rawWeights.overtime}/10
                      </span>
                    </div>
                    <Slider.Root
                      value={[rawWeights.overtime]}
                      onValueChange={([value]) => 
                        setRawWeights({ ...rawWeights, overtime: value })
                      }
                      max={10}
                      step={1}
                      className="relative flex items-center select-none touch-none w-full h-5"
                    >
                      <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
                        <Slider.Range className="absolute bg-orange-500 rounded-full h-full" />
                      </Slider.Track>
                      <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-orange-500 rounded-full hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </Slider.Root>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Maximize Utilization</span>
                      <span className="text-sm text-gray-600">
                        {rawWeights.utilization}/10
                      </span>
                    </div>
                    <Slider.Root
                      value={[rawWeights.utilization]}
                      onValueChange={([value]) => 
                        setRawWeights({ ...rawWeights, utilization: value })
                      }
                      max={10}
                      step={1}
                      className="relative flex items-center select-none touch-none w-full h-5"
                    >
                      <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
                        <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                      </Slider.Track>
                      <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </Slider.Root>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Optimize Skills Matching</span>
                      <span className="text-sm text-gray-600">
                        {rawWeights.skills}/10
                      </span>
                    </div>
                    <Slider.Root
                      value={[rawWeights.skills]}
                      onValueChange={([value]) => 
                        setRawWeights({ ...rawWeights, skills: value })
                      }
                      max={10}
                      step={1}
                      className="relative flex items-center select-none touch-none w-full h-5"
                    >
                      <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
                        <Slider.Range className="absolute bg-green-500 rounded-full h-full" />
                      </Slider.Track>
                      <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-green-500 rounded-full hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </Slider.Root>
                  </div>
                </div>
              </div>

              {/* Algorithm Selection */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Optimization Algorithm
                </h3>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="genetic">Genetic Algorithm - Best for complex multi-objective optimization</option>
                  <option value="annealing">Simulated Annealing - Good for local optimization and fine-tuning</option>
                  <option value="constraint">Constraint Satisfaction - Fast, rule-based assignment</option>
                </select>
                <p className="mt-2 text-xs text-gray-600">
                  {algorithm === 'genetic' && 'Uses evolutionary computation to explore a wide solution space and find globally optimal assignments.'}
                  {algorithm === 'annealing' && 'Gradually improves assignments by making small changes, good for refining existing schedules.'}
                  {algorithm === 'constraint' && 'Quickly finds valid assignments using hard rules, prioritizing constraint satisfaction over optimization.'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleOptimize}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Run Optimization
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="py-8">
              <h3 className="text-center font-semibold mb-4">Optimizing Schedule...</h3>
              <div className="mb-4">
                <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <p className="text-center text-sm text-gray-600">
                {progress < 30 && 'Analyzing current schedule...'}
                {progress >= 30 && progress < 60 && 'Generating optimization candidates...'}
                {progress >= 60 && progress < 90 && 'Evaluating solutions...'}
                {progress >= 90 && 'Finalizing optimal schedule...'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}