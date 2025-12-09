"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Link } from "react-router-dom";

type State = {
  hasError: boolean;
  error?: Error;
  info?: { componentStack: string };
};

class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log for debugging; still avoid crashing the whole app
    console.error("ErrorBoundary caught error:", error, info);
    this.setState({ info: { componentStack: info.componentStack } });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || "An unexpected error occurred.";
    const stack = this.state.error?.stack || this.state.info?.componentStack || "";

    return (
      <div className="w-full min-h-[40vh] flex flex-col items-center justify-center rounded-lg border bg-muted/30 p-6">
        <div className="flex items-center gap-2 mb-3 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span className="font-semibold">Something went wrong</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4 max-w-2xl text-center break-words">
          {message}
        </p>
        {stack && (
          <pre className="text-xs text-muted-foreground bg-background border rounded-md p-3 max-w-3xl w-full overflow-auto mb-4">
            {stack}
          </pre>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={this.handleReload}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload
          </Button>
          <Button asChild>
            <Link to="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;