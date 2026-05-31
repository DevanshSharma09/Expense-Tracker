import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const sections = ['Dashboard', 'Reports', 'Transactions', 'People', 'Assistant', 'Settings'];
const scopeOptions = ['weekly', 'monthly', 'yearly'];
const warningCopy =
  "Warning: Your balance is empty. Please select another person only if this expense should be paid from their balance.";

const emptyAnalytics = {
  chart: [],
  macroMetrics: {
    totalVaultLiquidity: 0,
    myPersonalPoolBalance: 0,
    escrowGroupCapital: 0,
    activeParticipants: 0,
    totalSpent: 0,
  },
};

const cx = (...classes) => classes.filter(Boolean).join(' ');

const normalizeName = (name) => String(name || '').trim().toLowerCase();

const displayName = (name) =>
  normalizeName(name).replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Unnamed';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);

const uniqueParticipants = (participants = [], includeHidden = false) => {
  const seen = new Map();
  participants.forEach((participant) => {
    const key = normalizeName(participant.name);
    if (!key || (!includeHidden && participant.hidden)) return;
    if (!seen.has(key)) seen.set(key, { ...participant, name: key });
  });
  return Array.from(seen.values());
};

function Panel({ children, className = '' }) {
  return (
    <section className={cx('rounded-lg border border-white/10 bg-[#1e1e1e] p-5 shadow-[0_16px_60px_rgba(0,0,0,0.22)]', className)}>
      {children}
    </section>
  );
}

function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#1e1e1e] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div>
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
      </div>
      {actions}
    </header>
  );
}

function Sidebar({ activeSection, onChange, logout }) {
  return (
    <aside className="fixed inset-y-3 left-3 z-20 hidden w-64 rounded-lg border border-white/10 bg-[#121212] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:block">
      <div className="border-l-2 border-violet-300 pl-3">
        <h1 className="text-base font-semibold text-white">Smart Expense Book</h1>
        <p className="mt-1 text-xs text-zinc-500">Shared money tracker</p>
      </div>

      <nav className="mt-8 space-y-1">
        {sections.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => onChange(section)}
            className={cx(
              'flex h-10 w-full items-center rounded-md px-3 text-left text-sm transition',
              activeSection === section
                ? 'border-l-2 border-violet-300 bg-white/[0.07] text-white'
                : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
            )}
          >
            {section}
          </button>
        ))}
      </nav>

      <button
        type="button"
        onClick={logout}
        className="absolute inset-x-4 bottom-4 h-10 rounded-md border border-amber-300/20 text-sm text-amber-100 hover:bg-amber-300/10"
      >
        Logout
      </button>
    </aside>
  );
}

function MetricCard({ label, value, accent = 'mint', detail }) {
  const colors = {
    mint: 'border-l-emerald-300 text-emerald-300',
    yellow: 'border-l-yellow-300 text-yellow-300',
    violet: 'border-l-violet-300 text-violet-300',
    sky: 'border-l-sky-300 text-sky-300',
  };

  return (
    <Panel className={cx('min-h-[112px] border-l-2 p-4 sm:min-h-[132px] sm:p-5', colors[accent])}>
      <p className="text-sm text-zinc-400">{label}</p>
      <h3 className="mt-3 text-3xl font-semibold text-white sm:mt-4">{value}</h3>
      <p className={cx('mt-3 text-xs', colors[accent]?.split(' ').at(-1))}>{detail || 'current amount'}</p>
    </Panel>
  );
}

