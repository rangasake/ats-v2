import '../styles/globals.css';
import { AuthProvider } from '../lib/useAuth';
import { ToastProvider } from '../lib/ToastContext';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </AuthProvider>
  );
}