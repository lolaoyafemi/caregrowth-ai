import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { UserProvider } from './contexts/UserContext'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById("root")!).render(
  <UserProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </UserProvider>
);
