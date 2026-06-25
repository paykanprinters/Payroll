"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { showError } from "@/utils/toast";
import { recordSystemError } from "@/lib/audit-trail";

type Props = {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  error?: Error;
};

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, info);
    void recordSystemError(error.message || "React render error", {
      componentStack: info.componentStack,
      boundary: this.props.fallbackTitle,
    });
    showError("Something went wrong. Please try again.");
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border rounded-md bg-red-50 text-red-800">
          <div className="font-semibold mb-2">
            {this.props.fallbackTitle || "An error occurred"}
          </div>
          <div className="text-sm mb-3">
            We couldn’t render this section. Try again or refresh the page.
          </div>
          <Button variant="outline" onClick={this.handleReset}>
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;