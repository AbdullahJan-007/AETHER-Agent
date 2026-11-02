import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "outline";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  className = "",
  ...props
}) => {
  const baseStyles = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";

  const variantStyles = {
    default: "bg-[#1a1f2c] text-indigo-400 border border-indigo-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    destructive: "bg-red-500/10 text-red-400 border border-red-500/20",
    outline: "border border-[#242b3d] text-slate-400",
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};
