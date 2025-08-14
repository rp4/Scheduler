'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { GanttChart } from '@/components/features/gantt/GanttChart'
import { HoursGrid } from '@/components/features/hours/HoursGrid'
import { SkillsMatrix } from '@/components/features/skills/SkillsMatrix'

function ScheduleContent() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view') || 'gantt'

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {view === 'gantt' && <GanttChart />}
      {view === 'hours' && <HoursGrid />}
      {view === 'skills' && <SkillsMatrix />}
    </div>
  )
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScheduleContent />
    </Suspense>
  )
}