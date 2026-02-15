import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fef2f2; padding: 20px;">
      <div style="background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 24px; max-width: 500px;">
        <h1 style="color: #dc2626; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Root Element Bulunamadı</h1>
        <p style="color: #374151;">HTML'de root div elementi eksik.</p>
      </div>
    </div>
  `;
  throw new Error('Root element not found');
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fef2f2; padding: 20px;">
      <div style="background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 24px; max-width: 500px;">
        <h1 style="color: #dc2626; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Uygulama Başlatılamadı</h1>
        <p style="color: #374151; margin-bottom: 12px;">Uygulama yüklenirken bir hata oluştu.</p>
        <pre style="background: #f3f4f6; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; color: #1f2937; white-space: pre-wrap; word-break: break-word;">${error instanceof Error ? error.message : String(error)}</pre>
        <p style="color: #6b7280; margin-top: 16px; font-size: 14px;">Browser console'u açın (F12) ve daha fazla detay görmek için konsolu kontrol edin.</p>
        <button onclick="location.reload()" style="margin-top: 16px; width: 100%; background: #3b82f6; color: white; padding: 8px; border-radius: 4px; border: none; cursor: pointer; font-weight: 500;">Sayfayı Yenile</button>
      </div>
    </div>
  `;
}
