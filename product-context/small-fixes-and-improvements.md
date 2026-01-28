# Small Fixes and Improvements

## 1. API Key Error Handling

**Job to be done**: User wants to chat with the LLM about their document

**Problem 1**: When API key is missing, chat fails silently or with unclear error. User doesn't know why chat isn't working or how to fix it.

**Solution**: 
- Show clear error state in chat interface when API key is missing
- Display actionable message prompting user to add API key in settings
- Disable chat input until API key is configured
