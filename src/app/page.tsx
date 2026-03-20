import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,255,133,0.03)_0%,_transparent_50%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

      <main className="z-10 flex flex-col items-center gap-8 max-w-3xl px-6 text-center">
        {/* Logo */}
        <div className="font-mono text-xs tracking-[0.3em] text-muted uppercase">
          Command Center
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
          Social<span className="text-accent">Forge</span>
        </h1>

        <p className="text-lg md:text-xl text-muted max-w-xl leading-relaxed">
          AI-powered content automation platform. Generate, approve, schedule,
          and post across every major social network.
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-4">
          <div className="card px-5 py-4 text-left">
            <div className="font-mono text-[11px] tracking-wider uppercase text-accent mb-2">
              01 — Generate
            </div>
            <p className="text-sm text-muted">
              AI agent crafts platform-optimized content in seconds.
            </p>
          </div>
          <div className="card px-5 py-4 text-left">
            <div className="font-mono text-[11px] tracking-wider uppercase text-amber mb-2">
              02 — Approve
            </div>
            <p className="text-sm text-muted">
              Review, edit, and approve content before it goes live.
            </p>
          </div>
          <div className="card px-5 py-4 text-left">
            <div className="font-mono text-[11px] tracking-wider uppercase text-purple mb-2">
              03 — Schedule
            </div>
            <p className="text-sm text-muted">
              Schedule posts per platform with n8n-powered automation.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3 mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-accent text-background font-mono text-sm tracking-wider uppercase border border-accent hover:bg-accent-dim transition-colors"
          >
            Open Dashboard →
          </Link>
          <Link
            href="/generate"
            className="inline-flex items-center gap-2 px-8 py-3.5 border border-border text-foreground font-mono text-sm tracking-wider uppercase hover:border-border-hover hover:bg-surface transition-colors"
          >
            Create Post
          </Link>
        </div>
      </main>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  )
}