function ScopeToggle({ scope, onChange }) {
  return (
    <div className="flex rounded-lg border border-white/10 bg-[#121212] p-1">
      {scopeOptions.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cx(
            'h-9 rounded-md px-4 text-sm capitalize transition',
            scope === option ? 'bg-violet-300 text-zinc-950' : 'text-zinc-400 hover:text-white'
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function CategoryField({ value, onChange }) {
  return (
    <div className="grid gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Category</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border border-white/10 bg-[#121212] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-300/60"
        placeholder="Type category"
        required
      />
    </div>
  );
}

function DashboardView({ ledger, analytics, expenses }) {
  const metrics = analytics.macroMetrics || emptyAnalytics.macroMetrics;
  const statusWarning = (metrics.myPersonalPoolBalance || 0) <= 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" subtitle="One shared bank account with separate balances for each person." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Money" value={formatCurrency(metrics.totalVaultLiquidity)} accent="mint" />
        <MetricCard label="My Balance" value={formatCurrency(metrics.myPersonalPoolBalance)} accent={statusWarning ? 'yellow' : 'mint'} />
        <MetricCard label="Others Balance" value={formatCurrency(metrics.escrowGroupCapital)} accent="violet" />
        <MetricCard label="Status" value={statusWarning ? 'Check Needed' : 'Healthy'} accent={statusWarning ? 'yellow' : 'sky'} />
      </div>
      <Panel>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <p className="mt-1 text-sm text-zinc-500">{ledger.participants?.filter((item) => !item.hidden).length || 0} visible people</p>
          </div>
          <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">{expenses.length} transactions</span>
        </div>
        <div className="space-y-3">
          {expenses.slice(0, 5).map((expense) => (
            <div key={expense._id} className="grid gap-2 rounded-md border border-white/10 bg-[#121212] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-medium text-white">{expense.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Paid from <span className="capitalize text-zinc-300">{displayName(expense.chargedFromPool || expense.participantName)}</span>
                </p>
              </div>
              <p className="font-semibold text-emerald-300">{formatCurrency(expense.amount)}</p>
            </div>
          ))}
          {expenses.length === 0 && <p className="text-sm text-zinc-500">No transactions yet.</p>}
        </div>
      </Panel>
    </div>
  );
}

function ReportsView({ analytics, scope, onScopeChange }) {
  const chartData = analytics.chart?.length ? analytics.chart : [{ label: 'No data', spending: 0 }];

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Money movement and spending pace." actions={<ScopeToggle scope={scope} onChange={onScopeChange} />} />
      <Panel>
        <div className="h-[420px] min-h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="vault-spend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6ee7b7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6ee7b7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2a2a2a" strokeDasharray="2 8" />
              <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 12 }} />
              <YAxis stroke="#71717a" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#121212', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="spending" stroke="#6ee7b7" fill="url(#vault-spend)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

function TransactionsView({
  participants,
  expenses,
  draft,
  setDraft,
  addTransaction,
  deleteTransaction,
  downloadPdf,
}) {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Transactions"
        subtitle="Add expenses and choose whose balance should be used."
        actions={
          <button type="button" onClick={downloadPdf} className="h-11 rounded-md bg-white px-5 text-sm font-semibold text-zinc-950 hover:bg-emerald-50">
            Download PDF
          </button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <h3 className="mb-4 text-lg font-semibold text-white">New Transaction</h3>
          <form onSubmit={addTransaction} className="grid gap-4">
            <input
              className="h-11 rounded-md border border-white/10 bg-[#121212] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-300/60"
              placeholder="Transaction title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              required
            />
            <input
              className="h-11 rounded-md border border-white/10 bg-[#121212] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-300/60"
              placeholder="Amount"
              type="number"
              min="0"
              step="0.01"
              value={draft.amount}
              onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
              required
            />
            <CategoryField value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Paid From</span>
              <select
                className="h-11 rounded-md border border-white/10 bg-[#121212] px-3 text-sm text-white outline-none capitalize focus:border-violet-300/60"
                value={draft.chargedFromPool}
                onChange={(event) => setDraft({ ...draft, chargedFromPool: event.target.value })}
                required
              >
                <option value="" disabled>
                  Select person
                </option>
                {participants.map((participant) => (
                  <option key={participant._id} value={participant.name} className="capitalize">
                    {displayName(participant.name)} - {formatCurrency(participant.currentBalance)}
                  </option>
                ))}
              </select>
            </label>
            <button className="h-12 rounded-md bg-emerald-300 font-semibold text-zinc-950 transition hover:bg-emerald-200">
              Save Transaction
            </button>
          </form>
        </Panel>

        <Panel>
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">Transactions</h3>
            <p className="mt-1 text-sm text-zinc-500">{expenses.length} transactions</p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-[#121212] text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Paid From</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {expenses.map((expense) => (
                  <tr key={expense._id} className="text-zinc-300 hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-white">{expense.title}</td>
                    <td className="px-4 py-3 capitalize">{displayName(expense.chargedFromPool || expense.participantName)}</td>
                    <td className="px-4 py-3">{expense.category}</td>
                    <td className="px-4 py-3">{formatCurrency(expense.amount)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-xs text-emerald-300">posted</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => deleteTransaction(expense)}
                        className="rounded-md border border-rose-300/20 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-300/10"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-zinc-500">
                      No transactions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function PeopleView({ participants, draft, setDraft, addParticipant, updateParticipant, removeParticipant }) {
  return (
    <div className="space-y-4">
      <PageHeader title="People" subtitle="Add or update each person's share." />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <h3 className="mb-4 text-lg font-semibold text-white">People & Balances</h3>
          <div className="space-y-3">
            {participants.map((participant) => (
              <div key={participant._id} className="grid gap-3 rounded-lg border border-white/10 bg-[#121212] p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-semibold capitalize text-white">{displayName(participant.name)}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Added {formatCurrency(participant.initialShare)} - Left {formatCurrency(participant.currentBalance)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {participant.isPersonalPool && <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-xs text-emerald-200">mine</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => updateParticipant(participant._id, { hidden: !participant.hidden })} className="rounded-md border border-white/10 px-3 py-2 text-xs text-zinc-300">
                    {participant.hidden ? 'Show' : 'Hide'}
                  </button>
                  <button type="button" onClick={() => updateParticipant(participant._id, { isPersonalPool: true })} className="rounded-md border border-emerald-300/20 px-3 py-2 text-xs text-emerald-200">
                    Make Mine
                  </button>
                  <button type="button" onClick={() => removeParticipant(participant._id)} className="rounded-md border border-yellow-300/20 px-3 py-2 text-xs text-yellow-200">
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {participants.length === 0 && <p className="text-sm text-zinc-500">No visible people yet. Check Settings for hidden people.</p>}
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-4 text-lg font-semibold text-white">Add Person's Share</h3>
          <form onSubmit={addParticipant} className="grid gap-3">
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className="h-11 rounded-md border border-white/10 bg-[#121212] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-300/60"
              placeholder="Name"
              required
            />
            <input
              value={draft.initialShare}
              onChange={(event) => setDraft({ ...draft, initialShare: event.target.value })}
              className="h-11 rounded-md border border-white/10 bg-[#121212] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-300/60"
              placeholder="Amount added"
              type="number"
              min="0"
              step="0.01"
              required
            />
            <button className="h-12 rounded-md bg-white font-semibold text-zinc-950 hover:bg-violet-100">
              Add / Update Person
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function AssistantView({ messages, query, setQuery, askAssistant, loading }) {
  const prompts = ['Total money', 'Hidden people', 'Top spender', 'Recent transactions', 'Low balance'];

  return (
    <div className="space-y-4">
      <PageHeader title="Assistant" subtitle="Ask about balances, people, and spending." />
      <Panel>
        <div className="mb-4 flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setQuery(prompt)}
              className="rounded-md border border-white/10 bg-[#121212] px-3 py-2 text-xs text-zinc-300 hover:border-violet-300/40 hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="mb-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cx(
                'rounded-lg border p-3 text-sm leading-6',
                message.role === 'assistant'
                  ? 'border-white/10 bg-[#121212] text-zinc-300'
                  : 'border-violet-300/20 bg-violet-300/10 text-violet-100'
              )}
            >
              {message.content}
            </div>
          ))}
        </div>
        <form onSubmit={askAssistant} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 rounded-md border border-white/10 bg-[#121212] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-300/60"
            placeholder="Ask about total money, a person, or recent spending"
          />
          <button disabled={loading} className="h-11 rounded-md bg-violet-300 px-5 font-semibold text-zinc-950 disabled:opacity-60">
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </form>
      </Panel>
    </div>
  );
}

function SettingsView({ ledger, updateLedgerName, updateParticipant }) {
  const [ledgerName, setLedgerName] = useState(ledger.name || 'Smart Expense Book');
  const allPeople = uniqueParticipants(ledger.participants, true);
  const hiddenPeople = allPeople.filter((participant) => participant.hidden);

  useEffect(() => {
    setLedgerName(ledger.name || 'Smart Expense Book');
  }, [ledger.name]);

  const showAllHidden = async () => {
    for (const participant of hiddenPeople) {
      await updateParticipant(participant._id, { hidden: false });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Manage app details and hidden people." />
      <Panel>
        <dl className="grid gap-4 md:grid-cols-3">
          <div>
            <dt className="text-xs text-zinc-500">Book Name</dt>
            <dd className="mt-1 text-white">{ledger.name || 'Smart Expense Book'}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Total People</dt>
            <dd className="mt-1 text-white">{allPeople.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Hidden People</dt>
            <dd className="mt-1 text-white">{hiddenPeople.length}</dd>
          </div>
        </dl>
      </Panel>

      <Panel>
        <h3 className="mb-4 text-lg font-semibold text-white">Book Settings</h3>
        <form
          className="grid gap-3 md:grid-cols-[1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            updateLedgerName(ledgerName);
          }}
        >
          <input
            value={ledgerName}
            onChange={(event) => setLedgerName(event.target.value)}
            className="h-11 rounded-md border border-white/10 bg-[#121212] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-300/60"
            placeholder="Book name"
          />
          <button className="h-11 rounded-md bg-white px-5 text-sm font-semibold text-zinc-950 hover:bg-violet-100">
            Save Name
          </button>
        </form>
      </Panel>

      <Panel>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-white">Hidden People</h3>
          <button
            type="button"
            onClick={showAllHidden}
            disabled={!hiddenPeople.length}
            className="h-10 rounded-md border border-emerald-300/20 px-4 text-sm text-emerald-200 hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Show All
          </button>
        </div>
        <div className="space-y-3">
          {hiddenPeople.map((participant) => (
            <div key={participant._id} className="grid gap-3 rounded-lg border border-white/10 bg-[#121212] p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-semibold text-white">{displayName(participant.name)}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Added {formatCurrency(participant.initialShare)} - Left {formatCurrency(participant.currentBalance)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateParticipant(participant._id, { hidden: false })}
                className="h-10 rounded-md border border-emerald-300/20 px-4 text-sm text-emerald-200 hover:bg-emerald-300/10"
              >
                Show
              </button>
            </div>
          ))}
          {!hiddenPeople.length && <p className="text-sm text-zinc-500">No hidden people.</p>}
        </div>
      </Panel>
    </div>
  );
}

export default function EnterpriseDashboard({ userToken, logout, apiRoot }) {
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${userToken}` }), [userToken]);
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [scope, setScope] = useState('monthly');
  const [ledger, setLedger] = useState({ participants: [], systemCategories: [], customCategories: [], metrics: {} });
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [expenses, setExpenses] = useState([]);
  const [banner, setBanner] = useState('');
  const [participantDraft, setParticipantDraft] = useState({ name: '', initialShare: '' });
  const [transactionDraft, setTransactionDraft] = useState({ title: '', amount: '', category: 'Food', chargedFromPool: '' });
  const [query, setQuery] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ask me about total money, any person balance, hidden people, top spender, or recent transactions.' },
  ]);

  const participants = useMemo(() => uniqueParticipants(ledger.participants), [ledger.participants]);
  const fetchAll = async (nextScope = scope) => {
    const [ledgerRes, analyticsRes, expensesRes] = await Promise.all([
      axios.get(`${apiRoot}/ledger`, { headers: authHeaders }),
      axios.get(`${apiRoot}/ledger/analytics?scope=${nextScope}`, { headers: authHeaders }),
      axios.get(`${apiRoot}/expenses`, { headers: authHeaders }),
    ]);

    const nextLedger = ledgerRes.data || { participants: [] };
    const nextParticipants = uniqueParticipants(nextLedger.participants);
    const metrics = nextLedger.metrics || analyticsRes.data?.macroMetrics || {};

    setLedger(nextLedger);
    setAnalytics({
      ...(analyticsRes.data || emptyAnalytics),
      macroMetrics: { ...emptyAnalytics.macroMetrics, ...analyticsRes.data?.macroMetrics, ...metrics },
    });
    setExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : []);
    setTransactionDraft((current) => ({
      ...current,
      chargedFromPool: current.chargedFromPool || nextParticipants[0]?.name || '',
    }));
  };

  useEffect(() => {
    if (!userToken) return;
    fetchAll(scope).catch((error) => {
      if (error.response?.status === 401) {
        setBanner('Please sign in again.');
        logout();
        return;
      }
      setBanner(error.response?.data?.message || 'Could not load data. Please check the backend connection.');
    });
  }, [userToken, scope]);

  const addParticipant = async (event) => {
    event.preventDefault();
    try {
      setBanner('');
      await axios.post(
        `${apiRoot}/ledger/participants`,
        {
          name: participantDraft.name,
          initialShare: Number(participantDraft.initialShare),
        },
        { headers: authHeaders }
      );
      setParticipantDraft({ name: '', initialShare: '' });
      await fetchAll();
    } catch (error) {
      setBanner(error.response?.data?.message || 'Could not add participant.');
    }
  };

  const updateParticipant = async (id, payload) => {
    try {
      setBanner('');
      await axios.patch(`${apiRoot}/ledger/participants/${id}`, payload, { headers: authHeaders });
      await fetchAll();
    } catch (error) {
      setBanner(error.response?.data?.message || 'Could not update participant.');
    }
  };

  const updateLedgerName = async (name) => {
    try {
      setBanner('');
      await axios.put(`${apiRoot}/ledger`, { name }, { headers: authHeaders });
      await fetchAll();
    } catch (error) {
      setBanner(error.response?.data?.message || 'Could not update settings.');
    }
  };

  const removeParticipant = async (id) => {
    try {
      setBanner('');
      await axios.delete(`${apiRoot}/ledger/participants/${id}`, { headers: authHeaders });
      await fetchAll();
    } catch (error) {
      setBanner(error.response?.data?.message || 'Could not remove participant.');
    }
  };

  const addTransaction = async (event) => {
    event.preventDefault();
    const amount = Number(transactionDraft.amount);
    const selected = participants.find((participant) => normalizeName(participant.name) === normalizeName(transactionDraft.chargedFromPool));

    if (!selected) {
      setBanner('Please select a valid person.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setBanner('Please enter a valid transaction amount.');
      return;
    }

    if (selected.isPersonalPool && amount > (Number(selected.currentBalance) || 0)) {
      setBanner(warningCopy);
      return;
    }

    try {
      setBanner('');
      await axios.post(
        `${apiRoot}/expenses`,
        {
          title: transactionDraft.title,
          amount,
          category: transactionDraft.category.trim(),
          participantId: selected._id,
          chargedFromPool: selected.name,
        },
        { headers: authHeaders }
      );
      setTransactionDraft((current) => ({ ...current, title: '', amount: '' }));
      await fetchAll();
    } catch (error) {
      setBanner(error.response?.data?.message || 'Could not save transaction.');
    }
  };

  const deleteTransaction = async (expense) => {
    if (!window.confirm(`Delete "${expense.title}" from the records?`)) return;

    try {
      setBanner('');
      await axios.delete(`${apiRoot}/expenses/${expense._id}`, { headers: authHeaders });
      await fetchAll();
    } catch (error) {
      setBanner(error.response?.data?.message || 'Could not delete transaction.');
    }
  };

  const askAssistant = async (event) => {
    event.preventDefault();
    const prompt = query.trim();
    if (!prompt) return;

    setMessages((current) => [...current, { role: 'user', content: prompt }]);
    setQuery('');
    setAssistantLoading(true);

    try {
      const response = await axios.post(`${apiRoot}/ledger/assistant-query`, { query: prompt }, { headers: authHeaders });
      setMessages((current) => [...current, { role: 'assistant', content: response.data.answer }]);
      await fetchAll();
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: error.response?.data?.message || 'I could not read the records right now.' },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    let y = 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Smart Expense Book - Transactions', 14, y);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    expenses.forEach((expense) => {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(`${expense.title || 'Untitled'} | ${displayName(expense.chargedFromPool)} | ${expense.category} | ${formatCurrency(expense.amount)}`, 14, y);
      y += 8;
    });
    if (!expenses.length) doc.text('No transactions yet.', 14, y);
    doc.save('smart-expense-book-transactions.pdf');
  };

  const renderActiveSection = () => {
    if (activeSection === 'Reports') return <ReportsView analytics={analytics} scope={scope} onScopeChange={setScope} />;
    if (activeSection === 'Transactions') {
      return (
        <TransactionsView
          participants={participants}
          expenses={expenses}
          draft={transactionDraft}
          setDraft={setTransactionDraft}
          addTransaction={addTransaction}
          deleteTransaction={deleteTransaction}
          downloadPdf={downloadPdf}
        />
      );
    }
    if (activeSection === 'People') {
      return (
        <PeopleView
          participants={participants}
          draft={participantDraft}
          setDraft={setParticipantDraft}
          addParticipant={addParticipant}
          updateParticipant={updateParticipant}
          removeParticipant={removeParticipant}
        />
      );
    }
    if (activeSection === 'Assistant') return <AssistantView messages={messages} query={query} setQuery={setQuery} askAssistant={askAssistant} loading={assistantLoading} />;
    if (activeSection === 'Settings') return <SettingsView ledger={ledger} updateLedgerName={updateLedgerName} updateParticipant={updateParticipant} />;
    return <DashboardView ledger={ledger} analytics={analytics} expenses={expenses} />;
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Sidebar activeSection={activeSection} onChange={setActiveSection} logout={logout} />

      <main className="lg:pl-[17.5rem]">
        <div className="mx-auto max-w-[1240px] space-y-4 px-3 py-3 sm:px-6">
          <div className="grid gap-3 rounded-lg border border-white/10 bg-[#1e1e1e] p-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-base font-semibold">Smart Expense Book</span>
              <button
                type="button"
                onClick={logout}
                className="h-10 shrink-0 rounded-md border border-amber-300/25 px-3 text-sm text-amber-100"
              >
                Logout
              </button>
            </div>
            <select
              value={activeSection}
              onChange={(event) => setActiveSection(event.target.value)}
              className="h-11 w-full rounded-md border border-white/10 bg-[#121212] px-3 text-sm"
            >
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          {banner && <div className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 px-4 py-3 text-sm font-medium text-yellow-100">{banner}</div>}
          {renderActiveSection()}
        </div>
      </main>
    </div>
  );
}
