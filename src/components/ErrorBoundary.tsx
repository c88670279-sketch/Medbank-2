import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[React Error Boundary Caught Error]:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 text-left">
          <div className="bg-white dark:bg-[#18181b] border border-red-100 dark:border-red-950/30 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-lg space-y-6">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 bg-red-50 dark:bg-red-950/20 rounded-xl">
                <AlertCircle className="h-6 w-6 shrink-0" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider">React Runtime Exception</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">The application encountered an unexpected UI crash.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Error Details</span>
              <p className="font-mono text-[11px] text-red-600 dark:text-red-400 break-all whitespace-pre-wrap leading-relaxed font-bold">
                {this.state.error?.toString()}
              </p>
              {this.state.errorInfo?.componentStack && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Component Stack</span>
                  <pre className="font-mono text-[9px] text-slate-500 dark:text-zinc-500 max-h-40 overflow-y-auto whitespace-pre-wrap leading-tight">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reload Application</span>
              </button>
              
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.href = '/';
                }}
                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
