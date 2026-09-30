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
    // You can log error info here or send to a service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleClearDataAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error("Failed to clear storage:", e);
    }
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-6 font-mono text-2xl font-bold">
              !
            </div>
            <h1 className="text-2xl font-black mb-2 text-white">Something went wrong</h1>
            <p className="text-sm text-slate-400 mb-6">
              {this.state.error?.message || "An unexpected application error occurred."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-sm transition"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
              <button
                type="button"
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 font-semibold rounded-xl text-sm text-slate-300 transition"
                onClick={this.handleClearDataAndReload}
              >
                Clear Data & Reload
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
