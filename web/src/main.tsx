import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// No <StrictMode>. Its dev-only effect double-invoke breaks two things we
// rely on: drei's <Html> portal target (one label per scene silently
// unmounts) and the useMemo-geometry + useEffect-dispose pairing in
// Heart/VesselTube (geometry gets disposed and never rebuilt). The demo runs
// `npm run dev`, so this is not a dev-only cosmetic.
createRoot(document.getElementById('root')!).render(<App />)
