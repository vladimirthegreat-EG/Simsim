"use client";

import { motion } from "framer-motion";
import { Loader2, RefreshCw } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2 className={`animate-spin text-purple-400 ${sizes[size]} ${className}`} />
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-slate-300 mt-3">{message}</p>
      </div>
    </motion.div>
  );
}

interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message = "Loading..." }: LoadingPageProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-10 h-10 text-purple-400 mx-auto" />
        </motion.div>
        <p className="text-white mt-4 text-lg">{message}</p>
      </motion.div>
    </div>
  );
}

interface LoadingCardProps {
  title?: string;
  className?: string;
}

export function LoadingCard({ title, className }: LoadingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`bg-slate-800 border border-slate-700 rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-center gap-3">
        <LoadingSpinner />
        <span className="text-slate-300">{title || "Loading..."}</span>
      </div>
    </motion.div>
  );
}

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function LoadingButton({ loading, children, loadingText }: LoadingButtonProps) {
  return (
    <>
      {loading ? (
        <span className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          {loadingText || "Loading..."}
        </span>
      ) : (
        children
      )}
    </>
  );
}

// Pulse dots loading indicator
export function LoadingDots() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-purple-400 rounded-full"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

// Progress indicator for multi-step processes
interface LoadingProgressProps {
  current: number;
  total: number;
  label?: string;
}

export function LoadingProgress({ current, total, label }: LoadingProgressProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="space-y-2">
      {label && <p className="text-sm text-slate-400">{label}</p>}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="text-xs text-slate-500 text-right">
        {current} / {total} ({percentage}%)
      </p>
    </div>
  );
}
