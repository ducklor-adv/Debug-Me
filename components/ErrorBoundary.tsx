import React from 'react';
import { track } from '../firebase';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    track('app_error', {
      message: error.message,
      stack: error.stack?.slice(0, 500),
      componentStack: info.componentStack?.slice(0, 500),
    });
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="text-5xl mb-3">😵</div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">แอปมีปัญหา</h1>
            <p className="text-sm text-slate-600 mb-4">
              เกิดข้อผิดพลาดที่ไม่คาดคิด ลองโหลดใหม่ดู
            </p>
            <p className="text-xs text-slate-400 mb-4 font-mono break-words">
              {this.state.error.message}
            </p>
            <button
              onClick={this.handleReload}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl transition-colors"
            >
              โหลดใหม่
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
