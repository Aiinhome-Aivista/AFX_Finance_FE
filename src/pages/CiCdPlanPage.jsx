import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  GitBranch,
  ArrowRight,
  Copy,
  Check,
  Terminal,
  CheckCircle2,
  Server,
  Layers,
  ShieldCheck,
  Cpu,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import Layout from '../components/common/Layout'
import { useToast } from '../context/ToastContext'

export default function CiCdPlanPage() {
  const toast = useToast()
  const [copiedJenkins, setCopiedJenkins] = useState(false)

  const jenkinsfileCode = `// Jenkins Declarative Pipeline for AgentForgeX
pipeline {
    agent any

    environment {
        DOCKER_IMAGE_FE = "agentforgex/frontend"
        DOCKER_IMAGE_BE = "agentforgex/backend"
        DEPLOY_PORT_FE  = "5173"
        DEPLOY_PORT_BE  = "5008"
    }

    stages {
        stage('1. Checkout') {
            steps {
                echo 'Pulling latest code from GitHub main branch...'
                checkout scm
            }
        }

        stage('2. Build & Test') {
            parallel {
                stage('Frontend (React + Vite)') {
                    steps {
                        dir('AFX_Finance_FE') {
                            sh 'npm ci'
                            sh 'npm run build'
                        }
                    }
                }
                stage('Backend (FastAPI)') {
                    steps {
                        dir('AFX_Finance_BE') {
                            sh 'python -m venv venv'
                            sh '. venv/bin/activate && pip install -r requirements.txt'
                            sh '. venv/bin/activate && pytest tests/'
                        }
                    }
                }
            }
        }

        stage('3. Docker Build') {
            steps {
                echo 'Building Docker container images...'
                sh 'docker build -t $DOCKER_IMAGE_FE:latest ./AFX_Finance_FE'
                sh 'docker build -t $DOCKER_IMAGE_BE:latest ./AFX_Finance_BE'
            }
        }

        stage('4. Deploy') {
            steps {
                echo 'Deploying application containers...'
                sh 'docker-compose down && docker-compose up -d --build'
                echo 'Deployment successful! Application is live.'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Notification sent.'
        }
    }
}`

  const copyJenkinsfile = () => {
    navigator.clipboard.writeText(jenkinsfileCode)
    setCopiedJenkins(true)
    if (toast?.add) {
      toast.add('Jenkinsfile copied to clipboard!', 'success')
    }
    setTimeout(() => setCopiedJenkins(false), 2500)
  }

  const steps = [
    {
      num: '01',
      title: 'GitHub Repository',
      tool: 'GitHub',
      desc: 'Developer pushes code to the main branch or creates a pull request.',
      tag: 'Source',
      points: ['Main & staging branch', 'Automated GitHub Webhook trigger'],
    },
    {
      num: '02',
      title: 'Jenkins Trigger',
      tool: 'Jenkins CI',
      desc: 'Webhook triggers Jenkins pipeline job automatically on code push.',
      tag: 'Automation',
      points: ['GitHub integration plugin', 'Starts build executor immediately'],
    },
    {
      num: '03',
      title: 'Build & Test',
      tool: 'Node & Python',
      desc: 'Compiles React frontend with Vite and runs backend Python tests.',
      tag: 'Verification',
      points: ['Frontend: npm run build', 'Backend: pytest unit tests'],
    },
    {
      num: '04',
      title: 'Docker & Deploy',
      tool: 'Docker / Server',
      desc: 'Packages apps into Docker containers and restarts live services.',
      tag: 'Production',
      points: ['Docker image creation', 'Automated container restart'],
    },
  ]

  return (
    <Layout wide hideWorkflowBar hideNext>
      <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-medium text-ink">Architecture Plans</span>
            <span>/</span>
            <span className="text-[#10b981] font-semibold">CI/CD Deployment Plan</span>
          </div>
          <Link
            to="/security-plan"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface2 hover:bg-surface border border-line text-ink transition shadow-2xs"
          >
            <ShieldCheck size={13} className="text-indigo-400" />
            <span>Security Plan</span>
          </Link>
        </div>

        {/* Minimal Title Banner */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] text-xs font-semibold mb-2 border border-[#10b981]/25">
                <GitBranch size={13} />
                <span>GitHub + Jenkins Pipeline</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-ink">
                CI/CD Deployment Plan
              </h1>
              <p className="text-xs sm:text-sm text-muted mt-1">
                Automated continuous integration and deployment pipeline using <strong>GitHub</strong>, <strong>Jenkins</strong>, and <strong>Docker</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={copyJenkinsfile}
                className="btn-primary btn-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                {copiedJenkins ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedJenkins ? 'Copied Jenkinsfile' : 'Copy Jenkinsfile'}</span>
              </button>
            </div>
          </div>

          {/* Quick specs pill */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-line">
            <div className="p-2.5 rounded-xl bg-surface2 border border-line">
              <div className="text-[10px] font-bold uppercase text-muted">Source Code</div>
              <div className="text-xs font-bold text-ink mt-0.5">GitHub</div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface2 border border-line">
              <div className="text-[10px] font-bold uppercase text-muted">CI/CD Engine</div>
              <div className="text-xs font-bold text-ink mt-0.5">Jenkins Server</div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface2 border border-line">
              <div className="text-[10px] font-bold uppercase text-muted">Packaging</div>
              <div className="text-xs font-bold text-ink mt-0.5">Docker Containers</div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface2 border border-line">
              <div className="text-[10px] font-bold uppercase text-muted">Trigger Type</div>
              <div className="text-xs font-bold text-[#10b981] mt-0.5">GitHub Webhook (Push)</div>
            </div>
          </div>
        </div>

        {/* 4 Clean Steps Flow */}
        <div>
          <h2 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
            <span>Pipeline Deployment Flow</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {steps.map((st) => (
              <div
                key={st.num}
                className="rounded-2xl border border-line bg-surface p-4 flex flex-col justify-between shadow-2xs hover:border-[#10b981]/40 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-[#10b981] font-mono">{st.num}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface2 text-muted border border-line">
                      {st.tag}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-ink mb-1">{st.title}</div>
                  <p className="text-xs text-muted leading-relaxed mb-3">{st.desc}</p>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-line">
                  {st.points.map((p, i) => (
                    <div key={i} className="text-[11px] text-ink flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-[#10b981] shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Jenkinsfile Code Box */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Terminal size={15} className="text-[#10b981]" />
              <h3 className="text-xs font-bold text-ink">Jenkins Pipeline Script (`Jenkinsfile`)</h3>
            </div>
            <button
              type="button"
              onClick={copyJenkinsfile}
              className="text-xs text-[#10b981] hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              {copiedJenkins ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedJenkins ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-line bg-[#0d1117] p-4 font-mono text-xs text-gray-200 overflow-x-auto">
            <pre className="leading-relaxed">
              <code>{jenkinsfileCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </Layout>
  )
}
