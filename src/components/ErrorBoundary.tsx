'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Dumbbell, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in Gym Logger:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-lg min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-bgPrimary text-center">
          <div className="flex flex-col items-center gap-4 max-w-xs">
            <div className="p-4 bg-danger/10 text-danger rounded-full animate-pulse-ring">
              <Dumbbell className="w-10 h-10 rotate-45" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-textPrimary">
              Something went wrong.
            </h2>
            <p className="text-xs text-textSecondary leading-relaxed">
              We encountered an unexpected error while tracking your session. Let's get you back on track.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full mt-2 bg-accent hover:bg-accentHover text-bgPrimary font-extrabold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 active-scale shadow-md cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Reload Workout
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
