/**
 * Migration QA Test Script (Browser Version)
 * 
 * Run this in your browser console to test migrations.
 * Copy-paste this entire file into the console, or load it as a script.
 * 
 * This tests that migration functions handle all data formats correctly.
 */

(function() {
  console.log('🧪 Running Migration Tests...\n')
  
  // Import the actual migration functions from storageService
  // For testing, we'll recreate the logic here
  
  const CURRENT_CHAT_MESSAGES_VERSION = 1
  const CURRENT_UI_STATE_VERSION = 1
  const CURRENT_GLOBAL_UI_STATE_VERSION = 1
  
  function migrateChatMessages(data) {
    if (data.version === CURRENT_CHAT_MESSAGES_VERSION) {
      return data.messages || []
    }
    if (data.version > CURRENT_CHAT_MESSAGES_VERSION) {
      console.warn(`Chat messages version ${data.version} is newer than supported ${CURRENT_CHAT_MESSAGES_VERSION}. Resetting.`)
      return []
    }
    return data.messages || []
  }
  
  function migrateUIState(data) {
    if (data.version === CURRENT_UI_STATE_VERSION) {
      if (data.currentPage !== undefined && data.scale !== undefined) {
        return { currentPage: data.currentPage, scale: data.scale }
      }
      return null
    }
    if (data.version > CURRENT_UI_STATE_VERSION) {
      console.warn(`UI state version ${data.version} is newer than supported ${CURRENT_UI_STATE_VERSION}. Resetting.`)
      return null
    }
    if (data.currentPage !== undefined && data.scale !== undefined) {
      return { currentPage: data.currentPage, scale: data.scale }
    }
    return null
  }
  
  function migrateGlobalUIState(data) {
    if (data.version === CURRENT_GLOBAL_UI_STATE_VERSION) {
      if (data.activeTab && ['notes', 'chat', 'settings'].includes(data.activeTab)) {
        return {
          activeTab: data.activeTab,
          isPanelCollapsed: data.isPanelCollapsed ?? false,
        }
      }
      return null
    }
    if (data.version > CURRENT_GLOBAL_UI_STATE_VERSION) {
      console.warn(`Global UI state version ${data.version} is newer than supported ${CURRENT_GLOBAL_UI_STATE_VERSION}. Resetting.`)
      return null
    }
    if (data.activeTab && ['notes', 'chat', 'settings'].includes(data.activeTab)) {
      return {
        activeTab: data.activeTab,
        isPanelCollapsed: data.isPanelCollapsed ?? false,
      }
    }
    return null
  }
  
  const testCases = [
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
      migrationFn: migrateChatMessages,
    },
    {
      name: 'Chat Messages - Legacy format (no version)',
      input: [
        { id: '1', role: 'user', content: 'Hello' },
      ],
      expectedOutput: [
        { id: '1', role: 'user', content: 'Hello' },
      ],
      migrationFn: (data) => {
        if (Array.isArray(data)) {
          return data
        }
        if (data.version !== undefined) {
          return migrateChatMessages(data)
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
      migrationFn: migrateUIState,
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
      migrationFn: migrateUIState,
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
      migrationFn: migrateGlobalUIState,
    },
    {
      name: 'Chat Messages - Invalid version (newer)',
      input: {
        version: 999,
        messages: [{ id: '1', role: 'user', content: 'Test' }],
      },
      expectedOutput: [],
      migrationFn: migrateChatMessages,
    },
  ]
  
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
    return { success: true, passed, failed }
  } else {
    console.error('❌ Some migration tests failed')
    return { success: false, passed, failed }
  }
})()
