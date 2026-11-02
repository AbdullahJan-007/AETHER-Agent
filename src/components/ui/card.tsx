import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 1 | 2;
}

export const Card: React.FC<CardProps> = ({ elevation = 1, className = "", children, ...props }) => {
  const bgClass = elevation === 1 ? "bg-[#12151e]" : "bg-[#1a1f2c]";
  return (
    <div
      className={`rounded-xl border border-[#242b3d] shadow-sm ${bgClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
