import { Link } from 'react-router-dom'

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#08090a] text-white">
      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-[#08090a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <svg className="w-6 h-6 text-blue-400" viewBox="0 0 640 640" fill="currentColor">
              <path d="M64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM320 224C373 224 416 267 416 320C416 373 373 416 320 416C267 416 224 373 224 320C224 267 267 224 320 224zM320 464C399.5 464 464 399.5 464 320C464 240.5 399.5 176 320 176C240.5 176 176 240.5 176 320C176 399.5 240.5 464 320 464zM320 352C337.7 352 352 337.7 352 320C352 302.3 337.7 288 320 288C302.3 288 288 302.3 288 320C288 337.7 302.3 352 320 352z" />
            </svg>
            <span className="text-lg font-semibold tracking-tight">Echo</span>
          </Link>
        </div>
      </nav>

      {/* ── Content ── */}
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-12">Last updated: March 12, 2026</p>

        <div className="space-y-10 text-[15px] leading-relaxed text-zinc-300">
          <p>
            This privacy policy covers <strong className="text-white">Echo Reading</strong> (the web application at echoreading.com) and <strong className="text-white">Echo Clip</strong> (the companion Chrome extension). Both are operated by Echo Reading.
          </p>

          {/* ── What we collect ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">What we collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-white mb-1">Account information</h3>
                <p>When you create an account, we collect your email address and name through our authentication provider (Clerk). This is used solely for authentication and account management.</p>
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Content you upload</h3>
                <p>PDF files you upload and articles you clip are stored in your personal library. This includes the files themselves, annotations, highlights, notes, canvas content, chat history, and reading progress.</p>
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Echo Clip: page content</h3>
                <p>When you use the Echo Clip extension and click "Send to Echo," the extension reads the text content and metadata (title, author) from the current web page. This content is converted to a PDF and uploaded to your Echo Reading library. No page content is read without your explicit action.</p>
              </div>
            </div>
          </section>

          {/* ── What we do NOT collect ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">What we do not collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>We do not collect browsing history, cookies, or analytics data</li>
              <li>We do not track which pages you visit with the Echo Clip extension</li>
              <li>We do not collect or store your LLM API keys on our servers</li>
              <li>We do not sell, share, or transfer your data to third parties for advertising or any other purpose</li>
            </ul>
          </section>

          {/* ── How data is stored ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">How your data is stored</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-white mb-1">Cloud storage</h3>
                <p>Your library, annotations, and notes are stored in Supabase (PostgreSQL database and file storage). All data is scoped to your authenticated account using Row Level Security policies. No user can access another user's data. Supabase encrypts data at rest.</p>
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">API keys</h3>
                <p>If you use AI chat features, your API key (OpenAI or Anthropic) is encrypted on your device using the Web Crypto API (AES-GCM) and stored in your browser's IndexedDB. Your key is sent directly from your browser to the AI provider. It never passes through any server we operate.</p>
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Local browser storage</h3>
                <p>Theme preferences and UI state are stored in your browser's localStorage. These never leave your device.</p>
              </div>
            </div>
          </section>

          {/* ── Echo Clip specifics ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Echo Clip extension</h2>
            <div className="space-y-4">
              <p>The Echo Clip Chrome extension uses the following permissions:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-white">activeTab:</strong> To read the content of the page you want to clip, only when you click "Send to Echo"</li>
                <li><strong className="text-white">scripting:</strong> To extract article content from the page and to retrieve your authentication session from an open Echo Reading tab</li>
                <li><strong className="text-white">Host access to echoreading.com:</strong> To check your login status by reading your existing session from an open Echo tab</li>
                <li><strong className="text-white">Host access to Supabase:</strong> To upload the clipped article to your personal library</li>
              </ul>
              <p>The extension contains no remote code. All functionality is bundled within the extension package. No analytics, tracking, or telemetry is included.</p>
            </div>
          </section>

          {/* ── Third party services ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Third party services</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Clerk</strong> (authentication): Handles sign-in and session management. See <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Clerk's privacy policy</a>.</li>
              <li><strong className="text-white">Supabase</strong> (database and storage): Stores your library and files. See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Supabase's privacy policy</a>.</li>
              <li><strong className="text-white">Vercel</strong> (hosting): Serves the web application. See <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Vercel's privacy policy</a>.</li>
              <li><strong className="text-white">OpenAI / Anthropic</strong> (AI chat, optional): If you use AI features, your document content and questions are sent directly from your browser to the provider you choose. We do not proxy or store these requests.</li>
            </ul>
          </section>

          {/* ── Data deletion ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Data deletion</h2>
            <p>You can delete individual books from your library at any time, which removes the PDF, all annotations, notes, chat history, and reading progress associated with it. To delete your entire account and all associated data, contact us at the email below.</p>
          </section>

          {/* ── Changes ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Changes to this policy</h2>
            <p>We may update this privacy policy from time to time. Changes will be posted on this page with an updated revision date. Continued use of Echo Reading or Echo Clip after changes constitutes acceptance of the updated policy.</p>
          </section>

          {/* ── Contact ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Contact</h2>
            <p>If you have questions about this privacy policy or want to request data deletion, open an issue on the <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">GitHub repository</a>.</p>
          </section>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-500">
            <svg className="w-5 h-5" viewBox="0 0 640 640" fill="currentColor">
              <path d="M64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM320 224C373 224 416 267 416 320C416 373 373 416 320 416C267 416 224 373 224 320C224 267 267 224 320 224zM320 464C399.5 464 464 399.5 464 320C464 240.5 399.5 176 320 176C240.5 176 176 240.5 176 320C176 399.5 240.5 464 320 464zM320 352C337.7 352 352 337.7 352 320C352 302.3 337.7 288 320 288C302.3 288 288 302.3 288 320C288 337.7 302.3 352 320 352z" />
            </svg>
            <span className="text-sm font-medium">Echo</span>
          </div>
          <span className="text-sm text-zinc-600">&copy; {new Date().getFullYear()} Echo Reading</span>
        </div>
      </footer>
    </div>
  )
}
