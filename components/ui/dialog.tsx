"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

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
    console.log('Dialog handleOpenChange:', newOpen);
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
    console.log('DialogTrigger 클릭됨');
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

  useEffect(() => {
    console.log('DialogContent isOpen:', isOpen);
  }, [isOpen]);

  if (!isOpen) {
    console.log('DialogContent: Dialog가 열려있지 않음');
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
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: '0',
        zIndex: '999998',
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
        console.log('DialogClose 버튼 클릭됨');
        onOpenChange(false);
      }}
    >
      {children}
    </button>
  );
};