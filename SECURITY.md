# Security and Privacy

## Architecture

Echo uses a client-server architecture:

- **Frontend**: React SPA hosted on Vercel
- **Auth**: Clerk handles authentication (sign-in, sign-up, session management)
- **Backend**: Supabase provides the database (PostgreSQL) and file storage
- **AI**: LLM API calls go directly from your browser to the provider you choose (OpenAI or Anthropic)

## Your API Key

Your LLM API key is stored on your device and is never sent to our servers.

- **Storage**: Your API key is stored in your browser's IndexedDB, encrypted at rest using the Web Crypto API (AES-GCM)
- **Transmission**: When you ask a question, your key is sent directly from your browser to the LLM provider's API (OpenAI or Anthropic). It never passes through any server we operate
- **Removal**: You can remove your API key at any time from Settings. You can also revoke the key from your provider's dashboard

## What Encrypted Storage Protects Against

- Casual inspection of browser storage (DevTools, localStorage viewers)
- Accidental logging of the key in console output
- Automated tools that scan localStorage for secrets

## What It Does Not Protect Against

This is a browser-based application. Any script running in the page context can still access your data. This includes:

- Malicious browser extensions with page access
- Cross-site scripting (XSS) attacks, if any were to exist in the application
- Physical access to your device
- Memory inspection tools

**Recommendation**: Only use this application from a trusted environment. Do not install untrusted browser extensions.

## Data Storage

Your data is stored in Supabase, scoped to your authenticated account:

- **PDFs**: Uploaded to Supabase Storage (encrypted at rest by Supabase). Access is controlled by Row Level Security policies tied to your account
- **Annotations**: Highlights, notes, and bookmarks stored in PostgreSQL, scoped to your user ID
- **Canvas content**: Rich text notes stored per book in PostgreSQL
- **Chat history**: Conversation messages stored per book in PostgreSQL
- **Reading progress**: Current page, furthest page, and zoom level stored per book
- **Settings**: Theme, LLM provider/model preferences, and custom chat instructions

All database queries are scoped to your Clerk user ID via Supabase Row Level Security (RLS). No user can access another user's data.

## Client-Side Storage

Some data is also stored locally in your browser:

- **API keys**: Encrypted in IndexedDB (never sent to our servers)
- **Theme preference**: localStorage
- **UI state**: localStorage (sidebar width, active tab, panel collapsed state)

## Browser Compatibility

The encrypted key storage requires IndexedDB and the Web Crypto API. These are supported in:

- Chrome 76+
- Firefox 57+
- Safari 14.1+
- Edge 79+

If your browser does not support storing cryptographic keys in IndexedDB, the application will fall back to in-memory storage. Your API key will not persist and you will need to re-enter it after closing the browser.

## Code Security

The repository uses [GitHub CodeQL](https://codeql.github.com/) for static application security testing (SAST). CodeQL runs on every push and pull request and on a weekly schedule. Results appear under the repository **Security** tab.

## Questions or Concerns

If you have security questions or want to report a vulnerability, please open an issue on the repository.
