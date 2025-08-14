import React, { createContext, useContext, useState, useEffect } from 'react';

const ViewModeContext = createContext();

export const ViewModeProvider = ({ children }) => {
  const [viewMode, setViewMode] = useState('auto'); // 'desktop', 'mobile', 'auto'
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Get saved preference from localStorage
    const savedViewMode = localStorage.getItem('nutriai_view_mode') || 'auto';
    setViewMode(savedViewMode);
    
    // Detect screen size
    const checkScreenSize = () => {
      const isMobileSize = window.innerWidth < 768;
      setIsMobile(isMobileSize);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('nutriai_view_mode', mode);
  };

  const getEffectiveViewMode = () => {
    if (viewMode === 'auto') {
      return isMobile ? 'mobile' : 'desktop';
    }
    return viewMode;
  };

  return (
    <ViewModeContext.Provider value={{
      viewMode,
      effectiveViewMode: getEffectiveViewMode(),
      isMobile,
      changeViewMode,
      isDesktopMode: getEffectiveViewMode() === 'desktop',
      isMobileMode: getEffectiveViewMode() === 'mobile'
    }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}; 