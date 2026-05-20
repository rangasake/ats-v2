// lib/OrgContext.js — Organisation branding context
// Fetches public branding from /api/org/config and makes it available
// app-wide via useOrg(). Also applies CSS custom properties for dynamic theming.
import { createContext, useContext, useState, useEffect } from 'react';

const OrgContext = createContext(null);

// Default branding shown before the fetch resolves
const DEFAULTS = {
  id:           '',
  name:         'AFTS',
  primaryColor: '#1e3a8a',
  accentColor:  '#2563eb',
  logoText:     'AFTS',
  subtitle:     'Vehicle Fitness Testing Station',
};

export function OrgProvider({ children }) {
  const [org, setOrg] = useState(DEFAULTS);

  useEffect(() => {
    fetch('/api/org/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setOrg(data); })
      .catch(() => {});
  }, []);

  // Apply CSS custom properties whenever org branding changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--color-primary', org.primaryColor);
    document.documentElement.style.setProperty('--color-accent',  org.accentColor);
  }, [org.primaryColor, org.accentColor]);

  return <OrgContext.Provider value={org}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  return useContext(OrgContext);
}
