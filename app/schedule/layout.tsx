import { Header } from '@/components/layout/Header'
import { MetricsBar } from '@/components/layout/MetricsBar'
import { Navigation } from '@/components/layout/Navigation'

export default function ScheduleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />
      <MetricsBar />
      <Navigation />
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}