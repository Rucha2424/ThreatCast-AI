import React, { Suspense, useEffect, useState, Component } from 'react';

class ThreeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('3D Canvas encountered a render error, falling back:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-cyber-bg/50 text-slate-400 text-xs font-mono">
          [3D Visualization Acceleration Standby]
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ThreeCanvasWrapper({ children, className = '' }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (prefersReducedMotion) {
    return (
      <div className={`w-full h-full bg-gradient-to-br from-cyber-bg via-slate-900 to-cyber-bg ${className}`} />
    );
  }

  return (
    <ThreeErrorBoundary>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-transparent">
            <div className="w-6 h-6 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
          </div>
        }
      >
        <div className={`w-full h-full relative ${className}`}>
          {children}
        </div>
      </Suspense>
    </ThreeErrorBoundary>
  );
}
