import React, { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

/**
 * startOnboardingTour — Lightweight 5-step interactive navigation & discovery guide.
 * Strictly used for orientation and workflow discovery, NOT as a replacement for in-UI explanations.
 */
export function startOnboardingTour() {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayColor: 'rgba(34, 18, 7, 0.65)',
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Start Exploring',
    steps: [
      {
        element: '#tour-overview-header',
        popover: {
          title: 'Welcome to ThreatCast AI',
          description:
            'ThreatCast is an intelligent early-warning SOC platform that anticipates multi-step cyber attacks before they reach critical enterprise assets.',
          position: 'bottom',
        },
      },
      {
        element: '#tour-security-posture',
        popover: {
          title: 'Current Security Posture & Forecast',
          description:
            'Here the AI explains the current observed threat state and predicts the likely next transition (T+1) with calculated confidence.',
          position: 'bottom',
        },
      },
      {
        element: '#tour-kpi-grid',
        popover: {
          title: 'Key Security Indicators',
          description:
            'Track active threats, high-risk assets, and model-rule conflicts. Tap the ⓘ icon on any metric to view what it measures and why it matters.',
          position: 'bottom',
        },
      },
      {
        element: '#tour-forecast-timeline',
        popover: {
          title: 'K=3 Attack Progression Timeline',
          description:
            'Our flagship innovation: Steps through the current state (T_0) and projects the next 3 attack steps (T+1, T+2, T+3) using Graph FastRP neural models.',
          position: 'top',
        },
      },
      {
        element: '#tour-sim-trigger',
        popover: {
          title: 'Simulate Live Attack Scenarios',
          description:
            'Test ThreatCast against realistic attack scenarios (Lateral Movement, Data Exfiltration, Ransomware) to observe predictive early warning in real time.',
          position: 'left',
        },
      },
    ],
    onDestroyed: () => {
      try {
        localStorage.setItem('threatcast_tour_completed', 'true');
      } catch (e) {
        // ignore storage errors
      }
    },
  });

  driverObj.drive();
}

/**
 * Auto-trigger tour only for first-time visitors on mount
 */
export default function OnboardingTour() {
  useEffect(() => {
    try {
      const hasCompleted = localStorage.getItem('threatcast_tour_completed');
      if (!hasCompleted) {
        // Small delay to ensure DOM elements are rendered
        const timer = setTimeout(() => {
          startOnboardingTour();
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  return null;
}
