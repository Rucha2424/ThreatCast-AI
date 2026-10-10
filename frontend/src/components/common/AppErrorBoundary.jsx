import React from 'react';

export default class AppErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen bg-soc-slate-50 p-8 text-soc-slate-900">
        <section className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-threatcast-card p-6 shadow-sm">
          <h1 className="text-lg font-bold">ThreatCast UI error</h1>
          <p className="mt-2 text-sm text-slate-600">A page component failed to render. The rest of the application is still available.</p>
          <pre className="mt-4 overflow-auto rounded-lg bg-slate-100 p-3 text-xs">{this.state.error?.message || 'Unknown React error'}</pre>
        </section>
      </main>
    );
  }
}
