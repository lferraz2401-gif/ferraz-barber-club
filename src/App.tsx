/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { Header } from './components/layout/Header.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { MobileNavigation } from './components/layout/MobileNavigation.js';
import { ToastContainer } from './components/common/Toast.js';
import { NewAppointmentModal } from './components/agenda/NewAppointmentModal.js';
import { PublicBookingView } from './components/public/PublicBookingView.js';
import { AdminAuthGate } from './components/auth/AdminAuthGate.js';

// Views
import { DashboardView } from './components/dashboard/DashboardView.js';
import { AgendaView } from './components/agenda/AgendaView.js';
import { ClientsView } from './components/clients/ClientsView.js';
import { CrmView } from './components/crm/CrmView.js';
import { FinancialView } from './components/financial/FinancialView.js';
import { ServicesView } from './components/services/ServicesView.js';
import { BarbersView } from './components/barbers/BarbersView.js';
import { ScheduleBlocksView } from './components/schedule/ScheduleBlocksView.js';
import { SettingsView } from './components/settings/SettingsView.js';
import { WhatsAppHubView } from './components/whatsapp/WhatsAppHubView.js';

function isPublicBookingPath(path: string, hash: string): boolean {
  return (
    path === '/agendar' ||
    path.startsWith('/agendar/') ||
    hash === '#/agendar' ||
    hash.startsWith('#/agendar')
  );
}

const MainContent: React.FC = () => {
  const { activeTab, toasts, dismissToast } = useApp();
  const [pathname, setPathname] = React.useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [hash, setHash] = React.useState(() =>
    typeof window !== 'undefined' ? window.location.hash : ''
  );

  React.useEffect(() => {
    const handleLocationChange = () => {
      setPathname(window.location.pathname);
      setHash(window.location.hash);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (url: string) => {
    window.history.pushState({}, '', url);
    setPathname(window.location.pathname);
    setHash(window.location.hash);
  };

  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const auth = sessionStorage.getItem('fbc_staff_auth');
      return Boolean(auth && JSON.parse(auth).token);
    } catch {
      return false;
    }
  });

  if (isPublicBookingPath(pathname, hash)) {
    return <PublicBookingView />;
  }

  // Client vs Admin Security Isolation
  if (!isAuthenticated) {
    return (
      <AdminAuthGate
        onSuccess={(user) => {
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-canvas-ambient text-zinc-100 flex flex-col font-sans selection:bg-amber-400 selection:text-zinc-950">
      <Header onMenuToggle={() => setMobileDrawerOpen(true)} />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Persistent Navigation Sidebar (Desktop) */}
        <Sidebar />

        {/* Viewport Content Area with smooth scroll, reserving space for fixed mobile bar */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-28 md:pb-8">
          <div className="max-w-[1560px] mx-auto space-y-6">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'agenda' && <AgendaView />}
            {activeTab === 'whatsapp' && <WhatsAppHubView />}
            {activeTab === 'clients' && <ClientsView />}
            {activeTab === 'crm' && <CrmView />}
            {activeTab === 'financial' && <FinancialView />}
            {activeTab === 'services' && <ServicesView />}
            {activeTab === 'barbers' && <BarbersView />}
            {activeTab === 'schedule' && <ScheduleBlocksView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Bar & Drawer Navigation */}
      <MobileNavigation
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Global Modals & Notifications */}
      <NewAppointmentModal />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

