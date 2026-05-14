import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from './components/Toast';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showNotification = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <NotificationContext.Provider value={showNotification}>
      {children}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideNotification} />}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
