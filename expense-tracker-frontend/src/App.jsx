import React, { createContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

export const AuthContext = createContext();

// ✅ REPLACED:
const AUTH_URL = import.meta.env.VITE_API_URL;
const EXPENSES_URL = import.meta.env.VITE_BACKEND_URL;
const BALANCE_STORAGE_KEY = 'simpleBalanceSettings';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);

const readSavedBalanceSettings = () => {
  try {
    const saved = localStorage.getItem(BALANCE_STORAGE_KEY);
    if (!saved) return { totalBankBalance: 5000, myInitialShare: 3000, sharedMoneyLabel: 'Friends' };

    const parsed = JSON.parse(saved);
    const totalBankBalance = Number(parsed.totalBankBalance);
    const myInitialShare = Number(parsed.myInitialShare);

    return {
      totalBankBalance: Number.isFinite(totalBankBalance) ? totalBankBalance : 5000,
      myInitialShare: Number.isFinite(myInitialShare) ? myInitialShare : 3000,
      sharedMoneyLabel: typeof parsed.sharedMoneyLabel === 'string' && parsed.sharedMoneyLabel.trim()
        ? parsed.sharedMoneyLabel.trim()
        : 'Friends',
    };
  } catch {
    return { totalBankBalance: 5000, myInitialShare: 3000, sharedMoneyLabel: 'Friends' };
  }
};

const getWalletMode = (expense) => {
  if (expense.walletMode === 'shared') return 'shared';
  if (typeof expense.walletType === 'string' && expense.walletType.toLowerCase().includes('friend')) {
    return 'shared';
  }
  return 'personal';
};

