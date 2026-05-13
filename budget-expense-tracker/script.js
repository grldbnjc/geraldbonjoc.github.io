// ── Currency Data ──
const SYMBOLS = {
  USD:'$', EUR:'€', PHP:'₱', JPY:'¥', GBP:'£', AUD:'A$', SGD:'S$', KRW:'₩'
};

const CATEGORY_ICONS = {
  Food:'🍜', Transport:'🚌', Entertainment:'🎮', Bills:'💡',
  Shopping:'🛍️', Health:'🏥', Salary:'💼', Income:'💰', Other:'📦'
};

// ── State ──
let rates = {};         // { USD:1, PHP:56.2, ... } (USD base)
let ratesReady = false;
let transactions = [];
let displayCurrency = 'PHP';
let theme = 'light';

// ── Storage ──
const S = {
  load() {
    try {
      transactions = JSON.parse(localStorage.getItem('bt_txns') || '[]');
      displayCurrency = localStorage.getItem('bt_currency') || 'PHP';
      theme = localStorage.getItem('bt_theme') || 'light';
    } catch(e) { transactions = []; }
  },
  saveTxns() { localStorage.setItem('bt_txns', JSON.stringify(transactions)); },
  saveCurrency(c) { localStorage.setItem('bt_currency', c); },
  saveTheme(t) { localStorage.setItem('bt_theme', t); }
};

// ── Fetch Exchange Rates (free, no API key needed) ──
async function fetchRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error();
    const data = await res.json();
    rates = data.rates; // e.g. { USD:1, PHP:56.2, EUR:0.92, ... }
    ratesReady = true;
    document.getElementById('rate-dot').classList.add('live');
    document.getElementById('rate-status').textContent = 'Live rates · ' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    renderAll();
  } catch(e) {
    // Fallback hardcoded rates if network unavailable
    rates = { USD:1, EUR:0.92, PHP:57.5, JPY:155.4, GBP:0.79, AUD:1.54, SGD:1.35, KRW:1340 };
    ratesReady = true;
    document.getElementById('rate-status').textContent = 'Offline rates (approx.)';
    renderAll();
  }
}

// ── Conversion ──
function convert(amount, fromCode, toCode) {
  if (!ratesReady || fromCode === toCode) return amount;
  const inUSD = amount / (rates[fromCode] || 1);
  return inUSD * (rates[toCode] || 1);
}

