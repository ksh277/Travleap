"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Dialog Context
interface DialogContextType {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a Dialog');
  }
  return context;
};

// Dialog Root
export const Dialog: React.FC<{ 
  children: React.ReactNode; 
  open?: boolean; 
  onOpenChange?: (open: boolean) => void;
}> = ({ children, open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <DialogContext.Provider value={{ isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

// Dialog Trigger
export const DialogTrigger: React.FC<{ 
  children: React.ReactNode; 
  asChild?: boolean; 
}> = ({ children, asChild = false }) => {
  const { onOpenChange } = useDialog();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenChange(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
    } as any);
  }

  return (
    <button onClick={handleClick}>
      {children}
    </button>
  );
};

// Dialog Content
export const DialogContent: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
}> = ({ children, className = '' }) => {
  const { isOpen, onOpenChange } = useDialog();


  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // 원래 overflow 값을 저장
      const originalOverflow = document.body.style.overflow;

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // 원래 값으로 복원 (빈 문자열이면 CSS 기본값으로 돌아감)
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const dialogContent = (
    <div
      style={{
        position: 'fixed',
        inset: '0',
        zIndex: '9999999',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          outline: 'none',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          animation: 'scaleIn 0.2s ease-out',
        }}
        className={className}
      >
        {children}
      </div>
    </div>
  );

  // Portal로 body에 렌더링
  if (typeof document !== 'undefined') {
    return createPortal(dialogContent, document.body);
  }

  return dialogContent;
};

// Dialog Header
export const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '16px',
    paddingRight: '40px'
  }}>
    {children}
  </div>
);

// Dialog Title
export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 style={{
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 10px 0',
    color: '#111827'
  }}>
    {children}
  </h2>
);

// Dialog Description
export const DialogDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{
    fontSize: '14px',
    color: '#6b7280',
    margin: '0'
  }}>
    {children}
  </p>
);

// Dialog Footer
export const DialogFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '16px',
    marginTop: '32px',
    paddingTop: '20px',
    borderTop: '2px solid #eee'
  }}>
    {children}
  </div>
);

// Dialog Close
export const DialogClose: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { onOpenChange } = useDialog();

  return (
    <button
      onClick={() => {
        onOpenChange(false);
      }}
    >
      {children}
    </button>
  );
};