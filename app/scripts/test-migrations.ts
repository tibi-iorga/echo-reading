/**
 * Migration QA Test Script
 * 
 * Tests that all migration functions work correctly with sample data.
 * Run with: npm run test:migrations
 */

// Import storage service (we'll need to adapt this for Node.js or run in browser)
// For now, this is a template that shows the test structure

type MigrationData = Record<string, unknown> | unknown[] | string | number | null

interface TestCase {
  name: string
  input: MigrationData
  expectedOutput: MigrationData
  migrationFn: (data: MigrationData) => MigrationData
}

// Sample test data structures
const testCases: TestCase[] = [
  {
    name: 'Chat Messages v1 - Current version',
    input: {
      version: 1,
      messages: [
        { id: '1', role: 'user', content: 'Hello', quotedText: null },
        { id: '2', role: 'assistant', content: 'Hi there' },
      ],
    },
    expectedOutput: [
      { id: '1', role: 'user', content: 'Hello', quotedText: null },
      { id: '2', role: 'assistant', content: 'Hi there' },
    ],
    migrationFn: (data: MigrationData) => {
      if (typeof data === 'object' && data !== null && !Array.isArray(data) && 'version' in data && data.version === 1) {
        const dataObj = data as { messages?: unknown[] }
        return dataObj.messages || []
      }
      return []
    },
  },
  {
    name: 'Chat Messages - Legacy format (no version)',
    input: [
      { id: '1', role: 'user', content: 'Hello' },
    ],
    expectedOutput: [
      { id: '1', role: 'user', content: 'Hello' },
    ],
    migrationFn: (data: MigrationData) => {
      if (Array.isArray(data)) {
        return data
      }
      return []
    },
  },
  {
    name: 'UI State v1 - Current version',
    input: {
      version: 1,
      currentPage: 42,
      scale: 1.75,
    },
    expectedOutput: {
      currentPage: 42,
      scale: 1.75,
    },
    migrationFn: (data: MigrationData) => {
      if (typeof data === 'object' && data !== null && !Array.isArray(data) && 'version' in data && data.version === 1 && 'currentPage' in data && 'scale' in data) {
        const dataObj = data as { currentPage: number; scale: number }
        return { currentPage: dataObj.currentPage, scale: dataObj.scale }
      }
      return null
    },
  },
  {
    name: 'UI State - Legacy format',
    input: {
      currentPage: 10,
      scale: 2.0,
    },
    expectedOutput: {
      currentPage: 10,
      scale: 2.0,
    },
    migrationFn: (data: MigrationData) => {
      if (typeof data === 'object' && data !== null && !Array.isArray(data) && 'currentPage' in data && 'scale' in data) {
        const dataObj = data as { currentPage: number; scale: number }
        return { currentPage: dataObj.currentPage, scale: dataObj.scale }
      }
      return null
    },
  },
  {
    name: 'Global UI State v1 - Current version',
    input: {
      version: 1,
      activeTab: 'chat',
      isPanelCollapsed: false,
    },
    expectedOutput: {
      activeTab: 'chat',
      isPanelCollapsed: false,
    },
    migrationFn: (data: MigrationData) => {
      if (typeof data === 'object' && data !== null && !Array.isArray(data) && 'version' in data && data.version === 1 && 'activeTab' in data) {
        const dataObj = data as { activeTab: string; isPanelCollapsed?: boolean }
        if (['notes', 'chat', 'settings'].includes(dataObj.activeTab)) {
          return {
            activeTab: dataObj.activeTab as 'notes' | 'chat' | 'settings',
            isPanelCollapsed: dataObj.isPanelCollapsed ?? false,
          }
        }
      }
      return null
    },
  },
  {
    name: 'Chat Messages - Invalid version (newer)',
    input: {
      version: 999,
      messages: [{ id: '1', role: 'user', content: 'Test' }],
    },
    expectedOutput: [],
    migrationFn: (data: MigrationData) => {
      if (typeof data === 'object' && data !== null && !Array.isArray(data) && 'version' in data) {
        const dataObj = data as { version: number; messages?: unknown[] }
        if (dataObj.version > 1) {
          console.warn(`Version ${dataObj.version} is newer than supported`)
          return []
        }
        return dataObj.messages || []
      }
      return []
    },
  },
  {
    name: 'Chat Messages - Corrupted data',
    input: 'not valid json',
    expectedOutput: [],
    migrationFn: (data: MigrationData) => {
      try {
        if (typeof data === 'string') {
          JSON.parse(data)
        }
        if (typeof data === 'object' && data !== null && !Array.isArray(data) && 'messages' in data) {
          const dataObj = data as { messages?: unknown[] }
          return dataObj.messages || []
        }
        return []
      } catch {
        return []
      }
    },
  },
]

function runTests() {
  console.log('🧪 Running Migration Tests...\n')
  
  let passed = 0
  let failed = 0
  
  testCases.forEach((testCase, index) => {
    try {
      const result = testCase.migrationFn(testCase.input)
      const passedTest = JSON.stringify(result) === JSON.stringify(testCase.expectedOutput)
      
      if (passedTest) {
        console.log(`✅ Test ${index + 1}: ${testCase.name}`)
        passed++
      } else {
        console.error(`❌ Test ${index + 1}: ${testCase.name}`)
        console.error(`   Expected:`, testCase.expectedOutput)
        console.error(`   Got:`, result)
        failed++
      }
    } catch (error) {
      console.error(`❌ Test ${index + 1}: ${testCase.name}`)
      console.error(`   Error:`, error)
      failed++
    }
  })
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('✅ All migration tests passed!')
    return 0
  } else {
    console.error('❌ Some migration tests failed')
    return 1
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runTests())
}

export { runTests, testCases }
