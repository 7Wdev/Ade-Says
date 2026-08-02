import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@m3e/web/button';
import '@m3e/web/button-group';
import '@m3e/web/icon';
import '@m3e/web/icon-button';
import '@m3e/web/loading-indicator';
import App from './App.tsx'
import { installTooltipSuppression } from './utils/tooltipSuppression.ts';

installTooltipSuppression();

// Initialize OneSignal push notifications
window.OneSignalDeferred = window.OneSignalDeferred || [];
window.OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({
    appId: '84aecbe4-2769-4b27-a901-224056a03cb9',
    safari_web_id: 'web.onesignal.auto.00b75e31-4d41-4106-ab79-a5c68121f393',
    notifyButton: {
      enable: false, // We use a custom subscribe button instead
    },
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
