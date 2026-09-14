import { useState, useEffect } from 'react';
import './App.css';

// ─── Constants ──────────────────────────────────────────────────────────────
const UNITS = ['pcs', 'kg', 'g', 'grams', 'L', 'mL', 'box', 'pack', 'dozen', 'pairs', 'set', 'bundle'];
const DEFAULT_SHOP = { name: 'My Shop', address: '123 Market Street, City', phone: '9876543210' };
const EMPTY_ITEM = { name: '', qty: '', rate: '', unit: 'pcs' };
const todayStr = () => new Date().toISOString().slice(0, 10);
const nextBillNo = bills => 'BILL-' + String(bills.length + 1).padStart(4, '0');
const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ─── Number → Indian Words ───────────────────────────────────────────────────
function numberToWords(amount) {
  const num = Math.floor(Number(amount) || 0);
  if (num === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const below100 = n => n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  const below1000 = n => n < 100 ? below100(n) : ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below100(n % 100) : '');
  let n = num, result = '';
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) result += below1000(crore) + ' Crore ';
  if (lakh) result += below1000(lakh) + ' Lakh ';
  if (thousand) result += below1000(thousand) + ' Thousand ';
  if (n) result += below1000(n);
  return result.trim() + ' Rupees Only';
}

// ─── Bill helpers (support both old & new payment format) ───────────────────
const getBillPaid = bill =>
  bill.payments?.length ? bill.payments.reduce((s, p) => s + (p.amount || 0), 0) : (bill.paid || 0);
const getBillBalance = bill => Math.max(0, bill.total - getBillPaid(bill));

// Migrate old bills to have payments array
const normalizeBill = bill => {
  if (bill.payments) return bill;
  return {
    ...bill,
    payments: (bill.paid || 0) > 0
      ? [{ id: uid(), amount: bill.paid, type: bill.paymentType || 'paid', date: bill.date, note: '' }]
      : [],
  };
};