export default function App() {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (token) setUserToken(token);
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${AUTH_URL}/login`, { email, password });
      const token = response.data.token;
      localStorage.setItem('userToken', token);
      setUserToken(token);
      alert('Login Successful!');
    } catch (error) {
      alert(error.response?.data?.message || 'Login Failed');
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post(`${AUTH_URL}/register`, { name, email, password });
      const token = response.data.token;
      localStorage.setItem('userToken', token);
      setUserToken(token);
      alert('Registration Successful!');
    } catch (error) {
      alert(error.response?.data?.message || 'Registration Failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('userToken');
    setUserToken(null);
  };

  if (isLoading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ userToken, login, register, logout }}>
      <Router>
        <Routes>
          {userToken == null ? (
            <>
              <Route path="/login" element={<LoginWeb />} />
              <Route path="/register" element={<RegisterWeb />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          ) : (
            <>
              <Route path="/dashboard" element={<DashboardWeb />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </>
          )}
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

function LoginWeb() {
  const { login } = React.useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div style={styles.authPage}>
      <div style={styles.authCard}>
        <h2 style={styles.authTitle}>Login</h2>
        <input style={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button style={styles.primaryButton} onClick={() => login(email, password)}>Sign In</button>
        <p style={styles.switchText}>
          Don't have an account? <a href="/register" style={styles.link}>Register here</a>
        </p>
      </div>
    </div>
  );
}

function RegisterWeb() {
  const { register } = React.useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div style={styles.authPage}>
      <div style={styles.authCard}>
        <h2 style={styles.authTitle}>Register</h2>
        <input style={styles.input} type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button style={styles.primaryButton} onClick={() => register(name, email, password)}>Sign Up</button>
        <p style={styles.switchText}>
          Already have an account? <a href="/login" style={styles.link}>Login here</a>
        </p>
      </div>
    </div>
  );
}

function DashboardWeb() {
  const { logout, userToken } = React.useContext(AuthContext);
  const savedSettings = useMemo(readSavedBalanceSettings, []);
  const [expenses, setExpenses] = useState([]);
  const [totalBankBalance, setTotalBankBalance] = useState(String(savedSettings.totalBankBalance));
  const [myInitialShare, setMyInitialShare] = useState(String(savedSettings.myInitialShare));
  const [sharedMoneyLabel, setSharedMoneyLabel] = useState(savedSettings.sharedMoneyLabel);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [walletMode, setWalletMode] = useState('personal');
  const [sharedUser, setSharedUser] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${userToken}` }), [userToken]);
  const totalStart = parseFloat(totalBankBalance) || 0;
  const myStart = parseFloat(myInitialShare) || 0;
  const otherMoneyLabel = sharedMoneyLabel.trim() || 'Someone Else';
  const otherMoneyPossessive = `${otherMoneyLabel}'${otherMoneyLabel.endsWith('s') ? '' : 's'}`;
  const friendsStart = Math.max(totalStart - myStart, 0);

  const mySpent = expenses
    .filter((expense) => getWalletMode(expense) === 'personal')
    .reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
  const friendsSpent = expenses
    .filter((expense) => getWalletMode(expense) === 'shared')
    .reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
  const liveMyMoney = myStart - mySpent;
  const liveFriendsMoney = friendsStart - friendsSpent;
  const liveTotalBankBalance = liveMyMoney + liveFriendsMoney;
  const isWarning = liveMyMoney < 0 || liveFriendsMoney < 0;

  useEffect(() => {
    localStorage.setItem(
      BALANCE_STORAGE_KEY,
      JSON.stringify({ totalBankBalance: totalStart, myInitialShare: myStart, sharedMoneyLabel: otherMoneyLabel })
    );
  }, [totalStart, myStart, otherMoneyLabel]);

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(EXPENSES_URL, { headers: authHeaders });
      setExpenses(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load expenses', error);
    }
  };

  useEffect(() => {
    if (userToken) fetchExpenses();
  }, [userToken]);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setSharedUser('');
    setWalletMode('personal');
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('Please add a title and a valid amount.');
      return;
    }

    if (walletMode === 'shared' && !sharedUser.trim()) {
      alert(`Please enter the ${otherMoneyLabel.toLowerCase()} name.`);
      return;
    }

    if (walletMode === 'personal' && parsedAmount > liveMyMoney) {
      alert(`Warning: Your personal money is running out! You are touching ${otherMoneyPossessive.toLowerCase()} money.`);
      return;
    }

    try {
      await axios.post(
        EXPENSES_URL,
        {
          title: title.trim(),
          amount: parsedAmount,
          category,
          walletMode,
          sharedUser: walletMode === 'shared' ? sharedUser.trim() : '',
        },
        { headers: authHeaders }
      );
      resetForm();
      await fetchExpenses();
    } catch (error) {
      alert(error.response?.data?.message || 'Could not save this expense.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${EXPENSES_URL}/${id}`, { headers: authHeaders });
      await fetchExpenses();
    } catch (error) {
      alert(error.response?.data?.message || 'Could not delete this expense.');
    }
  };

  const runAudit = () => {
    if (isWarning) {
      setAssistantMessage(
        `Warning: money is tight. You have ${formatCurrency(liveMyMoney)} left, and ${otherMoneyLabel.toLowerCase()} has ${formatCurrency(liveFriendsMoney)} left in the account.`
      );
      return;
    }

    setAssistantMessage(
      `All good! You have ${formatCurrency(liveMyMoney)} left, and ${otherMoneyLabel.toLowerCase()} still has ${formatCurrency(liveFriendsMoney)} in the account.`
    );
  };

  return (
    <div style={styles.dashboard}>
      <style>{`
        @keyframes warningBlink {
          0% { opacity: 1; }
          50% { opacity: 0.45; }
          100% { opacity: 1; }
        }
      `}</style>

      <header style={styles.navbar}>
        <div>
          <h1 style={styles.appTitle}>Smart Expense Book</h1>
          <p style={styles.appSubtitle}>Simple money tracking for you and the people sharing this account.</p>
        </div>
        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
      </header>

      <section style={styles.configBar}>
        <div>
          <h2 style={styles.configTitle}>Set Starting Balance</h2>
          <p style={styles.configText}>Tell the app how much money is in the account and how much belongs to you.</p>
        </div>
        <div style={styles.configInputs}>
          <label style={styles.compactLabel}>
            Total Bank Balance
            <input style={styles.compactInput} type="number" min="0" value={totalBankBalance} onChange={(e) => setTotalBankBalance(e.target.value)} />
          </label>
          <label style={styles.compactLabel}>
            My Initial Share
            <input style={styles.compactInput} type="number" min="0" value={myInitialShare} onChange={(e) => setMyInitialShare(e.target.value)} />
          </label>
          <label style={styles.compactLabel}>
            Other Money Label
            <input
              style={styles.compactInput}
              type="text"
              placeholder="Friends, Family, Roommate"
              value={sharedMoneyLabel}
              onChange={(e) => setSharedMoneyLabel(e.target.value)}
            />
          </label>
          <div style={styles.friendsShareBox}>
            <span style={styles.friendsShareLabel}>{otherMoneyPossessive} Initial Share</span>
            <strong>{formatCurrency(friendsStart)}</strong>
          </div>
        </div>
      </section>

      <section style={styles.metricGrid}>
        <MetricCard label="TOTAL BANK BALANCE" value={formatCurrency(liveTotalBankBalance)} color="#bb86fc" />
        <MetricCard label="MY MONEY" value={formatCurrency(liveMyMoney)} color="#55d68b" />
        <MetricCard label={`${otherMoneyLabel.toUpperCase()} MONEY`} value={formatCurrency(liveFriendsMoney)} color="#f9ab00" />
        <MetricCard
          label="STATUS"
          value={isWarning ? `WARNING: ${otherMoneyLabel.toUpperCase()} MONEY AT RISK` : 'SAFE'}
          color={isWarning ? '#ff4d6d' : '#55d68b'}
          blink={isWarning}
        />
      </section>

      <main style={styles.workspaceGrid}>
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Add New Transaction</h2>
          <form onSubmit={handleAddExpense}>
            <label style={styles.label}>Transaction Title</label>
            <input style={styles.input} type="text" placeholder="Expense Title" value={title} onChange={(e) => setTitle(e.target.value)} />

            <label style={styles.label}>Amount</label>
            <input style={styles.input} type="number" min="0" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />

            <label style={styles.label}>Paid From</label>
            <select style={styles.input} value={walletMode} onChange={(e) => setWalletMode(e.target.value)}>
              <option value="personal">My Money</option>
              <option value="shared">{otherMoneyPossessive} Money</option>
            </select>

            {walletMode === 'shared' && (
              <>
                <label style={styles.label}>{otherMoneyLabel} Name</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder={`Enter ${otherMoneyLabel} Name (e.g., Siddharth)`}
                  value={sharedUser}
                  onChange={(e) => setSharedUser(e.target.value)}
                />
              </>
            )}

            <label style={styles.label}>Category</label>
            <select style={styles.input} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Food">Food</option>
              <option value="Rent">Rent</option>
              <option value="Subscription">Subscription</option>
              <option value="Travel">Travel</option>
              <option value="Salary">Salary</option>
              <option value="Other">Other</option>
            </select>

            <button type="submit" style={styles.submitBtn}>Add Transaction</button>
          </form>
        </section>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>History</h2>
          <div style={styles.listContainer}>
            {expenses.length === 0 ? (
              <p style={styles.emptyState}>No transactions yet.</p>
            ) : (
              expenses.map((expense) => {
                const mode = getWalletMode(expense);
                const isFriendMoney = mode === 'shared';
                const label = isFriendMoney ? `${otherMoneyPossessive} Money - ${expense.sharedUser || otherMoneyLabel}` : 'My Money';
                const accent = isFriendMoney ? '#f9ab00' : '#55d68b';

                return (
                  <div key={expense._id || expense.id} style={{ ...styles.listItem, borderLeft: `4px solid ${accent}` }}>
                    <div>
                      <div style={styles.listTitle}>{expense.title}</div>
                      <div style={styles.listMeta}>{expense.category} - {label}</div>
                    </div>
                    <div style={styles.listAmountGroup}>
                      <span style={styles.listAmount}>-{formatCurrency(parseFloat(expense.amount) || 0)}</span>
                      <button style={styles.deleteBtn} onClick={() => handleDelete(expense._id || expense.id)}>x</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      <section style={styles.assistantPanel}>
        <h2 style={styles.panelTitle}>{String.fromCodePoint(0x1F916)} Smart Status Assistant</h2>
        <div style={styles.assistantRow}>
          <p style={styles.assistantHelp}>Click audit for a simple summary of your money and {otherMoneyPossessive.toLowerCase()} money.</p>
          <button style={styles.assistantButton} onClick={runAudit}>Run Audit</button>
        </div>
        {assistantMessage && <div style={styles.assistantMessage}>{assistantMessage}</div>}
      </section>
    </div>
  );
}

function MetricCard({ label, value, color, blink = false }) {
  return (
    <div style={{ ...styles.metricCard, borderTop: `4px solid ${color}`, animation: blink ? 'warningBlink 1s infinite' : 'none' }}>
      <p style={styles.cardLabel}>{label}</p>
      <h2 style={{ ...styles.metricValue, color }}>{value}</h2>
    </div>
  );
}

const styles = {
  loading: { color: '#fff', textAlign: 'center', marginTop: '20%' },
  authPage: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', padding: '20px' },
  authCard: { backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '8px', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' },
  authTitle: { color: '#fff', fontSize: '28px', marginBottom: '24px', fontWeight: 'bold' },
  dashboard: { backgroundColor: '#121212', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, Arial, sans-serif', paddingBottom: '32px' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '18px 30px', backgroundColor: '#1e1e1e', borderBottom: '1px solid #2d2d2d' },
  appTitle: { margin: 0, color: '#fff', fontSize: '24px', letterSpacing: 0 },
  appSubtitle: { margin: '4px 0 0 0', color: '#bdbdbd', fontSize: '14px' },
  logoutBtn: { backgroundColor: '#cf6679', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  configBar: { display: 'grid', gridTemplateColumns: 'minmax(240px, 0.8fr) minmax(320px, 1.2fr)', gap: '18px', alignItems: 'end', maxWidth: '1240px', margin: '28px auto 0 auto', padding: '22px', backgroundColor: '#1e1e1e', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.26)' },
  configTitle: { margin: 0, color: '#bb86fc', fontSize: '20px' },
  configText: { margin: '6px 0 0 0', color: '#aaa', fontSize: '13px' },
  configInputs: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', alignItems: 'end' },
  compactLabel: { color: '#ccc', fontSize: '12px', display: 'grid', gap: '7px' },
  compactInput: { width: '100%', boxSizing: 'border-box', padding: '11px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#2c2c2c', color: '#fff', fontSize: '14px' },
  friendsShareBox: { display: 'grid', gap: '7px', padding: '11px', minHeight: '42px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#252525', color: '#f9ab00' },
  friendsShareLabel: { color: '#ccc', fontSize: '12px' },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', padding: '24px 30px 0 30px', maxWidth: '1240px', margin: '0 auto' },
  metricCard: { backgroundColor: '#1e1e1e', padding: '18px', borderRadius: '8px', minHeight: '98px', boxShadow: '0 4px 10px rgba(0,0,0,0.22)' },
  cardLabel: { margin: 0, color: '#ccc', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' },
  metricValue: { margin: '12px 0 0 0', fontSize: '22px', lineHeight: 1.2, overflowWrap: 'anywhere' },
  workspaceGrid: { display: 'grid', gridTemplateColumns: 'minmax(300px, 0.85fr) minmax(320px, 1.15fr)', gap: '28px', padding: '28px 30px', maxWidth: '1240px', margin: '0 auto' },
  panel: { backgroundColor: '#1e1e1e', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' },
  panelTitle: { margin: '0 0 20px 0', fontSize: '20px', borderBottom: '1px solid #333', paddingBottom: '10px', color: '#bb86fc', letterSpacing: 0 },
  label: { display: 'block', color: '#ccc', fontSize: '13px', marginBottom: '7px' },
  input: { width: '100%', padding: '12px', margin: '0 0 15px 0', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#2c2c2c', color: '#fff', boxSizing: 'border-box', fontSize: '14px' },
  primaryButton: { width: '100%', padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#6200ee', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  submitBtn: { width: '100%', padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#03dac6', color: '#000', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' },
  switchText: { color: '#aaa', marginTop: '15px' },
  link: { color: '#bb86fc' },
  listContainer: { maxHeight: '474px', overflowY: 'auto' },
  emptyState: { color: '#777', textAlign: 'center' },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#252525', borderRadius: '6px', margin: '8px 0', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  listTitle: { color: '#fff', fontWeight: 'bold' },
  listMeta: { color: '#aaa', fontSize: '12px', marginTop: '4px' },
  listAmountGroup: { display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 },
  listAmount: { color: '#ff6b6b', fontWeight: 'bold' },
  deleteBtn: { background: 'none', border: 'none', color: '#e0e0e0', cursor: 'pointer', fontSize: '16px' },
  assistantPanel: { maxWidth: '1192px', margin: '0 auto', backgroundColor: '#1e1e1e', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' },
  assistantRow: { display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px', alignItems: 'center' },
  assistantHelp: { margin: 0, color: '#ccc', lineHeight: 1.5 },
  assistantButton: { height: '43px', borderRadius: '6px', border: 'none', backgroundColor: '#bb86fc', color: '#111', fontWeight: 'bold', cursor: 'pointer' },
  assistantMessage: { marginTop: '16px', padding: '14px', borderRadius: '8px', backgroundColor: '#252525', border: '1px solid #333', color: '#f4f4f4', lineHeight: 1.5 },
};
