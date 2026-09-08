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
          border: 'border-[#fdba74]',
          iconBg: 'bg-[#ffedd5] text-[#ea580c]',
          badge: 'text-[#ea580c]',
        };
      case 'warning':
        return {
          border: 'border-[#fde68a]',
          iconBg: 'bg-[#fef3c7] text-[#d97706]',
          badge: 'text-[#d97706]',
        };
      case 'safe':
        return {
          border: 'border-[#d9f99d]',
          iconBg: 'bg-[#f7fee7] text-[#65a30d]',
          badge: 'text-[#65a30d]',
        };
      default:
        return {
          border: 'border-[#ebdcc7]',
          iconBg: 'bg-[#fef3c7] text-[#b45309]',
          badge: 'text-[#b45309]',
        };
    }
  };

  const statusStyle = getStatusClasses();

  return (
    <div
      className={`p-5 rounded-2xl bg-white border ${statusStyle.border} shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative`}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl ${statusStyle.iconBg} flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex items-center gap-1.5">
          {item.trend && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-[#7a644c] font-mono">
              {item.trend.direction === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-[#ea580c]" />}
              {item.trend.direction === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-[#65a30d]" />}
              {item.trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5 text-[#998165]" />}
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
        <span className="text-xs font-bold text-[#7a644c] uppercase tracking-wider block font-mono">
          {item.label}
        </span>
        <div className="text-2xl font-black tracking-tight text-[#221207] mt-1">
          {item.value}
        </div>
        <p className="text-xs text-[#544230] mt-1 truncate" title={item.context}>
          {item.context}
        </p>
      </div>
    </div>
  );
}
