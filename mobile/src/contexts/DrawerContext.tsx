import React, { createContext, useContext, useState, useCallback } from 'react';

interface DrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  pendingNavigation: string | null;
  clearPendingNavigation: () => void;
  navigateTo: (screen: string) => void;
}

const DrawerContext = createContext<DrawerContextType>({
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  pendingNavigation: null,
  clearPendingNavigation: () => {},
  navigateTo: () => {},
});

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const clearPendingNavigation = useCallback(() => setPendingNavigation(null), []);

  const navigateTo = useCallback((screen: string) => {
    setIsOpen(false);
    setTimeout(() => {
      setPendingNavigation(screen);
    }, 220);
  }, []);

  return (
    <DrawerContext.Provider value={{ isOpen, openDrawer, closeDrawer, pendingNavigation, clearPendingNavigation, navigateTo }}>
      {children}
    </DrawerContext.Provider>
  );
}

export const useDrawer = () => useContext(DrawerContext);
