import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const loadingVariants = cva(
  // Base styles with smooth animations
  "inline-block animate-spin rounded-full border-solid",
  {
    variants: {
      variant: {
        // Pastel color variants
        primary: "border-pink-200 border-t-pink-400",
        secondary: "border-blue-200 border-t-blue-400",
        success: "border-green-200 border-t-green-400",
        warning: "border-yellow-200 border-t-yellow-400",
        danger: "border-red-200 border-t-red-400",
        neutral: "border-slate-200 border-t-slate-400",
        lavender: "border-purple-200 border-t-purple-400",
      },
      size: {
        xs: "h-3 w-3 border-2",
        sm: "h-4 w-4 border-2",
        md: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-2",
        xl: "h-12 w-12 border-4",
        "2xl": "h-16 w-16 border-4",
      },
      speed: {
        slow: "animate-spin",
        normal: "animate-spin",
        fast: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      speed: "normal",
    },
  }
);

const dotVariants = cva(
  "inline-block rounded-full animate-pulse",
  {
    variants: {
      variant: {
        primary: "bg-pink-400",
        secondary: "bg-blue-400",
        success: "bg-green-400",
        warning: "bg-yellow-400",
        danger: "bg-red-400",
        neutral: "bg-slate-400",
        lavender: "bg-purple-400",
      },
      size: {
        xs: "h-1 w-1",
        sm: "h-1.5 w-1.5",
        md: "h-2 w-2",
        lg: "h-3 w-3",
        xl: "h-4 w-4",
        "2xl": "h-5 w-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface LoadingProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingVariants> {
  type?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  overlay?: boolean;
  fullScreen?: boolean;
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ 
    className, 
    variant, 
    size, 
    speed,
    type = 'spinner',
    text,
    overlay = false,
    fullScreen = false,
    ...props 
  }, ref) => {
    const SpinnerComponent = () => (
      <div
        className={cn(
          loadingVariants({ variant, size, speed }),
          speed === "fast" && "animate-[spin_0.6s_linear_infinite]",
          className
        )}
      />
    );

    const DotsComponent = () => (
      <div className="flex space-x-1">
        <div 
          className={cn(
            dotVariants({ variant, size }),
            "animate-[pulse_1.4s_ease-in-out_infinite]"
          )} 
        />
        <div 
          className={cn(
            dotVariants({ variant, size }),
            "animate-[pulse_1.4s_ease-in-out_0.2s_infinite]"
          )} 
        />
        <div 
          className={cn(
            dotVariants({ variant, size }),
            "animate-[pulse_1.4s_ease-in-out_0.4s_infinite]"
          )} 
        />
      </div>
    );

    const PulseComponent = () => (
      <div className="flex space-x-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl animate-pulse",
              variant === "primary" && "bg-pink-200",
              variant === "secondary" && "bg-blue-200", 
              variant === "success" && "bg-green-200",
              variant === "warning" && "bg-yellow-200",
              variant === "danger" && "bg-red-200",
              variant === "neutral" && "bg-slate-200",
              variant === "lavender" && "bg-purple-200",
              size === "xs" && "h-8 w-2",
              size === "sm" && "h-10 w-2.5",
              size === "md" && "h-12 w-3",
              size === "lg" && "h-16 w-4",
              size === "xl" && "h-20 w-5",
              size === "2xl" && "h-24 w-6"
            )}
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: '0.9s'
            }}
          />
        ))}
      </div>
    );

    const LoadingContent = () => (
      <div className="flex flex-col items-center justify-center space-y-3">
        {type === 'spinner' && <SpinnerComponent />}
        {type === 'dots' && <DotsComponent />}
        {type === 'pulse' && <PulseComponent />}
        
        {text && (
          <p className="text-sm text-slate-600 font-medium animate-pulse">
            {text}
          </p>
        )}
      </div>
    );

    if (fullScreen) {
      return (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
          ref={ref}
          {...props}
        >
          <LoadingContent />
        </div>
      );
    }

    if (overlay) {
      return (
        <div 
          className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-3xl"
          ref={ref}
          {...props}
        >
          <LoadingContent />
        </div>
      );
    }

    return (
      <div 
        ref={ref}
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        <LoadingContent />
      </div>
    );
  }
);

Loading.displayName = "Loading";

export { Loading, loadingVariants }; 