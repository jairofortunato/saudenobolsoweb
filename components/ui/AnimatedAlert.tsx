'use client';

import React, { useEffect, useState } from 'react';

interface AnimatedAlertProps {
  isVisible: boolean;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
  onHide?: () => void;
  className?: string;
}

export function AnimatedAlert({ 
  isVisible, 
  message, 
  type = 'success', 
  duration = 3000,
  onHide,
  className 
}: AnimatedAlertProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Start animation after a brief delay to ensure element is rendered
      setTimeout(() => setIsAnimatingIn(true), 10);
      
      // Auto-hide after duration
      const hideTimer = setTimeout(() => {
        setIsAnimatingOut(true);
        setTimeout(() => {
          setIsAnimatingIn(false);
          setShouldRender(false);
          setIsAnimatingOut(false);
          onHide?.();
        }, 300); // Animation out duration
      }, duration);

      return () => clearTimeout(hideTimer);
    } else {
      setIsAnimatingOut(true);
      setTimeout(() => {
        setIsAnimatingIn(false);
        setShouldRender(false);
        setIsAnimatingOut(false);
      }, 300);
    }
  }, [isVisible, duration, onHide]);

  if (!shouldRender) return null;

  const typeStyles = {
    success: 'bg-green-500 border-green-600 text-white',
    info: 'bg-blue-500 border-blue-600 text-white',
    warning: 'bg-yellow-500 border-yellow-600 text-white',
    error: 'bg-red-500 border-red-600 text-white'
  };

  const iconMap = {
    success: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    error: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div 
        className={`
          flex items-center gap-3 px-6 py-4 rounded-lg border-2 shadow-lg
          transition-all duration-300 ease-out
          ${typeStyles[type]}
          ${isAnimatingIn && !isAnimatingOut ? 
            'translate-y-0 opacity-100 scale-100' : 
            '-translate-y-8 opacity-0 scale-95'
          }
        `}
        style={{
          animation: isAnimatingIn && !isAnimatingOut ? 
            'bounceIn 0.6s ease-out' : 
            'fadeOut 0.3s ease-in'
        }}
      >
        <div className="flex-shrink-0">
          {iconMap[type]}
        </div>
        
        <div className="font-medium text-lg">
          {message}
        </div>
        
        {/* Animated checkmark or icon pulse */}
        {type === 'success' && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white animate-ping"></div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes bounceIn {
          0% {
            transform: translateY(-32px) translateX(-50%) scale(0.95);
            opacity: 0;
          }
          50% {
            transform: translateY(4px) translateX(-50%) scale(1.02);
            opacity: 0.8;
          }
          100% {
            transform: translateY(0) translateX(-50%) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes fadeOut {
          0% {
            transform: translateY(0) translateX(-50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-32px) translateX(-50%) scale(0.95);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
