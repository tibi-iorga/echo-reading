import { useRef } from 'react'
import { VERSION } from '@/constants/version'

interface FileSelectorProps {
  onFileSelect: (file: File) => void
}

export function FileSelector({ onFileSelect }: FileSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      onFileSelect(file)
    } else {
      alert('Please select a PDF file')
    }
  }

  return (
    <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
      <div className="text-center max-w-2xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Echo</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
          Understand what you read
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
          One place to read, annotate, and talk through your PDF with AI. Built for learning that sticks.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">No Context Switching</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Read, annotate, and chat with AI in one place. No juggling tabs or apps.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Your API Key, No Subscriptions</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Free to use. You only pay for API usage with your provider.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Privacy and Open Source</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">No tracking or analytics. Open source so you can verify how your data is handled.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2v5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Full Portability</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Keep a sync file with your notes, highlights, and more. Your data travels with you.</p>
            </div>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 font-medium transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          Choose PDF File
        </button>
      </div>
      <div className="fixed bottom-4 left-4 right-4 flex justify-center items-center text-xs text-gray-400 dark:text-gray-500">
        <span>
          Echo is open source.{' '}
          <a
            href="https://github.com/tibi-iorga/echo-reading"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-blue-400 hover:underline"
          >
            View the code on GitHub
          </a>
          . · v{VERSION}
        </span>
      </div>
    </div>
  )
}
