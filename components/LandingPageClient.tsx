'use client'

import { useState } from 'react'
import { Upload, Download, Rocket, FileSpreadsheet } from 'lucide-react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { parseExcelFile } from '@/lib/excel/parser'
import { loadSampleData } from '@/lib/sample-data'

export function LandingPageClient() {
  const [isLoading, setIsLoading] = useState(false)
  const loadData = useScheduleStore((state) => state.loadData)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const data = await parseExcelFile(file)
      loadData(data)
      // Redirect to schedule page
      window.location.href = '/schedule'
    } catch (error) {
      console.error('Failed to parse Excel file:', error)
      alert('Failed to parse Excel file. Please check the format.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadSampleData = async () => {
    setIsLoading(true)
    try {
      const data = await loadSampleData()
      loadData(data)
      // Redirect to schedule page
      window.location.href = '/schedule'
    } catch (error) {
      console.error('Failed to load sample data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadSampleFile = () => {
    const link = document.createElement('a')
    link.href = '/ScheduleSample.xlsx'
    link.download = 'ScheduleSample.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading schedule data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              📊 Resource Scheduling Tool
            </h1>
            <p className="text-xl text-gray-600">
              Optimize your team&apos;s time and skills allocation with AI-powered scheduling
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Download Sample Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="mb-4">
                <FileSpreadsheet className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Download Sample</h2>
              <p className="text-gray-600 mb-4">
                Get a sample Excel file to see the required format and explore features
              </p>
              <button
                onClick={downloadSampleFile}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Sample Excel
              </button>
            </div>

            {/* Upload Excel Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="mb-4">
                <Upload className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Upload Excel</h2>
              <p className="text-gray-600 mb-4">
                Upload your own Excel schedule file to begin optimizing
              </p>
              <label className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload Excel File
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Try Now Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="mb-4">
                <Rocket className="w-12 h-12 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Try Now</h2>
              <p className="text-gray-600 mb-4">
                Instantly load sample data to explore all features without uploading
              </p>
              <button
                onClick={handleLoadSampleData}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                Try with Sample Data
              </button>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-semibold mb-8">Key Features</h2>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div className="bg-white/80 rounded-lg p-4">
                <div className="font-semibold mb-1">🔒 Privacy First</div>
                <p className="text-gray-600">All data processing happens in your browser</p>
              </div>
              <div className="bg-white/80 rounded-lg p-4">
                <div className="font-semibold mb-1">📈 Smart Optimization</div>
                <p className="text-gray-600">AI algorithms for efficient scheduling</p>
              </div>
              <div className="bg-white/80 rounded-lg p-4">
                <div className="font-semibold mb-1">📊 Visual Planning</div>
                <p className="text-gray-600">Gantt charts and resource views</p>
              </div>
              <div className="bg-white/80 rounded-lg p-4">
                <div className="font-semibold mb-1">💾 Excel Compatible</div>
                <p className="text-gray-600">Import and export standard formats</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}