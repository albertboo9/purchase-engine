"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, required, id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className="w-full flex flex-col gap-1.5 mb-4">
        <div className="flex justify-between items-center">
          <label 
            htmlFor={inputId} 
            className={cn(
              "text-sm font-medium transition-colors duration-200",
              isFocused ? "text-indigo-600" : "text-gray-700",
              error && "text-red-500"
            )}
          >
            {label} {required && <span className="text-red-400">*</span>}
          </label>
        </div>
        
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full px-4 py-3 rounded-2xl border bg-white transition-all duration-200 outline-none",
              "focus:ring-2 focus:ring-offset-0",
              error 
                ? "border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30" 
                : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100 hover:border-gray-300",
              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          
          {/* Subtle glow effect behind input when focused */}
          <AnimatePresence>
            {isFocused && !error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 -z-10 bg-blue-500/10 rounded-xl blur-md"
              />
            )}
          </AnimatePresence>
        </div>

        <div className="min-h-[20px]">
          <AnimatePresence mode="wait">
            {error ? (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm text-red-500 font-medium"
              >
                {error}
              </motion.p>
            ) : helperText ? (
              <motion.p
                key="helper"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-gray-500"
              >
                {helperText}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);
Input.displayName = "Input";
