import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              !
            </div>
            <h1 className="text-2xl font-black mb-2 text-white">Something went wrong</h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred while rendering the application."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white text-sm transition shadow-lg shadow-emerald-600/20"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
              <button
                type="button"
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-slate-300 text-sm transition border border-slate-700"
                onClick={() => {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                  } catch (e) {
                    console.error("Failed to clear site storage:", e);
                  }
                  window.location.reload();
                }}
              >
                Clear Storage & Reload
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
