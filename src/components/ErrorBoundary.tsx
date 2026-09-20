import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[360px] h-full p-8 text-center select-none">
          <div className="max-w-md w-full p-6 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/15 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4 text-xl">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              {this.props.fallbackTitle || '页面遇到了一点问题'}
            </h2>
            <p className="text-xs text-white/50 mb-6 line-clamp-3 font-mono bg-black/20 p-2.5 rounded-lg text-left break-all">
              {this.state.error?.message || '未知渲染异常'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
              >
                尝试恢复
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--theme-accent,#22d3ee)] hover:opacity-90 text-slate-900 transition-all font-bold shadow-lg"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
