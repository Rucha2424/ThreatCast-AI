import React from 'react';
import {
  ShieldAlert,
  TrendingUp,
  Server,
  Sparkles,
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import InfoTooltip from '../common/InfoTooltip';

const ICON_LOOKUP = {
  'kpi-threats': ShieldAlert,
  'kpi-forecast': TrendingUp,
  'kpi-nodes': Server,
  'kpi-confidence': Sparkles,
  'kpi-disagreement': GitCompare,
};

const KPI_EXPLANATIONS = {
  'kpi-threats': {
    title: 'Active Threats Count',
    what: 'Total number of active attack vectors and anomalous behaviors currently detected across network subnets.',
    why: 'Indicates the scope of ongoing adversary operations that require immediate SOC containment.',
    interpretation: '0 = Normal baseline, 1-2 = Active intrusion under tracking, 3+ = Critical multi-host breach wave.',
    technical: 'Calculated from active event clusters and anomalous socket connections.',
  },
  'kpi-forecast': {
    title: 'Next Predicted Attack State (T+1)',
    what: 'The most probable next MITRE ATT&CK tactic predicted by ThreatCast AI across the temporal graph.',
    why: 'Enables proactive pre-emption: defenders can lock down target assets before the adversary pivots.',
    interpretation: 'Shows the next technique the attacker will attempt once the current state succeeds.',
    technical: 'Output of the LSTM-B Graph FastRP temporal sequence decoder.',
  },
  'kpi-nodes': {
    title: 'High-Risk Network Assets',
    what: 'Count of endpoints, servers, or databases with calculated risk scores exceeding 75/100.',
    why: 'These systems are either actively compromised or situated in the shortest-path traversal vector.',
    interpretation: 'High-risk assets should be pre-emptively quarantined or put under heightened monitoring.',
    technical: 'Combines node degree centrality, anomaly frequency, and authentication telemetry.',
  },
  'kpi-confidence': {
    title: 'Forecast Confidence Level',
    what: 'The statistical probability score assigned by the AI model to the predicted multi-step trajectory.',
    why: 'High confidence (>85%) provides strong justification for automated defensive playbooks.',
    interpretation: 'Higher is better. High confidence reflects dense topological and historical pattern matches.',
    technical: 'Softmax probability output from the LSTM-B graph embedding layer.',
  },
  'kpi-disagreement': {
    title: 'Model-Rule Disagreements',
    what: 'Instances where ThreatCast AI detected an attack progression that legacy static firewall/SIEM rules missed.',
    why: 'Traditional rules rely on static thresholds, whereas Graph AI sees relationship context across subnets.',
    interpretation: 'Highlights stealthy multi-hop attacks that evade traditional perimeter rules.',
    technical: 'Boolean divergence between heuristic rule triggers and FastRP topological embedding vectors.',
  },
};

export default function KpiCard({ item }) {
  if (!item) return null;

  const Icon = ICON_LOOKUP[item.id] || ShieldAlert;
  const explainer = KPI_EXPLANATIONS[item.id] || {
    title: item.label,
    what: item.context,
    why: 'Monitors overall network security status.',
    interpretation: 'Evaluates real-time SOC health.',
  };

  const getStatusClasses = () => {
    switch (item.status) {
      case 'danger':
        return {
          border: 'border-rose-500/30',
          iconBg: 'bg-rose-500/15 text-rose-400',
          badge: 'text-rose-400',
        };
      case 'warning':
        return {
          border: 'border-amber-500/30',
          iconBg: 'bg-amber-500/15 text-amber-400',
          badge: 'text-amber-400',
        };
      case 'safe':
        return {
          border: 'border-emerald-500/30',
          iconBg: 'bg-emerald-500/15 text-emerald-400',
          badge: 'text-emerald-400',
        };
      default:
        return {
          border: 'border-sky-500/30',
          iconBg: 'bg-sky-500/15 text-sky-400',
          badge: 'text-sky-400',
        };
    }
  };

  const statusStyle = getStatusClasses();

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      className={`p-5 rounded-2xl bg-cyber-surface border ${statusStyle.border} shadow-soc-card flex flex-col justify-between group relative`}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl ${statusStyle.iconBg} flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex items-center gap-1.5">
          {item.trend && (
            <div className="flex items-center gap-1 text-2xs sm:text-xs font-medium text-slate-400 font-mono">
              {item.trend.direction === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />}
              {item.trend.direction === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />}
              {item.trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
              <span>{item.trend.value}</span>
            </div>
          )}
          <InfoTooltip
            title={explainer.title}
            whatItMeasures={explainer.what}
            whyItMatters={explainer.why}
            interpretation={explainer.interpretation}
            technicalNote={explainer.technical}
            size="sm"
            align="right"
          />
        </div>
      </div>

      <div>
        <span className="text-2xs sm:text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">
          {item.label}
        </span>
        <div className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
          {item.value}
        </div>
        <p className="text-xs text-slate-400 mt-1 truncate" title={item.context}>
          {item.context}
        </p>
      </div>
    </motion.div>
  );
}
