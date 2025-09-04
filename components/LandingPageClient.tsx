'use client'

import { useState, useEffect } from 'react'
import { Upload, Download, Rocket, FileSpreadsheet } from 'lucide-react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { parseExcelSafe } from '@/lib/excel/parserWithWorker'
import { loadSampleData } from '@/lib/sample-data'
import { showToast } from '@/components/ui/Toast'
import { ProgressBar } from '@/components/ui/ProgressBar'

export function LandingPageClient() {
  const [isLoading, setIsLoading] = useState(false)
  const [fileToProcess, setFileToProcess] = useState<File | null>(null)
  const [parseProgress, setParseProgress] = useState(0)
  const [isParsingFile, setIsParsingFile] = useState(false)
  const loadData = useScheduleStore((state) => state.loadData)

  // Process file in useEffect to ensure proper state updates
  useEffect(() => {
    if (!fileToProcess) return

    const processFile = async () => {
      try {
        console.log('Starting to parse file:', fileToProcess.name)
        setIsParsingFile(true)
        setParseProgress(0)
        
        const data = await parseExcelSafe(fileToProcess, (progress) => {
          setParseProgress(progress)
        })
        console.log('Parsed data:', data)
        
        // Validate data has content
        if (!data.employees?.length && !data.projects?.length && !data.assignments?.length) {
          throw new Error('No data found in the Excel file. Please check the sheet names and format.')
        }
        
        loadData(data)
        console.log('Data loaded to store, navigating...')
        
        // Add small delay to ensure state is saved
        setTimeout(() => {
          window.location.href = '/schedule'
        }, 100)
        // Don't reset loading state here since we're navigating away
      } catch (error) {
        console.error('Error processing file:', error)
        const errorMessage = error instanceof Error ? error.message : 'Please check the file format and try again.'
        showToast('error', 'Failed to parse Excel file', errorMessage)
        setIsLoading(false) // Only reset on error
        setIsParsingFile(false)
        setParseProgress(0)
        setFileToProcess(null)
      }
    }

    processFile()
  }, [fileToProcess, loadData])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    console.log('File selected:', file)
    if (!file) {
      console.log('No file selected')
      return
    }
    
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      showToast('error', 'Invalid file type', 'Please select an Excel file (.xlsx or .xls)')
      event.target.value = '' // Reset input
      return
    }
    
    // Validate file size (max 10MB)
    const maxSizeInBytes = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSizeInBytes) {
      showToast('error', 'File too large', `Please select a file smaller than 10MB (current: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`)
      event.target.value = '' // Reset input
      return
    }
    
    console.log('Setting loading state and file to process')
    setIsLoading(true)
    setFileToProcess(file)
    
    // Reset the input value so the same file can be selected again if needed
    event.target.value = ''
  }

  const handleLoadSampleData = async () => {
    setIsLoading(true)
    try {
      const data = await loadSampleData()
      loadData(data)
      // Keep loading state during navigation
      window.location.href = '/schedule'
      // Don't reset loading state here since we're navigating away
    } catch {
      setIsLoading(false) // Only reset on error
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
          {isParsingFile ? (
            <>
              <FileSpreadsheet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Parsing Excel File...</h2>
              <p className="text-gray-600 mb-6">Processing your schedule data in the background</p>
              <ProgressBar 
                progress={parseProgress} 
                label={
                  parseProgress < 30 ? 'Reading employees...' :
                  parseProgress < 50 ? 'Loading projects...' :
                  parseProgress < 90 ? 'Processing assignments...' :
                  'Finalizing...'
                }
                className="mb-4"
              />
              <p className="text-sm text-gray-500">Using Web Worker for optimal performance</p>
            </>
          ) : (
            <>
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 mx-auto"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute inset-0 mx-auto"></div>
              </div>
              <h2 className="mt-6 text-xl font-semibold text-gray-800">Processing your file...</h2>
              <p className="mt-2 text-gray-600">Loading schedule data and preparing workspace</p>
              <div className="mt-4 flex items-center justify-center gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Resource Scheduling Tool
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
                Download Template
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

          {/* GitHub Link */}
          <div className="mt-12 text-center">
            <a
              href="https://github.com/rp4/Scheduler"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">View on GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}