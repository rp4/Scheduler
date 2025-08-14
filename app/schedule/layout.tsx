import { Header } from '@/components/layout/Header'
import { MetricsBar } from '@/components/layout/MetricsBar'
import { Navigation } from '@/components/layout/Navigation'

export default function ScheduleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <MetricsBar />
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}