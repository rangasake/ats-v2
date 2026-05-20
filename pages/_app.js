import '../styles/globals.css';
import { AuthProvider } from '../lib/useAuth';
import { ToastProvider } from '../lib/ToastContext';
import { OrgProvider } from '../lib/OrgContext';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <OrgProvider>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </OrgProvider>
    </AuthProvider>
  );
}