import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import AlertModal from '@/components/ui/AlertModal';

type AlertType = 'alert' | 'confirm';

interface AlertState {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string;
}

interface AlertContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AlertState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: ''
  });
  
  const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void, dismissible?: boolean } | null>(null);

  const showAlert = useCallback((message: string, title: string = 'Aviso') => {
    return new Promise<void>((resolve) => {
      setState({ isOpen: true, type: 'alert', title, message });
      setResolver({ resolve: () => resolve() });
    });
  }, []);

  const showConfirm = useCallback((message: string, title: string = 'Confirmación') => {
    return new Promise<boolean>((resolve) => {
      setState({ isOpen: true, type: 'confirm', title, message });
      setResolver({ resolve });
    });
  }, []);

  const handleConfirm = () => {
    setState(prev => ({ ...prev, isOpen: false }));
    if (resolver) resolver.resolve(true);
  };

  const handleCancel = () => {
    setState(prev => ({ ...prev, isOpen: false }));
    if (resolver) resolver.resolve(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertModal
        isOpen={state.isOpen}
        type={state.type}
        title={state.title}
        message={state.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