function fmt(amount, currCode) {
  const sym = SYMBOLS[currCode] || currCode + ' ';
  const decimals = ['JPY','KRW'].includes(currCode) ? 0 : 2;
  return sym + Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// ── Theme ──
function applyTheme() {
  document.body.classList.toggle('dark', theme === 'dark');
  document.getElementById('theme-btn').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ── Render Summary ──
function renderSummary() {
  let income = 0, expense = 0;
  for (const t of transactions) {
    const val = convert(t.originalAmount, t.originalCurrency, displayCurrency);
    if (t.type === 'Income') income += val;
    else expense += val;
  }
  const balance = income - expense;

  const animate = (el, val) => {
    el.style.opacity = '0.5';
    el.style.transform = 'scale(0.95)';
    setTimeout(() => {
      el.textContent = val;
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
      el.style.transition = 'opacity 0.2s, transform 0.2s';
    }, 120);
  };

  animate(document.getElementById('s-income'),  fmt(income, displayCurrency));
  animate(document.getElementById('s-expense'), fmt(expense, displayCurrency));
  const balEl = document.getElementById('s-balance');
  animate(balEl, fmt(balance, displayCurrency));
  balEl.style.color = balance < 0 ? 'var(--expense)' : 'var(--text)';
}

// ── Category Breakdown ──
function renderBreakdown() {
  const totals = {};
  let grandTotal = 0;
  for (const t of transactions) {
    if (t.type === 'Expense') {
      const val = convert(t.originalAmount, t.originalCurrency, displayCurrency);
      totals[t.category] = (totals[t.category] || 0) + val;
      grandTotal += val;
    }
  }
  const el = document.getElementById('cat-breakdown');
  if (grandTotal === 0) { el.innerHTML = '<p style="font-size:0.78rem;color:var(--text-3);text-align:center;padding:0.5rem 0;">No expenses yet.</p>'; return; }

  const sorted = Object.entries(totals).sort((a,b) => b[1]-a[1]);
  el.innerHTML = sorted.map(([cat, val]) => {
    const pct = Math.round((val / grandTotal) * 100);
    return `<div class="cat-bar-wrap">
      <div class="cat-bar-label"><span>${CATEGORY_ICONS[cat]||'📦'} ${cat}</span><span>${fmt(val, displayCurrency)} <span style="color:var(--text-3)">(${pct}%)</span></span></div>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

// ── Render Transaction List ──
function renderList() {
  const filter = document.getElementById('filter-sel').value;
  const list = document.getElementById('tx-list');

  const filtered = filter === 'All' ? transactions
    : filter === 'Income' ? transactions.filter(t => t.type === 'Income')
    : transactions.filter(t => t.category === filter);

  if (filtered.length === 0) {
    list.innerHTML = `<li class="tx-empty"><div class="empty-icon">🧾</div><p>No transactions here yet.</p></li>`;
    return;
  }

  list.innerHTML = filtered.slice().reverse().map(t => {
    const displayVal = convert(t.originalAmount, t.originalCurrency, displayCurrency);
    const isIncome = t.type === 'Income';
    const sign = isIncome ? '+' : '−';
    const icon = CATEGORY_ICONS[t.category] || '📦';
    const showConvertedNote = t.originalCurrency !== displayCurrency;

    return `<li class="tx-item" data-id="${t.id}">
      <div class="tx-dot ${isIncome ? 'income' : 'expense'}">${icon}</div>
      <div class="tx-info">
        <div class="tx-desc">${t.description}</div>
        <div class="tx-meta">
          <span class="cat-pill">${t.category}</span>
          <span>${t.date}</span>
          ${showConvertedNote ? `<span class="orig-note">orig. ${fmt(t.originalAmount, t.originalCurrency)}</span>` : ''}
        </div>
      </div>
      <div class="tx-right">
        <div>
          <div class="tx-amount ${isIncome ? 'income' : 'expense'}">${sign}${fmt(displayVal, displayCurrency)}</div>
        </div>
        <button class="del-btn" onclick="deleteTx('${t.id}')">✕</button>
      </div>
    </li>`;
  }).join('');
}

function renderAll() {
  renderSummary();
  renderList();
  renderBreakdown();
}

// ── Add Transaction ──
document.getElementById('add-btn').addEventListener('click', () => {
  const desc = document.getElementById('desc').value.trim();
  const amountRaw = parseFloat(document.getElementById('amount').value);
  const type = document.querySelector('input[name="tx-type"]:checked').value;
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;
  const entryCurrency = document.getElementById('entry-currency').value;

  if (!desc) { showToast('Please add a description.'); return; }
  if (!amountRaw || amountRaw <= 0) { showToast('Enter a valid amount.'); return; }
  if (!date) { showToast('Pick a date.'); return; }

  const tx = {
    id: crypto.randomUUID(),
    description: desc,
    originalAmount: amountRaw,
    originalCurrency: entryCurrency,
    type,
    category,
    date
  };

  transactions.push(tx);
  S.saveTxns();
  renderAll();

  document.getElementById('desc').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('desc').focus();
  showToast(`${type === 'Income' ? 'Income' : 'Expense'} added ✓`);
});

// ── Delete ──
window.deleteTx = function(id) {
  transactions = transactions.filter(t => t.id !== id);
  S.saveTxns();
  renderAll();
  showToast('Transaction removed.');
};

// ── Toast ──
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Event Listeners ──
document.getElementById('currency-sel').addEventListener('change', e => {
  displayCurrency = e.target.value;
  S.saveCurrency(displayCurrency);
  renderAll();
});

document.getElementById('entry-currency').addEventListener('change', e => {
  document.getElementById('input-sym').textContent = SYMBOLS[e.target.value] || e.target.value;
});

document.getElementById('filter-sel').addEventListener('change', renderList);

document.getElementById('theme-btn').addEventListener('click', () => {
  theme = theme === 'light' ? 'dark' : 'light';
  S.saveTheme(theme);
  applyTheme();
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); document.getElementById('theme-btn').click(); }
});

// ── Init ──
S.load();
applyTheme();

// Set display currency select
document.getElementById('currency-sel').value = displayCurrency;

// Set today's date
document.getElementById('date').value = new Date().toISOString().split('T')[0];

// Set entry currency symbol
document.getElementById('input-sym').textContent = SYMBOLS[document.getElementById('entry-currency').value] || '₱';

// Show loading state
document.getElementById('s-balance').textContent = '…';
document.getElementById('s-income').textContent = '…';
document.getElementById('s-expense').textContent = '…';

fetchRates(); // fetch live rates, then render
