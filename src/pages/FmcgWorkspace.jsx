import { ArrowLeft, Package, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/common/Layout'

export default function FmcgWorkspace() {
  const nav = useNavigate()
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <button
          type="button"
          onClick={() => nav('/apps')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-mute hover:text-ink mb-6 cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Model Selection
        </button>

        <div className="card p-8 text-center border border-line bg-surface">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#10b981]/12 border border-[#10b981]/30 flex items-center justify-center text-[#10b981] mb-4">
            <Package size={24} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface2 border border-line text-[11px] font-semibold text-mute mb-3">
            <Sparkles size={12} className="text-[#10b981]" /> FMCG Domain Pack
          </div>
          <h1 className="text-2xl font-bold text-ink">FMCG Models Workspace</h1>
          <p className="text-sm text-mute mt-2 max-w-lg mx-auto">
            Fast-moving consumer goods supply-chain, trade promotions, route-to-market, and retail execution knowledge graphs are currently being provisioned for this workspace.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => nav('/apps')}
              className="btn-primary text-xs px-4 py-2"
            >
              Return to Model Selection
            </button>
            <button
              type="button"
              onClick={() => nav('/finance')}
              className="btn-secondary text-xs px-4 py-2"
            >
              Open Finance Models
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

