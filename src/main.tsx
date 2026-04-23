import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@m3e/web/button';
import '@m3e/web/fab';
import '@m3e/web/fab-menu';
import '@m3e/web/loading-indicator';
import '@m3e/web/progress-indicator';
import App from './App.tsx'
import { installTooltipSuppression } from './utils/tooltipSuppression.ts';

installTooltipSuppression();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
