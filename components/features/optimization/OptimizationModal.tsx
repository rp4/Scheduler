'use client'

import { useState } from 'react'
import { X, Brain, Settings, Play } from 'lucide-react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { optimizeSchedule } from '@/lib/optimization/optimizer'
import * as Slider from '@radix-ui/react-slider'

interface OptimizationModalProps {
  onClose: () => void
}

type Algorithm = 'genetic' | 'annealing' | 'constraint'

export function OptimizationModal({ onClose }: OptimizationModalProps) {
  const [algorithm, setAlgorithm] = useState<Algorithm>('genetic')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [weights, setWeights] = useState({
    overtime: 0.4,
    utilization: 0.3,
    skills: 0.3,
  })

  const scheduleData = useScheduleStore((state) => ({
    employees: state.employees,
    projects: state.projects,
    assignments: state.assignments,
  }))

  const handleOptimize = async () => {
    setIsOptimizing(true)
    setProgress(0)

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    try {
      // Run optimization (this would be in a web worker in production)
      const result = await optimizeSchedule(
        scheduleData,
        algorithm,
        weights,
        (prog) => setProgress(prog)
      )

      clearInterval(progressInterval)
      setProgress(100)

      // Apply results
      if (result.assignments) {
        useScheduleStore.getState().loadData({
          ...scheduleData,
          assignments: result.assignments,
          skills: useScheduleStore.getState().skills,
          teams: useScheduleStore.getState().teams,
        })
      }

      setTimeout(() => {
        onClose()
      }, 500)
    } catch (error) {
      console.error('Optimization failed:', error)
      clearInterval(progressInterval)
      setIsOptimizing(false)
    }
  }

  // Normalize weights to sum to 1
  const normalizeWeights = () => {
    const sum = weights.overtime + weights.utilization + weights.skills
    if (sum === 0) return
    
    setWeights({
      overtime: weights.overtime / sum,
      utilization: weights.utilization / sum,
      skills: weights.skills / sum,
    })
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
          {!isOptimizing ? (
            <>
              {/* Algorithm Selection */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Select Algorithm
                </h3>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="genetic"
                      checked={algorithm === 'genetic'}
                      onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">Genetic Algorithm</div>
                      <div className="text-sm text-gray-600">
                        Best for complex multi-objective optimization with many constraints
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="annealing"
                      checked={algorithm === 'annealing'}
                      onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">Simulated Annealing</div>
                      <div className="text-sm text-gray-600">
                        Good for local optimization and fine-tuning existing schedules
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="constraint"
                      checked={algorithm === 'constraint'}
                      onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">Constraint Satisfaction</div>
                      <div className="text-sm text-gray-600">
                        Fast, rule-based assignment focusing on hard constraints
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Optimization Weights */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Optimization Weights</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Minimize Overtime</span>
                      <span className="text-sm text-gray-600">
                        {Math.round(weights.overtime * 100)}%
                      </span>
                    </div>
                    <Slider.Root
                      value={[weights.overtime]}
                      onValueChange={([value]) => 
                        setWeights({ ...weights, overtime: value })
                      }
                      onValueCommit={normalizeWeights}
                      max={1}
                      step={0.05}
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
                        {Math.round(weights.utilization * 100)}%
                      </span>
                    </div>
                    <Slider.Root
                      value={[weights.utilization]}
                      onValueChange={([value]) => 
                        setWeights({ ...weights, utilization: value })
                      }
                      onValueCommit={normalizeWeights}
                      max={1}
                      step={0.05}
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
                        {Math.round(weights.skills * 100)}%
                      </span>
                    </div>
                    <Slider.Root
                      value={[weights.skills]}
                      onValueChange={([value]) => 
                        setWeights({ ...weights, skills: value })
                      }
                      onValueCommit={normalizeWeights}
                      max={1}
                      step={0.05}
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