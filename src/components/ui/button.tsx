import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const sizeStyles = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-3.5 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
    icon: "p-2 text-sm",
  };

  const variantStyles = {
    primary:
      "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-500/20 active:scale-[0.98]",
    secondary:
      "bg-[#1a1f2c] hover:bg-[#222838] text-slate-200 border border-[#242b3d] active:scale-[0.98]",
    destructive:
      "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 active:scale-[0.98]",
    outline:
      "bg-transparent hover:bg-[#1a1f2c] text-slate-300 border border-[#242b3d] active:scale-[0.98]",
    ghost:
      "bg-transparent hover:bg-[#1a1f2c] text-slate-400 hover:text-slate-200 active:scale-[0.98]",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
      {children}
    </button>
  );
};
