import { ScheduleData } from '@/types/schedule'
import { createExcelParserWorker } from './workerLoader'

// Function to parse Excel file using Web Worker
export async function parseExcelFileWithWorker(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ScheduleData> {
  return new Promise((resolve, reject) => {
    // Create a new worker
    const worker = createExcelParserWorker()
    
    if (!worker) {
      reject(new Error('Failed to create Web Worker'))
      return
    }
    
    // Set up message handler
    worker.addEventListener('message', (event) => {
      const { type } = event.data
      
      switch (type) {
        case 'progress':
          if (onProgress) {
            onProgress(event.data.progress)
          }
          break
          
        case 'success':
          // Clean up worker
          worker.terminate()
          resolve(event.data.data)
          break
          
        case 'error':
          // Clean up worker
          worker.terminate()
          reject(new Error(event.data.error))
          break
      }
    })
    
    // Handle worker errors
    worker.addEventListener('error', (error) => {
      worker.terminate()
      reject(new Error(`Worker error: ${error.message}`))
    })
    
    // Read file as array buffer
    const reader = new FileReader()
    
    reader.onload = (e) => {
      if (!e.target?.result) {
        worker.terminate()
        reject(new Error('Failed to read file content'))
        return
      }
      
      // Send array buffer to worker
      const arrayBuffer = e.target.result as ArrayBuffer
      worker.postMessage({
        type: 'parse',
        data: { arrayBuffer }
      })
    }
    
    reader.onerror = () => {
      worker.terminate()
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

// Fallback to non-worker version if worker is not supported
export async function parseExcelFileFallback(file: File): Promise<ScheduleData> {
  // Import the original parser dynamically to avoid bundling it when not needed
  const { parseExcelFile } = await import('./parser')
  return parseExcelFile(file)
}

// Main export that checks for worker support
export async function parseExcelSafe(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ScheduleData> {
  // Check if Web Workers are supported
  if (typeof Worker !== 'undefined') {
    try {
      return await parseExcelFileWithWorker(file, onProgress)
    } catch (error) {
      console.warn('Worker parsing failed, falling back to main thread:', error)
      return parseExcelFileFallback(file)
    }
  } else {
    // No worker support, use fallback
    console.warn('Web Workers not supported, using main thread parsing')
    return parseExcelFileFallback(file)
  }
}