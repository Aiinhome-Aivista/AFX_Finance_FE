import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Lock,
  UserCheck,
  Database,
  CheckCircle2,
  GitBranch,
  KeyRound,
  FileCheck2,
} from 'lucide-react'
import Layout from '../components/common/Layout'

export default function SecurityPlanPage() {
  const securityPillars = [
    {
      title: 'Authentication & Access Control',
      icon: UserCheck,
      desc: 'Secure token authentication with strict role-based permissions.',
      points: [
        'Short-lived JWT tokens with HTTP-only secure cookies',
        'Role-Based Access Control: Data Architect vs Data Analyst',
        'Automatic session timeout on inactivity',
      ],
    },
    {
      title: 'Data Protection & Isolation',
      icon: Database,
      desc: 'Complete data isolation per financial workspace.',
      points: [
        'Dedicated database partition per workspace twin',
        'AES-256 encryption at rest for stored records',
        'Encrypted TLS 1.3 connection for all API calls',
      ],
    },
    {
      title: 'Input & Telemetry Validation',
      icon: Lock,
      desc: 'Strict sanitization of uploaded financial CSV files.',
      points: [
        'CSV file format & schema header verification',
        'Formula injection and SQL injection prevention',
        'File size cap enforced (max 100MB)',
      ],
    },
    {
      title: 'Audit & Compliance Logging',
      icon: FileCheck2,
      desc: 'Traceability and accountability across all operations.',
      points: [
        'Append-only audit logs for domain & model edits',
        'Timestamped records of all data ingestion events',
        'Zero cross-workspace data leakage guarantee',
      ],
    },
  ]

  return (
    <Layout wide hideWorkflowBar hideNext>
      <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-medium text-ink">Architecture Plans</span>
            <span>/</span>
            <span className="text-[#10b981] font-semibold">Application Security</span>
          </div>
          <Link
            to="/cicd-plan"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface2 hover:bg-surface border border-line text-ink transition shadow-2xs"
          >
            <GitBranch size={13} className="text-[#10b981]" />
            <span>Switch to Deployment</span>
          </Link>
        </div>

        {/* Minimal Banner */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-semibold mb-2 border border-indigo-500/25">
            <ShieldCheck size={13} />
            <span>Application Security & Data Privacy</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            Application Security
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Core security standards ensuring financial data confidentiality, workspace isolation, and safe operation.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-line">
            <div className="p-2.5 rounded-xl bg-surface2 border border-line">
              <div className="text-[10px] font-bold uppercase text-muted">Encryption</div>
              <div className="text-xs font-bold text-ink mt-0.5">AES-256 & TLS 1.3</div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface2 border border-line">
              <div className="text-[10px] font-bold uppercase text-muted">Auth Standard</div>
              <div className="text-xs font-bold text-ink mt-0.5">JWT Tokens + Cookies</div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface2 border border-line">
              <div className="text-[10px] font-bold uppercase text-muted">Access Control</div>
              <div className="text-xs font-bold text-[#10b981] mt-0.5">Role-Based (RBAC)</div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface2 border border-line">
              <div className="text-[10px] font-bold uppercase text-muted">Data Isolation</div>
              <div className="text-xs font-bold text-[#10b981] mt-0.5">Workspace-Level</div>
            </div>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {securityPillars.map((p, idx) => {
            const Icon = p.icon
            return (
              <div
                key={idx}
                className="rounded-2xl border border-line bg-surface p-5 shadow-2xs hover:border-[#10b981]/40 transition"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
                    <Icon size={16} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">{p.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-muted mb-3 leading-relaxed">{p.desc}</p>
                <div className="space-y-1.5 pt-3 border-t border-line">
                  {p.points.map((pt, i) => (
                    <div key={i} className="text-[11px] text-ink flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-[#10b981] shrink-0" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
