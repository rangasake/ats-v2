import '../styles/globals.css';
import { AuthProvider } from '../lib/useAuth';
import { ToastProvider } from '../lib/ToastContext';
import { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';

import { store } from '../store/store';
import {
  setOrg,
  setOrgLoading,
  setOrgError,
} from '../store/orgSlice';

function OrgLoader({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const loadOrg = async () => {
      try {
        dispatch(setOrgLoading(true));

        const response = await fetch('/api/org');

        if (!response.ok) {
          throw new Error('Failed to load organization');
        }

        const org = await response.json();

        dispatch(setOrg(org));
      } catch (error) {
        console.error('Organization loading failed:', error);

        dispatch(setOrgError(error.message));
      }
    };

    loadOrg();
  }, [dispatch]);

  return children;
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Provider store={store}>
          <OrgLoader>
            <Component {...pageProps} />
          </OrgLoader>
        </Provider>
      </ToastProvider>
    </AuthProvider>
  );
}