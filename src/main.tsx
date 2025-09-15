import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { UserProvider } from './contexts/UserContext.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';

createRoot(document.getElementById("root")!).render(
  <UserProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </UserProvider>
);