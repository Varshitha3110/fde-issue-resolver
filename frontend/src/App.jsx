import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Cpu, Database, FileText, Send, CheckCircle2,
  AlertTriangle, Clock, DollarSign, Sparkles, Activity, Layers
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const SCENARIOS = [
  {
    label: 'VIP Payment Deducted / Unconfirmed',
    orderId: 'ORD-1001',
    complaint: 'My payment of $650 was deducted an hour ago, but my order still shows unconfirmed! Fix this immediately.'
  },
  {
    label: 'Standard Payment Failed',
    orderId: 'ORD-1002',
    complaint: 'Why was my order cancelled? I tried paying $45 earlier and it failed.'
  },
  {
    label: 'Order Already Shipped Inquiry',
    orderId: 'ORD-1003',
    complaint: 'Can you confirm if my $120 order went through? I need it before Friday.'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('workbench');
  const [orderId, setOrderId] = useState(SCENARIOS[0].orderId);
  const [complaint, setComplaint] = useState(SCENARIOS[0].complaint);
  const [loading, setLoading] = useState(false);
  const [triageData, setTriageData] = useState(null);
  const [editedReply, setEditedReply] = useState('');
  const [approvedBanner, setApprovedBanner] = useState(null);
  const [telemetry, setTelemetry] = useState({ summary: {}, logs: [] });
  const [policiesText, setPoliciesText] = useState('');
  const [error, setError] = useState(null);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch(`${API_BASE}/logs`);
      const data = await res.json();
      setTelemetry(data);
    } catch (e) {
      console.error('Failed to fetch telemetry', e);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    fetch(`${API_BASE}/policies`)
      .then((r) => r.json())
      .then((d) => setPoliciesText(d.content))
      .catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setApprovedBanner(null);
    try {
      const res = await fetch(`${API_BASE}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, complaint })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTriageData(data);
      setEditedReply(data.result.customer_response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!triageData) return;
    const { result, metrics } = triageData;
    const payload = {
      order_id: orderId,
      complaint,
      category: result.category,
      priority: result.priority,
      sentiment: result.sentiment,
      assigned_queue: result.assigned_queue,
      sop_cited: result.sop_cited,
      ai_draft: result.customer_response,
      final_approved_response: editedReply,
      latency_ms: metrics.latency_ms,
      input_tokens: metrics.input_tokens,
      output_tokens: metrics.output_tokens,
      estimated_cost_usd: metrics.estimated_cost_usd
    };
    const res = await fetch(`${API_BASE}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setApprovedBanner(`Ticket approved & logged. Human Edit Distance: ${(data.edit_ratio * 100).toFixed(1)}%`);
    fetchTelemetry();
  };

  const priorityBadge = (priority) => {
    const styles = {
      Critical: 'bg-red-50 text-red-700 border-red-200',
      High: 'bg-amber-50 text-amber-700 border-amber-200',
      Medium: 'bg-blue-50 text-blue-700 border-blue-200',
      Low: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return styles[priority] || styles.Medium;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Enterprise Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 leading-tight">
                AcmeOps Issue Resolver
              </h1>
              <p className="text-xs text-slate-500">
                Amazon Bedrock • Nova Pro + Titan Embeddings v2
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('workbench')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'workbench'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agent Workbench
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${
                activeTab === 'telemetry'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FDE Telemetry
              <span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">
                {telemetry.summary?.total || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'policies'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SOP Knowledge Base
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AWS Bedrock Local Connected
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeTab === 'workbench' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Ticket Intake & Agent Execution Trace */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    1. Customer Ticket Intake
                  </h2>
                </div>

                {/* Preset Scenario Pills */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Workshop Test Scenarios
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SCENARIOS.map((s) => (
                      <button
                        key={s.orderId}
                        onClick={() => {
                          setOrderId(s.orderId);
                          setComplaint(s.complaint);
                          setTriageData(null);
                          setApprovedBanner(null);
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-md border transition ${
                          orderId === s.orderId
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {s.orderId}: {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Order Reference ID (ERP Lookup Key)
                    </label>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="e.g., ORD-1001"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Customer Message
                    </label>
                    <textarea
                      rows={4}
                      value={complaint}
                      onChange={(e) => setComplaint(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {loading ? 'Running Nova Pro Agentic Pipeline...' : 'Run Agentic Triage & ERP Check'}
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    <strong>Execution Error:</strong> {error}
                  </div>
                )}
              </div>

              {/* Live Agent Execution Trace */}
              {triageData && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-600" />
                      Agent Execution Trace
                    </h3>
                    <span className="text-xs font-mono text-slate-500">
                      {triageData.metrics.latency_ms} ms • ${triageData.metrics.estimated_cost_usd}
                    </span>
                  </div>

                  <div className="space-y-3 border-l-2 border-indigo-200 ml-2 pl-4">
                    {triageData.trace.map((item) => (
                      <div key={item.step} className="relative">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                        <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                        <p className="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 mt-1 break-words">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Triage Output & Human-in-the-Loop */}
            <div className="lg:col-span-7">
              {!triageData ? (
                <div className="h-full min-h-[420px] bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800">Ready for Agentic Triage</h3>
                  <p className="text-sm text-slate-500 max-w-md mt-1">
                    Submit a ticket on the left. Amazon Nova Pro will retrieve relevant SOPs via Titan Embeddings, query the ERP database, and draft a policy-compliant response.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
                  {/* Metadata Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${priorityBadge(triageData.result.priority)}`}>
                        {triageData.result.priority} Priority
                      </span>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {triageData.result.category}
                      </span>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        Sentiment: {triageData.result.sentiment}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-200">
                      Queue: {triageData.result.assigned_queue} • {triageData.result.sop_cited}
                    </div>
                  </div>

                  {/* Ground-Truth ERP & Runbook Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-1">
                        <Database className="w-3.5 h-3.5" />
                        ERP Ground-Truth Verification
                      </div>
                      <p className="text-xs text-emerald-900 leading-relaxed">
                        {triageData.result.erp_verification_summary}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Internal Runbook Action
                      </div>
                      <p className="text-xs text-blue-900 leading-relaxed">
                        {triageData.result.suggested_resolution}
                      </p>
                    </div>
                  </div>

                  {/* Human-in-the-Loop Response Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Drafted Customer Response (Human-in-the-Loop Review)
                      </label>
                      <span className="text-xs text-slate-400">
                        Edits are tracked for AI acceptance telemetry
                      </span>
                    </div>
                    <textarea
                      rows={7}
                      value={editedReply}
                      onChange={(e) => setEditedReply(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-3.5 text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {approvedBanner && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {approvedBanner}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-slate-500">
                      Tokens: {triageData.metrics.input_tokens} in / {triageData.metrics.output_tokens} out
                    </div>
                    <button
                      onClick={handleApprove}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Approve & Dispatch Response
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FDE TELEMETRY & AUDIT LOGS */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Resolved Tickets</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{telemetry.summary.total || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500">AI Draft Acceptance Rate</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {telemetry.summary.acceptance_rate ?? 100}%
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Avg End-to-End Latency</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {telemetry.summary.avg_latency_ms || 0} ms
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Cumulative Bedrock Cost</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  ${telemetry.summary.total_cost || 0}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800">Audit & Compliance Ledger (SQLite)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Category & Queue</th>
                      <th className="py-3 px-4">SOP Cited</th>
                      <th className="py-3 px-4">Edit Ratio</th>
                      <th className="py-3 px-4">Latency</th>
                      <th className="py-3 px-4">Cost (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {telemetry.logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No approved tickets logged yet. Approve a response in the Agent Workbench.
                        </td>
                      </tr>
                    ) : (
                      telemetry.logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-medium text-slate-800">{log.order_id}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800">{log.category}</span>
                            <span className="text-slate-500 block">{log.assigned_queue} ({log.priority})</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-indigo-600">{log.sop_cited}</td>
                          <td className="py-3 px-4">{(log.edit_ratio * 100).toFixed(1)}%</td>
                          <td className="py-3 px-4">{log.latency_ms} ms</td>
                          <td className="py-3 px-4 font-mono">${log.estimated_cost_usd}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SOP KNOWLEDGE BASE */}
        {activeTab === 'policies' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-4xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-4 pb-3 border-b border-slate-200">
              <FileText className="w-4 h-4 text-indigo-600" />
              Active Enterprise Standard Operating Procedures (`policies.md`)
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
              {policiesText}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}