import { useRoute } from './lib/router.jsx'
import Home from './pages/Home.jsx'
import AicteDashboard from './pages/AicteDashboard.jsx'
import InstitutionUpload from './pages/InstitutionUpload.jsx'
import StudentProfile from './pages/StudentProfile.jsx'
import Verifier from './pages/Verifier.jsx'

export default function App() {
  const { path, params } = useRoute()
  switch (path) {
    case '/aicte':
      return <AicteDashboard />
    case '/institution':
      return <InstitutionUpload />
    case '/student':
      return <StudentProfile />
    case '/verify':
      // key forces a fresh page when a new code arrives via the URL
      return <Verifier key={params.get('t') ?? ''} params={params} />
    default:
      return <Home />
  }
}
