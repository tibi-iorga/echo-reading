import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/react'

const features = [
  {
    title: 'AI-Powered Chat',
    description:
      'Ask questions about your document and get contextual answers. Select any passage to dive deeper, and save key insights directly to your notes.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
        />
      </svg>
    ),
  },
  {
    title: 'Rich Annotations',
    description:
      'Highlight passages with colors, attach notes, and bookmark important pages. Everything stays organized and searchable in the side panel.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
        />
      </svg>
    ),
  },
  {
    title: 'Canvas Workspace',
    description:
      'A rich text editor lives alongside your reading. Pull in your highlights with a slash command and build structured, exportable notes.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
  },
  {
    title: 'Export Anywhere',
    description:
      'Take your work with you. Export your annotations and canvas notes as Markdown, PDF, or plain text. Ready for any workflow.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
    ),
  },
]

export function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const ctaPath = isSignedIn ? '/library' : '/sign-up'
  const ctaText = isSignedIn ? 'Open App' : 'Get started'

  return (
    <div className="min-h-screen bg-[#08090a] text-white landing-page">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full z-50 bg-[#08090a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <svg className="w-6 h-6 text-blue-400" viewBox="0 0 640 640" fill="currentColor">
              <path d="M64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM320 224C373 224 416 267 416 320C416 373 373 416 320 416C267 416 224 373 224 320C224 267 267 224 320 224zM320 464C399.5 464 464 399.5 464 320C464 240.5 399.5 176 320 176C240.5 176 176 240.5 176 320C176 399.5 240.5 464 320 464zM320 352C337.7 352 352 337.7 352 320C352 302.3 337.7 288 320 288C302.3 288 288 302.3 288 320C288 337.7 302.3 352 320 352z" />
            </svg>
            <span className="text-lg font-semibold tracking-tight">Echo</span>
          </Link>

          <div className="flex items-center gap-3">
            {isLoaded && isSignedIn ? (
              <Link
                to="/library"
                className="text-sm font-medium px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                Open App
              </Link>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block"
                >
                  Sign in
                </Link>
                <Link
                  to="/sign-up"
                  className="text-sm font-medium px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 sm:pt-44 pb-16 px-6 text-center">
        {/* Background glow */}
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none landing-glow"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(59,130,246,0.15), transparent)',
          }}
        />

        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1]">
            <span className="block">Read deeper.</span>
            <span className="block mt-1 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Think clearer.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto leading-relaxed">
            An AI reading companion for PDFs. Highlight, annotate, chat with
            your documents, and capture structured notes, all in one place.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={ctaPath}
              className="inline-flex items-center gap-2 px-7 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              {ctaText}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="#features"
              className="px-7 py-2.5 text-sm font-medium rounded-lg border border-white/[0.1] text-zinc-300 hover:text-white hover:border-white/[0.2] transition-colors"
            >
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* ── Product Preview ── */}
      <section className="relative px-6 pb-28 pt-4">
        <div className="relative max-w-4xl mx-auto">
          {/* Glow behind preview */}
          <div
            className="absolute -inset-12 pointer-events-none landing-glow"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(59,130,246,0.1), transparent)',
            }}
          />

          {/* Browser window */}
          <div className="relative bg-[#111214] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-blue-950/30">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#0d0e10]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/[0.15]" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/[0.15]" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/[0.15]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-10 py-1 bg-white/[0.04] rounded text-[11px] text-zinc-500 hidden sm:block">
                  echoreading.com
                </div>
              </div>
              <div className="w-16" />
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.06] bg-[#0f1012]">
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded bg-white/[0.06] flex items-center justify-center">
                  <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </div>
                <div className="w-6 h-6 rounded bg-white/[0.06] flex items-center justify-center">
                  <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
              <span className="text-[11px] text-zinc-500 ml-1 hidden sm:inline">Page 42 of 218</span>
              <div className="flex-1" />
              <span className="text-[11px] text-zinc-500">125%</span>
            </div>

            {/* App content mockup */}
            <div className="flex" style={{ height: 360 }}>
              {/* PDF area */}
              <div className="flex-1 p-6 sm:p-8 overflow-hidden">
                <div className="space-y-2.5 max-w-md">
                  <div className="h-4 bg-white/[0.07] rounded w-52 mb-6" />
                  <div className="h-2.5 bg-white/[0.05] rounded w-full" />
                  <div className="h-2.5 bg-white/[0.05] rounded w-11/12" />
                  <div className="h-2.5 bg-white/[0.05] rounded w-full" />
                  <div className="h-2.5 bg-blue-400/20 rounded w-10/12 ring-1 ring-blue-400/30" />
                  <div className="h-2.5 bg-blue-400/20 rounded w-full ring-1 ring-blue-400/30" />
                  <div className="h-2.5 bg-blue-400/20 rounded w-7/12 ring-1 ring-blue-400/30" />
                  <div className="h-2.5 bg-white/[0.05] rounded w-full" />
                  <div className="h-2.5 bg-white/[0.05] rounded w-9/12" />
                  <div className="h-2.5 bg-white/[0.05] rounded w-full" />
                  <div className="h-2.5 bg-white/[0.05] rounded w-10/12" />
                  <div className="h-6" />
                  <div className="h-2.5 bg-white/[0.05] rounded w-full" />
                  <div className="h-2.5 bg-white/[0.05] rounded w-11/12" />
                  <div className="h-2.5 bg-white/[0.05] rounded w-8/12" />
                </div>
              </div>

              {/* Notes panel */}
              <div className="w-56 sm:w-64 border-l border-white/[0.06] bg-[#0c0d0f] hidden md:flex md:flex-col">
                {/* Tabs */}
                <div className="flex gap-1 px-3 pt-3 pb-2">
                  <div className="px-2.5 py-1 text-[11px] font-medium text-blue-400 bg-blue-400/10 rounded">
                    Notes
                  </div>
                  <div className="px-2.5 py-1 text-[11px] text-zinc-500">Chat</div>
                  <div className="px-2.5 py-1 text-[11px] text-zinc-500">Canvas</div>
                </div>

                {/* Annotation items */}
                <div className="flex-1 px-3 py-2 space-y-2 overflow-hidden">
                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-[10px] text-zinc-500">Page 42</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded w-full mb-1" />
                    <div className="h-2 bg-white/[0.06] rounded w-3/4" />
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-[10px] text-zinc-500">Page 38</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded w-5/6 mb-1" />
                    <div className="h-2 bg-white/[0.06] rounded w-2/3" />
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-zinc-500">Page 15</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded w-4/5" />
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-[10px] text-zinc-500">Page 12</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded w-full mb-1" />
                    <div className="h-2 bg-white/[0.06] rounded w-1/2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 py-24 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything you need to read actively
            </h2>
            <p className="mt-4 text-zinc-400 max-w-lg mx-auto leading-relaxed">
              Echo combines the tools you need into a focused reading
              environment so you can go from reading to understanding faster.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 text-blue-400 group-hover:bg-blue-500/15 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-[17px] font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 py-24 text-center border-t border-white/[0.04]">
        <div className="relative max-w-2xl mx-auto">
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[250px] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(59,130,246,0.12), transparent)',
            }}
          />
          <h2 className="relative text-3xl sm:text-4xl font-bold tracking-tight">
            Start reading smarter today
          </h2>
          <p className="relative mt-4 text-zinc-400">
            Free to use.
          </p>
          <div className="relative mt-8">
            <Link
              to={ctaPath}
              className="inline-flex items-center gap-2 px-8 py-3 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              {ctaText}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
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
