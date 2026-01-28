# Security and Privacy

## Your API Key

Your OpenAI API key is stored on your device and is never sent to us. Here is how it works:

- **Storage**: Your API key is stored in your browser's IndexedDB, encrypted at rest using the Web Crypto API (AES-GCM)
- **Transmission**: When you ask a question, your key is sent directly to OpenAI's API. It never passes through any server we operate
- **No backend**: This is a client-side only application. We do not operate a server that receives your data
- **Removal**: You can remove your API key at any time from Settings. You can also revoke the key from your [OpenAI dashboard](https://platform.openai.com/api-keys)

## What This Protects Against

The encrypted storage protects against:

- Casual inspection of browser storage (DevTools, localStorage viewers)
- Accidental logging of the key in console output
- Automated tools that scan localStorage for secrets

## What This Does Not Protect Against

This is a browser-based application. Any script running in the page context can still access your data. This includes:

- Malicious browser extensions with page access
- Cross-site scripting (XSS) attacks, if any were to exist in the application
- Physical access to your device
- Memory inspection tools

**Recommendation**: Only use this application from a trusted environment. Do not install untrusted browser extensions.

## Data Storage

All your data is stored locally:

- **Documents**: PDFs are loaded directly from your filesystem and never uploaded anywhere
- **Annotations**: Highlights and notes are stored in your browser's localStorage and optionally synced to a local file you choose
- **Chat history**: Conversation history is stored in localStorage, per document
- **Settings**: Preferences like theme and chat instructions are stored in localStorage

## Browser Compatibility

The encrypted key storage requires IndexedDB and the Web Crypto API. These are supported in:

- Chrome 76+
- Firefox 57+
- Safari 14.1+
- Edge 79+

If your browser does not support storing cryptographic keys in IndexedDB (some older Safari versions), the application will fall back to in-memory storage. In this mode, your API key will not persist and you will need to re-enter it after closing the browser.

## Questions or Concerns

If you have security questions or want to report a vulnerability, please open an issue on the repository.
