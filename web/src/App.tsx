import './index.css'

/**
 * App shell — placeholder for Day 0.
 * Day 1+: M4 builds the dashboard layout here, M3 mounts <Scene />.
 *
 * The disclaimer is permanent: banner (top) + footer (bottom) + startup
 * modal (first render). Track A requirement 5.
 */
function App() {
  return (
    <div className="flex h-full flex-col bg-mist text-navy">
      <header className="bg-risk-high/10 border-b border-risk-high/30 px-4 py-2 text-center text-xs font-semibold text-risk-high">
        For decision support / educational purposes only — not a substitute for
        formal diagnostic imaging.
      </header>

      <main className="flex flex-1 items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Cardio 3D Risk</h1>
          <p className="mt-2 max-w-md text-sm text-slate">
            Track A scaffold is up. Dashboard, 3D viewer and prediction API
            are built from Day 1 — see <code>docs/requirements-traceability.md</code>.
          </p>
        </div>
      </main>

      <footer className="border-t bg-white px-4 py-2 text-center text-[11px] text-slate">
        For decision support / educational purposes only — not a substitute for
        formal diagnostic imaging.
      </footer>
    </div>
  )
}

export default App
