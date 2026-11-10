import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, Barber, Service, ShopSettings, Customer } from '../types/index.js';
import { api } from '../services/api.js';
import { ToastMessage } from '../components/common/Toast.js';
import { normalizeSettings } from '../utils/settingsDefaults.js';

export type NavTab =
  | 'dashboard'
  | 'agenda'
  | 'clients'
  | 'crm'
  | 'whatsapp'
  | 'financial'
  | 'services'
  | 'barbers'
  | 'schedule'
  | 'settings';

interface AppContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  availableUsers: UserProfile[];
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  barbers: Barber[];
  services: Service[];
  settings: ShopSettings | null;
  refreshAll: () => Promise<void>;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  // Modal states
  isNewAppointmentOpen: boolean;
  setIsNewAppointmentOpen: (open: boolean) => void;
  newAppointmentPreselect: {
    customerId?: string;
    barberId?: string;
    date?: string;
    time?: string;
  } | null;
  openNewAppointmentWith: (preselect?: {
    customerId?: string;
    barberId?: string;
    date?: string;
    time?: string;
  }) => void;
  selectedCustomerIdForDetail: string | null;
  setSelectedCustomerIdForDetail: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([
    { id: 'usr_admin', name: 'Administrador (Gerência)', role: 'ADMIN' },
  ]);
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('fbc_staff_auth');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.user) return parsed.user;
        }
      } catch {}
    }
    return { id: 'usr_admin', name: 'Administrador (Gerência)', role: 'ADMIN' };
  });
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(normalizeSettings(null));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Appointment Modal
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [newAppointmentPreselect, setNewAppointmentPreselect] = useState<{
    customerId?: string;
    barberId?: string;
    date?: string;
    time?: string;
  } | null>(null);

  // Customer Detail Drawer
  const [selectedCustomerIdForDetail, setSelectedCustomerIdForDetail] = useState<string | null>(null);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const [barbersData, servicesData, settingsData, usersData] = await Promise.all([
        api.getBarbers(),
        api.getServices(),
        api.getSettings(),
        api.getUsers(),
      ]);
      setBarbers(barbersData);
      setServices(servicesData);
      setSettings(normalizeSettings(settingsData));
      if (usersData && usersData.length > 0) {
        setAvailableUsers(usersData);
        setCurrentUser((prev) => {
          const matched = usersData.find(
            (u) => u.id === prev.id || (prev.barberId && u.barberId === prev.barberId)
          );
          return matched || prev;
        });
      }
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      addToast({
        type: 'error',
        title: 'Falha de Conexão',
        message: 'Não foi possível carregar os dados do servidor.',
      });
    }
  }, [addToast]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const openNewAppointmentWith = (preselect?: {
    customerId?: string;
    barberId?: string;
    date?: string;
    time?: string;
  }) => {
    setNewAppointmentPreselect(preselect || null);
    setIsNewAppointmentOpen(true);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        availableUsers,
        activeTab,
        setActiveTab,
        barbers,
        services,
        settings,
        refreshAll,
        toasts,
        addToast,
        dismissToast,
        isNewAppointmentOpen,
        setIsNewAppointmentOpen,
        newAppointmentPreselect,
        openNewAppointmentWith,
        selectedCustomerIdForDetail,
        setSelectedCustomerIdForDetail,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