// ─── PDF + WhatsApp ──────────────────────────────────────────────────────────
async function generateAndSharePDF(bill, shop) {
  const html2pdf = (await import('html2pdf.js')).default;
  const element = document.getElementById('print-area');
  if (!element) return;
  const filename = `${bill.billNo}-${bill.customer.replace(/\s+/g, '_')}.pdf`;
  const opt = {
    margin: [4, 4, 4, 4], filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' },
  };
  const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try { await navigator.share({ title: `Bill from ${shop.name}`, text: `Bill: ${bill.billNo}`, files: [pdfFile] }); return; }
    catch (e) { /* fallback */ }
  }
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  setTimeout(() => {
    const phone = bill.phone.replace(/\D/g, '');
    const msg = `Hi, please find your bill (${bill.billNo}) from ${shop.name} attached.`;
    window.open(phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }, 800);
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function WAIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.528 5.853L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.877 9.877 0 01-5.042-1.383l-.361-.214-3.744.981.999-3.648-.235-.374A9.867 9.867 0 012.118 12C2.118 6.58 6.58 2.118 12 2.118S21.882 6.58 21.882 12 17.42 21.882 12 21.882z" />
    </svg>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({ bill, onClose, onAdd }) {
  const [amount, setAmount] = useState('');
  const [type, setType]     = useState('paid');
  const [date, setDate]     = useState(todayStr());
  const [note, setNote]     = useState('');
  const balance = getBillBalance(bill);

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    onAdd({ id: uid(), amount: amt, type, date, note: note.trim() });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>Add Payment</h3>
            <p className="modal-sub">{bill.billNo} · {bill.customer}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-balance-tag">
          Outstanding Balance: <strong>{fmt(balance)}</strong>
        </div>
        <div className="modal-body">
          <div className="field-group dark-field">
            <label>Payment Type</label>
            <div className="pay-type-group">
              <button type="button" className={`pay-type-btn${type === 'paid' ? ' selected-paid' : ''}`} onClick={() => setType('paid')}>✅ Paid</button>
              <button type="button" className={`pay-type-btn${type === 'advance' ? ' selected-advance' : ''}`} onClick={() => setType('advance')}>⏩ Advance</button>
            </div>
          </div>
          <div className="field-group dark-field">
            <label>Amount (₹) *</label>
            <input className="dark-input" type="number" min="0.01" step="0.01"
              placeholder={`Max outstanding: ${balance.toFixed(2)}`} inputMode="decimal"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="field-group dark-field">
            <label>Payment Date</label>
            <input className="dark-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="field-group dark-field">
            <label>Note (optional)</label>
            <input className="dark-input" placeholder="e.g. Cash, UPI, Bank transfer…"
              value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer-btns">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!amount || parseFloat(amount) <= 0} onClick={handleAdd}>
            + Add Payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bill Card ────────────────────────────────────────────────────────────────
function BillCard({ bill, onView, onSend, onDelete, onAddPayment, onDuplicate }) {
  const paid = getBillPaid(bill);
  const balance = getBillBalance(bill);
  return (
    <div className={`bill-card${balance > 0 ? ' pending' : ' paid'}`} onClick={() => onView(bill)}>
      <div className="bc-top">
        <div>
          <div className="bc-billno">{bill.billNo}</div>
          <div className="bc-customer">{bill.customer}</div>
        </div>
        <span className={`status-pill${balance > 0 ? ' pending' : ' paid'}`}>
          {balance > 0 ? '⏳ Pending' : '✅ Paid'}
        </span>
      </div>
      <div className="bc-meta">
        <span>📅 {bill.date}</span>
        <span>{bill.items.length} item{bill.items.length !== 1 ? 's' : ''}</span>
        {bill.payments?.length > 1 && <span>💳 {bill.payments.length} payments</span>}
      </div>
      <div className="bc-amounts">
        <div className="bc-amt"><span>Total</span><strong>{fmt(bill.total)}</strong></div>
        <div className="bc-amt"><span>Paid</span><strong>{fmt(paid)}</strong></div>
        {balance > 0 && <div className="bc-amt balance-due"><span>Balance</span><strong>{fmt(balance)}</strong></div>}
      </div>
      <div className="bc-actions" onClick={e => e.stopPropagation()}>
        {balance > 0 && (
          <button className="bc-btn pay-btn" title="Add Payment" onClick={() => onAddPayment(bill)}>
            💰 Pay
          </button>
        )}
        <button className="bc-btn dup-btn" title="Copy this bill" onClick={() => onDuplicate(bill)}>
          📋 Copy
        </button>
        {bill.phone && (
          <button className="btn-wa-small" onClick={() => onSend(bill)}>
            <WAIcon size={13} /> PDF
          </button>
        )}
        <button className="bc-btn del-btn" title="Delete" onClick={() => onDelete(bill.id)}>🗑</button>
      </div>
    </div>
  );
}

// ─── Receipt View ─────────────────────────────────────────────────────────────
function ReceiptView({ bill, shop, onSend, onBack, generating, onAddPayment }) {
  const totalPaid = getBillPaid(bill);
  const balance   = getBillBalance(bill);
  return (
    <div className="receipt-overlay fade-in">
      <div className="receipt-topbar no-print">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <span className="receipt-title">{bill.billNo}</span>
        <span />
      </div>

      {/* Paper receipt — converted to PDF */}
      <div className="receipt-paper" id="print-area">
        <div className="rcp-shop-header">
          <div className="rcp-shop-name">{shop.name}</div>
          <div className="rcp-shop-info">{shop.address}</div>
          <div className="rcp-shop-info">📞 {shop.phone}</div>
        </div>
        <div className="rcp-divider" />
        <div className="rcp-meta-row">
          <div><span>Customer</span><strong>{bill.customer}</strong></div>
          <div><span>Bill No</span><strong>{bill.billNo}</strong></div>
          <div><span>Date</span><strong>{bill.date}</strong></div>
          {bill.phone && <div><span>Phone</span><strong>{bill.phone}</strong></div>}
        </div>
        <div className="rcp-divider" />
        <table className="rcp-table">
          <thead>
            <tr><th>S.No</th><th>Item</th><th>Qty</th><th>Amount (₹)</th></tr>
          </thead>
          <tbody>
            {bill.items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{item.name}</td>
                <td>{item.qty} {item.unit}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{(item.qty * item.rate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rcp-divider" />

        {/* Totals */}
        <div className="rcp-totals">
          <div className="rcp-total-row"><span>Total</span><span>{fmt(bill.total)}</span></div>
          <div className="rcp-total-row"><span>Paid</span><span>{fmt(totalPaid)}</span></div>
          <div className={`rcp-total-row rcp-balance${balance > 0 ? ' due' : ''}`}>
            <span>Balance</span><span>{fmt(balance)}</span>
          </div>
        </div>

        {/* Payment history (multiple payments) */}
        {bill.payments?.length > 0 && (
          <div className="rcp-payment-history">
            <div className="rcp-ph-title">Payment History</div>
            {bill.payments.map((p, i) => (
              <div key={p.id || i} className="rcp-ph-row">
                <span>{p.type === 'advance' ? '⏩' : '✅'}</span>
                <span>{p.date}</span>
                <span className="rcp-ph-note">{p.note || (p.type === 'advance' ? 'Advance' : 'Payment')}</span>
                <span className="rcp-ph-amt">{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {bill.remarks && <div className="rcp-remarks"><span>Remarks: </span>{bill.remarks}</div>}
        <div className="rcp-words">
          {balance > 0
            ? <em>Balance: {numberToWords(balance)}</em>
            : <em>Amount: {numberToWords(bill.total)}</em>}
        </div>
        <div className="rcp-divider" />
        <div className="rcp-footer">
          <span>Thank You 🙏</span>
          <span className="rcp-signature">Signature: ___________</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="receipt-actions no-print">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        {balance > 0 && (
          <button className="btn-add-payment" onClick={() => onAddPayment(bill)}>💰 Add Payment</button>
        )}
        <button className="btn-print" onClick={() => window.print()}>🖨️ Print</button>
        <button className="btn-wa" onClick={() => onSend(bill)} disabled={generating}>
          {generating ? <><span className="spinner" /> Generating…</> : <><WAIcon /> Send PDF</>}
        </button>
      </div>
    </div>
  );
}

// ─── Products Page ─────────────────────────────────────────────────────────
function ProductsPage({ products, setProducts }) {
  const [search, setSearch] = useState('');
  const [form, setForm]     = useState({ name: '', rate: '', unit: 'pcs' });
  const [editId, setEditId] = useState(null);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = () => {
    if (!form.name.trim() || !form.rate) return;
    if (editId) {
      setProducts(prev => prev.map(p => p.id === editId ? { ...p, ...form, rate: parseFloat(form.rate) } : p));
      setEditId(null);
    } else {
      setProducts(prev => [{ id: uid(), name: form.name.trim(), rate: parseFloat(form.rate), unit: form.unit }, ...prev]);
    }
    setForm({ name: '', rate: '', unit: 'pcs' });
  };

  const startEdit = p => { setForm({ name: p.name, rate: String(p.rate), unit: p.unit }); setEditId(p.id); };
  const cancelEdit = () => { setForm({ name: '', rate: '', unit: 'pcs' }); setEditId(null); };
  const deleteProduct = id => { if (window.confirm('Delete product?')) setProducts(prev => prev.filter(p => p.id !== id)); };

  return (
    <div className="fade-in tab-pane">
      <div className="page-header">
        <h1>📦 Product Catalog</h1>
        <p>Save your products — click to instantly add them to any bill</p>
      </div>

      <div className="catalog-form">
        <input placeholder="Product name *" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && handleSave()} />
        <input type="number" placeholder="Rate (₹) *" min="0" step="0.01" inputMode="decimal"
          value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />
        <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
          {UNITS.map(u => <option key={u}>{u}</option>)}
        </select>
        <button className="btn-primary" onClick={handleSave}>{editId ? '✅ Update' : '+ Add'}</button>
        {editId && <button className="btn-ghost" onClick={cancelEdit}>Cancel</button>}
      </div>

      <input className="list-search" placeholder="🔍 Search products…"
        value={search} onChange={e => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <p>{search ? 'No products match.' : 'No products yet. Add your first product above!'}</p>
        </div>
      ) : (
        <div className="catalog-list">
          {filtered.map(p => (
            <div key={p.id} className="catalog-item">
              <div className="ci-info">
                <div className="ci-name">{p.name}</div>
                <div className="ci-meta">{fmt(p.rate)} / {p.unit}</div>
              </div>
              <div className="ci-actions">
                <button className="ci-btn edit-btn" onClick={() => startEdit(p)} title="Edit">✏️</button>
                <button className="ci-btn del-btn" onClick={() => deleteProduct(p.id)} title="Delete">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Customers Page ───────────────────────────────────────────────────────────
function CustomersPage({ customers, setCustomers, bills }) {
  const [search, setSearch] = useState('');
  const [form, setForm]     = useState({ name: '', phone: '' });
  const [editId, setEditId] = useState(null);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editId) {
      setCustomers(prev => prev.map(c => c.id === editId ? { ...c, ...form } : c));
      setEditId(null);
    } else {
      setCustomers(prev => [{ id: uid(), name: form.name.trim(), phone: form.phone.trim() }, ...prev]);
    }
    setForm({ name: '', phone: '' });
  };

  const startEdit = c => { setForm({ name: c.name, phone: c.phone || '' }); setEditId(c.id); };
  const cancelEdit = () => { setForm({ name: '', phone: '' }); setEditId(null); };
  const deleteCustomer = id => { if (window.confirm('Delete customer?')) setCustomers(prev => prev.filter(c => c.id !== id)); };

  const getStats = c => {
    const cb = bills.filter(b => b.customer === c.name || (c.phone && b.phone === c.phone));
    return { count: cb.length, balance: cb.reduce((s, b) => s + getBillBalance(b), 0) };
  };

  return (
    <div className="fade-in tab-pane">
      <div className="page-header">
        <h1>👥 Customer Book</h1>
        <p>Save customers — auto-fill name & number when making bills</p>
      </div>

      <div className="catalog-form">
        <input placeholder="Customer name *" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && handleSave()} />
        <input placeholder="WhatsApp number" maxLength={10} inputMode="numeric"
          value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} />
        <button className="btn-primary" onClick={handleSave}>{editId ? '✅ Update' : '+ Add'}</button>
        {editId && <button className="btn-ghost" onClick={cancelEdit}>Cancel</button>}
      </div>

      <input className="list-search" placeholder="🔍 Search customers…"
        value={search} onChange={e => setSearch(e.target.value)} />

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>{search ? 'No customers match.' : 'No customers yet. Add your first customer above!'}</p>
        </div>
      ) : (
        <div className="catalog-list">
          {filtered.map(c => {
            const stats = getStats(c);
            return (
              <div key={c.id} className="catalog-item">
                <div className="ci-info">
                  <div className="ci-name">{c.name}</div>
                  <div className="ci-meta">
                    {c.phone && <span>📞 {c.phone}</span>}
                    {stats.count > 0 && <span> · {stats.count} bill{stats.count !== 1 ? 's' : ''}</span>}
                    {stats.balance > 0 && <span className="ci-balance"> · Due: {fmt(stats.balance)}</span>}
                  </div>
                </div>
                <div className="ci-actions">
                  <button className="ci-btn edit-btn" onClick={() => startEdit(c)}>✏️</button>
                  <button className="ci-btn del-btn" onClick={() => deleteCustomer(c.id)}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  // Theme
  const [darkMode, setDarkMode] = useState(() => {
    const s = localStorage.getItem('theme');
    return s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Core data
  const [tab, setTab]           = useState('new-bill');
  const [shop, setShop]         = useState(() => JSON.parse(localStorage.getItem('shopSettings') || JSON.stringify(DEFAULT_SHOP)));
  const [bills, setBills]       = useState(() => (JSON.parse(localStorage.getItem('bills') || '[]')).map(normalizeBill));
  const [products, setProducts] = useState(() => JSON.parse(localStorage.getItem('products') || '[]'));
  const [customers, setCustomers] = useState(() => JSON.parse(localStorage.getItem('customers') || '[]'));

  // UI state
  const [viewBill, setViewBill]       = useState(null);
  const [generating, setGenerating]   = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [billSearch, setBillSearch]   = useState('');

  // New Bill form
  const [customer, setCustomer]       = useState('');
  const [custPhone, setCustPhone]     = useState('');
  const [date, setDate]               = useState(todayStr());
  const [items, setItems]             = useState([{ ...EMPTY_ITEM }]);
  const [paid, setPaid]               = useState('');
  const [paymentType, setPaymentType] = useState('paid');
  const [remarks, setRemarks]         = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCustDrop, setShowCustDrop]   = useState(false);

  // Settings
  const [shopEdit, setShopEdit]   = useState(shop);
  const [shopSaved, setShopSaved] = useState(false);

  // Persist all data
  useEffect(() => { localStorage.setItem('bills',        JSON.stringify(bills));    }, [bills]);
  useEffect(() => { localStorage.setItem('products',     JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('customers',    JSON.stringify(customers));}, [customers]);
  useEffect(() => { localStorage.setItem('shopSettings', JSON.stringify(shop));     }, [shop]);

  // Computed values
  const total      = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0);
  const paidAmt    = parseFloat(paid) || 0;
  const balance    = Math.max(0, total - paidAmt);
  const validItems = items.filter(i => i.name.trim() && i.qty && i.rate);
  const pendingBills   = bills.filter(b => getBillBalance(b) > 0);
  const filteredBills  = billSearch
    ? bills.filter(b =>
        b.customer.toLowerCase().includes(billSearch.toLowerCase()) ||
        b.billNo.toLowerCase().includes(billSearch.toLowerCase()) ||
        (b.phone && b.phone.includes(billSearch)))
    : bills;
  const filteredProducts = productSearch
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : products.slice(0, 10);

  // Customer autocomplete
  const custMatches = (showCustDrop && customer.trim())
    ? customers.filter(c => c.name.toLowerCase().includes(customer.toLowerCase())).slice(0, 6)
    : [];

  // ── Item handlers ──────────────────────────────────────────────────────────
  const setItem    = (idx, f, v) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [f]: v } : it));
  const addItem    = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = idx => setItems(prev => prev.filter((_, i) => i !== idx));

  // Add product from catalog → items table
  const addProductToItems = product => {
    const existIdx = items.findIndex(it => it.name === product.name);
    if (existIdx >= 0) {
      setItem(existIdx, 'qty', String((parseFloat(items[existIdx].qty) || 0) + 1));
    } else {
      const emptyIdx = items.findIndex(it => !it.name.trim());
      if (emptyIdx >= 0) {
        setItems(prev => prev.map((it, i) => i === emptyIdx
          ? { name: product.name, qty: '1', rate: String(product.rate), unit: product.unit } : it));
      } else {
        setItems(prev => [...prev, { name: product.name, qty: '1', rate: String(product.rate), unit: product.unit }]);
      }
    }
    setProductSearch('');
  };

  // ── Generate bill ──────────────────────────────────────────────────────────
  const handleGenerate = () => {
    if (!customer.trim() || validItems.length === 0) return;
    const initialPayments = paidAmt > 0
      ? [{ id: uid(), amount: paidAmt, type: paymentType, date, note: '' }]
      : [];
    const newBill = {
      id: Date.now(), billNo: nextBillNo(bills),
      customer: customer.trim(), phone: custPhone.trim(), date,
      items: validItems, total,
      payments: initialPayments,
      paid: paidAmt, paymentType, balance,
      remarks: remarks.trim(),
      createdAt: new Date().toISOString(),
    };
    // Auto-save new customer
    if (custPhone.trim() && !customers.find(c => c.phone === custPhone.trim())) {
      setCustomers(prev => [{ id: uid(), name: customer.trim(), phone: custPhone.trim() }, ...prev]);
    }
    setBills(prev => [newBill, ...prev]);
    setViewBill(newBill);
  };

  // ── Add partial payment to existing bill ───────────────────────────────────
  const handleAddPayment = (bill, payment) => {
    setBills(prev => prev.map(b => {
      if (b.id !== bill.id) return b;
      const newPayments = [...(b.payments || []), payment];
      const newPaid     = newPayments.reduce((s, p) => s + p.amount, 0);
      const newBalance  = Math.max(0, b.total - newPaid);
      const updated = { ...b, payments: newPayments, paid: newPaid, balance: newBalance };
      if (viewBill?.id === b.id) setViewBill(updated); // keep receipt view in sync
      return updated;
    }));
  };

  // ── Duplicate bill → prefill form ─────────────────────────────────────────
  const handleDuplicate = bill => {
    setCustomer(bill.customer);
    setCustPhone(bill.phone || '');
    setDate(todayStr());
    setItems(bill.items.map(it => ({ ...it })));
    setPaid(''); setPaymentType('paid');
    setRemarks(bill.remarks || '');
    setViewBill(null); setTab('new-bill');
  };

  // ── Send PDF ───────────────────────────────────────────────────────────────
  const handleSendPDF = async bill => {
    setGenerating(true);
    try { await generateAndSharePDF(bill, shop); }
    catch (e) { alert('Could not generate PDF. Please try again.'); console.error(e); }
    finally { setGenerating(false); }
  };

  // ── Delete bill ────────────────────────────────────────────────────────────
  const deleteBill = id => {
    if (window.confirm('Delete this bill?')) {
      setBills(prev => prev.filter(b => b.id !== id));
      if (viewBill?.id === id) setViewBill(null);
    }
  };

  // ── Clear form ─────────────────────────────────────────────────────────────
  const clearForm = () => {
    setCustomer(''); setCustPhone(''); setDate(todayStr());
    setItems([{ ...EMPTY_ITEM }]); setPaid(''); setPaymentType('paid');
    setRemarks(''); setViewBill(null); setProductSearch('');
  };

  // ── Save settings ──────────────────────────────────────────────────────────
  const saveSettings = () => {
    setShop(shopEdit); setShopSaved(true);
    setTimeout(() => setShopSaved(false), 2500);
  };

  const navTo = id => { setTab(id); setViewBill(null); setPaymentTarget(null); };

  const NAV_ITEMS = [
    { id: 'new-bill',  icon: '➕', label: 'New Bill' },
    { id: 'pending',   icon: '⏳', label: 'Pending',   badge: pendingBills.length },
    { id: 'history',   icon: '📋', label: 'Bills' },
    { id: 'products',  icon: '📦', label: 'Products' },
    { id: 'customers', icon: '👥', label: 'Customers' },
    { id: 'settings',  icon: '⚙️', label: 'Settings' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar no-print">
        <div className="logo">
          <span className="logo-icon">🧾</span>
          <span className="logo-text">E-Bill</span>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map(n => (
            <button key={n.id} id={`nav-${n.id}`}
              className={`nav-item${tab === n.id ? ' active' : ''}`}
              onClick={() => navTo(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
              {n.badge > 0 && <span className="nav-badge">{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button id="theme-toggle" className="theme-toggle" onClick={() => setDarkMode(d => !d)}>
            <span>{darkMode ? '☀️' : '🌙'}</span>
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <div className="sidebar-shop">{shop.name}</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">
        {/* Mobile topbar */}
        <div className="topbar no-print">
          <div className="topbar-title">
            <span className="topbar-logo">🧾</span>
            <span>E-Bill</span>
          </div>
          <button id="theme-toggle-mobile" className="theme-toggle-mobile" onClick={() => setDarkMode(d => !d)}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* ══ NEW BILL ══ */}
        {tab === 'new-bill' && !viewBill && (
          <div className="fade-in tab-pane">
            <div className="page-header">
              <h1>Create New Bill</h1>
              <p>Fill details → Generate → Send to WhatsApp</p>
            </div>

            <div className="bill-paper">
              {/* Shop header */}
              <div className="bp-shop-header">
                <div className="bp-shop-name">{shop.name}</div>
                <div className="bp-shop-info">{shop.address}</div>
                <div className="bp-shop-info">📞 {shop.phone}</div>
              </div>

              {/* Customer row */}
              <div className="bp-customer-row">
                {/* Customer name with autocomplete */}
                <div className="field-group" style={{ position: 'relative' }}>
                  <label htmlFor="f-customer">Customer Name <span className="req">*</span></label>
                  <input id="f-customer" placeholder="Type or pick from book"
                    value={customer} autoComplete="off"
                    onChange={e => { setCustomer(e.target.value); setShowCustDrop(true); }}
                    onBlur={() => setTimeout(() => setShowCustDrop(false), 180)}
                    onFocus={() => customer.trim() && setShowCustDrop(true)}
                  />
                  {custMatches.length > 0 && (
                    <div className="customer-dropdown">
                      {custMatches.map(c => (
                        <div key={c.id} className="cust-option"
                          onMouseDown={() => { setCustomer(c.name); setCustPhone(c.phone || ''); setShowCustDrop(false); }}>
                          <span className="cust-opt-name">{c.name}</span>
                          {c.phone && <span className="cust-opt-phone">{c.phone}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="field-group">
                  <label htmlFor="f-phone">WhatsApp Number</label>
                  <input id="f-phone" placeholder="10-digit number" maxLength={10} inputMode="numeric"
                    value={custPhone} onChange={e => setCustPhone(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div className="field-group">
                  <label htmlFor="f-date">Date</label>
                  <input id="f-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>

              {/* Product Quick-Add (only if catalog has items) */}
              {products.length > 0 && (
                <div className="product-quickadd">
                  <input className="pqa-search"
                    placeholder="🔍 Quick add from product catalog…"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                  />
                  {productSearch && (
                    <div className="pqa-chips">
                      {filteredProducts.length === 0
                        ? <span className="pqa-empty">No products found</span>
                        : filteredProducts.map(p => (
                          <button key={p.id} className="pqa-chip" onClick={() => addProductToItems(p)}>
                            + {p.name} <span className="pqa-rate">{fmt(p.rate)}/{p.unit}</span>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              )}

              {/* Items table */}
              <div className="table-scroll">
                <table className="items-tbl">
                  <thead>
                    <tr>
                      <th className="col-sno">S.No</th>
                      <th className="col-item">Items</th>
                      <th className="col-qty">Qty</th>
                      <th className="col-unit">Unit</th>
                      <th className="col-rate">Rate (₹)</th>
                      <th className="col-amt">Amount (₹)</th>
                      <th className="col-del"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="sno-cell">{idx + 1}</td>
                        <td><input className="tbl-input" placeholder="Item name"
                          value={item.name} onChange={e => setItem(idx, 'name', e.target.value)} /></td>
                        <td><input className="tbl-input tbl-num" type="number" min="0"
                          placeholder="0" inputMode="decimal"
                          value={item.qty} onChange={e => setItem(idx, 'qty', e.target.value)} /></td>
                        <td>
                          <select className="tbl-select" value={item.unit}
                            onChange={e => setItem(idx, 'unit', e.target.value)}>
                            {UNITS.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td><input className="tbl-input tbl-num" type="number" min="0" step="0.01"
                          placeholder="0.00" inputMode="decimal"
                          value={item.rate} onChange={e => setItem(idx, 'rate', e.target.value)} /></td>
                        <td className="amt-cell">
                          {((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)).toFixed(2)}
                        </td>
                        <td className="del-cell">
                          {items.length > 1 && (
                            <button className="del-row-btn" onClick={() => removeItem(idx)}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button id="add-item-btn" className="add-row-btn" onClick={addItem}>+ Add Item</button>

              {/* Totals */}
              <div className="bp-totals">
                <div className="bp-total-row">
                  <span>Total</span>
                  <span className="bp-total-val">{fmt(total)}</span>
                </div>
                <div className="bp-total-row">
                  <div className="pay-type-group">
                    <button id="type-paid" type="button"
                      className={`pay-type-btn${paymentType === 'paid' ? ' selected-paid' : ''}`}
                      onClick={() => setPaymentType('paid')}>✅ Paid</button>
                    <button id="type-advance" type="button"
                      className={`pay-type-btn${paymentType === 'advance' ? ' selected-advance' : ''}`}
                      onClick={() => setPaymentType('advance')}>⏩ Advance</button>
                  </div>
                  <input id="paid-input" className="paid-input" type="number" min="0" step="0.01"
                    placeholder="0.00" inputMode="decimal" value={paid}
                    onChange={e => setPaid(e.target.value)} />
                </div>
                <div className={`bp-total-row balance-row${balance > 0 ? ' has-balance' : ' no-balance'}`}>
                  <span>Balance</span>
                  <span className="balance-val">{fmt(balance)}</span>
                </div>
              </div>

              {/* Remarks */}
              <div className="remarks-field">
                <label htmlFor="f-remarks">Remarks (optional)</label>
                <input id="f-remarks" placeholder="e.g. Payment due by 30th…"
                  value={remarks} onChange={e => setRemarks(e.target.value)} />
              </div>

              {balance > 0 && (
                <div className="words-section">
                  <span className="words-label">Balance in Words: </span>
                  <span className="words-text">{numberToWords(balance)}</span>
                </div>
              )}
              <div className="bp-footer-text">Thank You 🙏</div>
            </div>

            <div className="form-actions">
              <button id="clear-form-btn" className="btn-ghost" onClick={clearForm}>🗑 Clear</button>
              <button id="generate-bill-btn" className="btn-primary"
                disabled={!customer.trim() || validItems.length === 0}
                onClick={handleGenerate}>
                Generate Bill →
              </button>
            </div>
          </div>
        )}

        {tab === 'new-bill' && viewBill && (
          <ReceiptView bill={viewBill} shop={shop} onSend={handleSendPDF} onBack={clearForm}
            generating={generating} onAddPayment={b => setPaymentTarget(b)} />
        )}

        {/* ══ PENDING ══ */}
        {tab === 'pending' && !viewBill && (
          <div className="fade-in tab-pane">
            <div className="page-header">
              <h1>⏳ Pending Balances</h1>
              <p>{pendingBills.length} customer{pendingBills.length !== 1 ? 's' : ''} with outstanding balance</p>
            </div>
            {pendingBills.length === 0
              ? <div className="empty-state"><div className="empty-icon">✅</div><p>No pending balances! 🎉</p></div>
              : <div className="cards-grid">{pendingBills.map(b => (
                  <BillCard key={b.id} bill={b} onView={setViewBill} onSend={handleSendPDF}
                    onDelete={deleteBill} onAddPayment={b => setPaymentTarget(b)} onDuplicate={handleDuplicate} />
                ))}</div>
            }
          </div>
        )}
        {tab === 'pending' && viewBill && (
          <ReceiptView bill={viewBill} shop={shop} onSend={handleSendPDF} onBack={() => setViewBill(null)}
            generating={generating} onAddPayment={b => setPaymentTarget(b)} />
        )}

        {/* ══ ALL BILLS ══ */}
        {tab === 'history' && !viewBill && (
          <div className="fade-in tab-pane">
            <div className="page-header">
              <h1>📋 All Bills</h1>
              <p>{bills.length} bill{bills.length !== 1 ? 's' : ''} generated</p>
            </div>
            <input className="list-search" placeholder="🔍 Search by name, bill no or phone…"
              value={billSearch} onChange={e => setBillSearch(e.target.value)} />
            {filteredBills.length === 0
              ? <div className="empty-state"><div className="empty-icon">📄</div>
                  <p>{billSearch ? 'No bills match your search.' : 'No bills yet. Create your first bill!'}</p></div>
              : <div className="cards-grid">{filteredBills.map(b => (
                  <BillCard key={b.id} bill={b} onView={setViewBill} onSend={handleSendPDF}
                    onDelete={deleteBill} onAddPayment={b => setPaymentTarget(b)} onDuplicate={handleDuplicate} />
                ))}</div>
            }
          </div>
        )}
        {tab === 'history' && viewBill && (
          <ReceiptView bill={viewBill} shop={shop} onSend={handleSendPDF} onBack={() => setViewBill(null)}
            generating={generating} onAddPayment={b => setPaymentTarget(b)} />
        )}

        {/* ══ PRODUCTS ══ */}
        {tab === 'products' && <ProductsPage products={products} setProducts={setProducts} />}

        {/* ══ CUSTOMERS ══ */}
        {tab === 'customers' && <CustomersPage customers={customers} setCustomers={setCustomers} bills={bills} />}

        {/* ══ SETTINGS ══ */}
        {tab === 'settings' && (
          <div className="fade-in tab-pane">
            <div className="page-header">
              <h1>⚙️ Shop Settings</h1>
              <p>This info appears on every bill</p>
            </div>
            <div className="settings-card">
              <div className="field-group">
                <label htmlFor="s-name">Shop Name</label>
                <input id="s-name" placeholder="e.g. Ram General Store"
                  value={shopEdit.name} onChange={e => setShopEdit(s => ({ ...s, name: e.target.value }))} />
              </div>
              <div className="field-group">
                <label htmlFor="s-addr">Address</label>
                <textarea id="s-addr" rows={2} placeholder="e.g. 12, Main Bazaar, City"
                  value={shopEdit.address} onChange={e => setShopEdit(s => ({ ...s, address: e.target.value }))} />
              </div>
              <div className="field-group">
                <label htmlFor="s-phone">Phone Number</label>
                <input id="s-phone" placeholder="e.g. 9876543210" inputMode="tel"
                  value={shopEdit.phone} onChange={e => setShopEdit(s => ({ ...s, phone: e.target.value }))} />
              </div>
              <button id="save-settings-btn" className="btn-primary" onClick={saveSettings}>
                {shopSaved ? '✅ Saved!' : '💾 Save Settings'}
              </button>
            </div>
            <div className="settings-info">
              <h3>📲 How WhatsApp PDF Sharing Works</h3>
              <ol>
                <li>Enter the customer's <strong>WhatsApp number</strong> on the bill</li>
                <li>Click <strong>"Generate Bill"</strong></li>
                <li>Click <strong>"Send PDF to WhatsApp"</strong></li>
                <li><strong>Android:</strong> Share sheet → pick WhatsApp → Send ✅<br/>
                    <strong>Desktop:</strong> PDF downloads → WhatsApp Web opens</li>
              </ol>
              <p className="info-note">📌 India +91 code is added automatically</p>
            </div>
          </div>
        )}
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="bottom-nav no-print">
        {NAV_ITEMS.map(n => (
          <button key={n.id} id={`bnav-${n.id}`}
            className={`bnav-item${tab === n.id ? ' active' : ''}`}
            onClick={() => navTo(n.id)}>
            <span className="bnav-icon">{n.icon}</span>
            <span className="bnav-label">{n.label}</span>
            {n.badge > 0 && <span className="bnav-badge">{n.badge}</span>}
          </button>
        ))}
      </nav>

      {/* ── Payment Modal ── */}
      {paymentTarget && (
        <PaymentModal
          bill={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onAdd={payment => { handleAddPayment(paymentTarget, payment); setPaymentTarget(null); }}
        />
      )}
    </div>
  );
}
