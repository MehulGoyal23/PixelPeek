import React from 'react';
import { Shield, ExternalLink, AlertTriangle, Crosshair, Eye } from 'lucide-react';
import { MitreAttackMapping } from '../types';

interface MitrePanelProps {
  mappings: MitreAttackMapping[];
}

const TACTIC_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  'Defense Evasion': {
    color: 'var(--mitre-defense-evasion)',
    icon: <Eye size={12} />,
  },
  'Command and Control': {
    color: 'var(--mitre-c2)',
    icon: <Crosshair size={12} />,
  },
  'Exfiltration': {
    color: 'var(--mitre-exfiltration)',
    icon: <AlertTriangle size={12} />,
  },
};

const CONFIDENCE_CONFIG: Record<string, { color: string; label: string }> = {
  High: { color: '#ef4444', label: 'HIGH' },
  Medium: { color: '#f59e0b', label: 'MED' },
  Low: { color: '#6b7280', label: 'LOW' },
};

export const MitrePanel: React.FC<MitrePanelProps> = ({ mappings }) => {
  if (!mappings || mappings.length === 0) {
    return null;
  }

  // Group mappings by tactic
  const tacticGroups: Record<string, MitreAttackMapping[]> = {};
  mappings.forEach(m => {
    if (!tacticGroups[m.tactic]) {
      tacticGroups[m.tactic] = [];
    }
    tacticGroups[m.tactic].push(m);
  });

  return (
    <div className="mitre-panel">
      <div className="mitre-header">
        <Shield size={16} className="mitre-header-icon" />
        <span className="mitre-header-title">MITRE ATT&CK Mapping</span>
        <span className="mitre-header-count">{mappings.length} technique{mappings.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="mitre-tactic-groups">
        {Object.entries(tacticGroups).map(([tactic, techniques]) => {
          const config = TACTIC_CONFIG[tactic] || {
            color: 'var(--text-muted)',
            icon: <Shield size={12} />,
          };

          return (
            <div key={tactic} className="mitre-tactic-group">
              {/* Tactic Header */}
              <div className="mitre-tactic-badge" style={{ '--tactic-color': config.color } as React.CSSProperties}>
                {config.icon}
                <span>{tactic}</span>
              </div>

              {/* Technique Cards */}
              <div className="mitre-technique-list">
                {techniques.map((technique) => {
                  const conf = CONFIDENCE_CONFIG[technique.confidence] || CONFIDENCE_CONFIG.Low;

                  return (
                    <div key={technique.id} className="mitre-technique-card" style={{ borderLeftColor: config.color }}>
                      <div className="technique-card-header">
                        <div className="technique-id-group">
                          <span className="technique-id">{technique.id}</span>
                          <span
                            className="technique-confidence"
                            style={{ '--conf-color': conf.color } as React.CSSProperties}
                          >
                            {conf.label}
                          </span>
                        </div>
                        <a
                          href={technique.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="technique-link"
                          title="View on MITRE ATT&CK"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <div className="technique-name">{technique.name}</div>
                      <div className="technique-description">{technique.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
