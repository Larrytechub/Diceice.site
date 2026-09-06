import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CandlestickChart,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Crosshair,
  Gauge,
  LayoutDashboard,
  LineChart,
  LogIn,
  LoaderCircle,
  Menu,
  Radar,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import {
  getGetDashboardQueryKey,
  getGetPaperOrdersQueryKey,
  getGetScannerSignalsQueryKey,
  useCreatePaperOrder,
  useGetBulkPresets,
  useGetDashboard,
  useGetPaperOrders,
  useGetScannerSignals,
  useGetSymbolAnalysis,
  usePreviewBulkTrade,
} from '@workspace/api-client-react';
import type {
  BulkPreset,
  BulkTradeInput,
  BulkTradePreview,
  PaperOrder,
  ScannerSignal,
  SymbolAnalysis,
} from '@workspace/api-client-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const shortTime = (value?: string) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'green' | 'amber' | 'red' | 'slate' | 'blue' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function Button({ children, className = '', variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'outline' | 'danger' }) {
  return <button className={`ui-button button-${variant} ${className}`} {...props}>{children}</button>;
}

function LoadingRows({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => <div className="skeleton-row" key={i}><span /><span /><span /></div>)}
  </div>;
}

function QueryError({ onRetry, message = 'The market feed did not answer.' }: { onRetry: () => void; message?: string }) {
  return <div className="empty-state"><CircleAlert size={22} /><strong>{message}</strong><p>Try the request again before making a decision.</p><Button variant="outline" onClick={onRetry} data-testid="button-retry"><RefreshCw size={14} /> Retry</Button></div>;
}

function MetricCard({ label, value, helper, icon: Icon, tone = 'mint', testId }: { label: string; value: string; helper: string; icon: typeof WalletCards; tone?: string; testId: string }) {
  return <article className={`metric-card metric-${tone}`} data-testid={testId}>
    <div className="metric-top"><span>{label}</span><Icon size={16} /></div>
    <strong>{value}</strong>
    <small>{helper}</small>
  </article>;
}

const navItems = [
  { href: '/', label: 'Command center', icon: LayoutDashboard },
  { href: '/scanner', label: 'Market scanner', icon: Radar },
  { href: '/bulk-trading', label: 'Batch builder', icon: LayersIcon },
  { href: '/analysis', label: 'Chart room', icon: CandlestickChart },
  { href: '/login', label: 'Login loaders', icon: LogIn },
];

function LayersIcon(props: { size?: number }) {
  return <BarChart3 {...props} />;
}

type LoaderChoice = 'orbit' | 'scan' | 'bars' | 'radar';

const loaderChoices: Array<{
  id: LoaderChoice;
  name: string;
  detail: string;
  accent: string;
}> = [
  { id: 'orbit', name: 'Signal orbit', detail: 'Quiet and polished', accent: 'Mint' },
  { id: 'scan', name: 'Tape scan', detail: 'Fast and directional', accent: 'Amber' },
  { id: 'bars', name: 'Pulse bars', detail: 'Clear progress signal', accent: 'Blue' },
  { id: 'radar', name: 'Radar sweep', detail: 'Market-aware motion', accent: 'Coral' },
];

function LoaderVisual({ variant, compact = false }: { variant: LoaderChoice; compact?: boolean }) {
  return <div className={`loader-visual loader-${variant} ${compact ? 'loader-compact' : ''}`} aria-hidden="true">
    {variant === 'orbit' && <><span className="loader-orbit-ring" /><span className="loader-orbit-core" /></>}
    {variant === 'scan' && <><span className="loader-scan-track" /><span className="loader-scan-line" /></>}
    {variant === 'bars' && <><span /><span /><span /><span /><span /></>}
    {variant === 'radar' && <><span className="loader-radar-circle" /><span className="loader-radar-sweep" /><span className="loader-radar-dot dot-one" /><span className="loader-radar-dot dot-two" /></>}
  </div>;
}

function LoginPage() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<LoaderChoice>(() => {
    if (typeof window === 'undefined') return 'orbit';
    const saved = window.localStorage.getItem('vector-login-loader');
    return loaderChoices.some((choice) => choice.id === saved) ? saved as LoaderChoice : 'orbit';
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const selectedChoice = loaderChoices.find((choice) => choice.id === selected) ?? loaderChoices[0];

  const chooseLoader = (choice: LoaderChoice) => {
    setSelected(choice);
    window.localStorage.setItem('vector-login-loader', choice);
    setIsLoggingIn(false);
  };

  const enterDesk = () => {
    setIsLoggingIn(true);
    window.setTimeout(() => setLocation('/'), 1500);
  };

  return <div className="login-shell">
    <div className="login-noise" />
    <div className="login-brand">
      <div className="brand-mark"><Crosshair size={20} strokeWidth={2.6} /></div>
      <div><strong>VECTOR / D</strong><span>paper intelligence</span></div>
    </div>
    <main className="login-card">
      <div className="login-copy">
        <p className="eyebrow">Desk entry / loader studio</p>
        <h2>Choose how your desk <em>comes online.</em></h2>
        <p>Pick a loading motion for the sign-in experience. Your choice is saved on this device and used when entering the paper environment.</p>
      </div>
      <section className="loader-preview">
        <div className="loader-preview-top"><span>Preview</span><Pill tone="green">Selected · {selectedChoice.name}</Pill></div>
        <div className="loader-preview-stage">
          {isLoggingIn ? <><LoaderVisual variant={selected} /><strong>Opening your paper desk</strong><span>Checking feed context and guardrails</span></> : <><LoaderVisual variant={selected} /><strong>{selectedChoice.name}</strong><span>{selectedChoice.detail} · {selectedChoice.accent} signal family</span></>}
        </div>
      </section>
      <section className="loader-picker" aria-label="Choose a login loader">
        <div className="loader-picker-heading"><span>Available motions</span><small>{loaderChoices.length} options</small></div>
        <div className="loader-grid">
          {loaderChoices.map((choice) => <button key={choice.id} className={`loader-option ${selected === choice.id ? 'loader-option-selected' : ''}`} onClick={() => chooseLoader(choice.id)} aria-pressed={selected === choice.id} data-testid={`button-loader-${choice.id}`}>
            <div className="loader-option-visual"><LoaderVisual variant={choice.id} compact /></div>
            <div><strong>{choice.name}</strong><span>{choice.detail}</span></div>
            {selected === choice.id && <Check size={15} />}
          </button>)}
        </div>
      </section>
      <div className="login-actions">
        <button className="login-enter-button" onClick={enterDesk} disabled={isLoggingIn} data-testid="button-enter-desk">
          {isLoggingIn ? <><LoaderCircle size={16} className="spin" /> Entering desk...</> : <><LogIn size={16} /> Preview sign in</>}
        </button>
        <span><ShieldCheck size={13} /> Paper environment · no live trades</span>
      </div>
    </main>
    <div className="login-footer"><span>VECTOR / D</span><span>Loader preference · {selectedChoice.name}</span><Link href="/" data-testid="link-back-dashboard">Back to dashboard</Link></div>
  </div>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = navItems.find((item) => item.href === location)?.label ?? 'Command center';
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-lockup">
        <div className="brand-mark"><Crosshair size={20} strokeWidth={2.6} /></div>
        <div><strong>VECTOR / D</strong><span>paper intelligence</span></div>
        <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation"><X size={18} /></button>
      </div>
      <div className="environment"><span className="live-dot" /> PAPER ENVIRONMENT <span className="env-caret">⌄</span></div>
      <nav className="main-nav" aria-label="Main navigation">
        <p className="nav-label">Workspace</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return <Link href={item.href} onClick={() => setMobileOpen(false)} className={`nav-item ${location === item.href ? 'nav-active' : ''}`} data-testid={`link-${item.label.toLowerCase().replaceAll(' ', '-')}`} key={item.href}><Icon size={17} /><span>{item.label}</span>{item.href === '/scanner' && <i>6</i>}</Link>;
        })}
      </nav>
      <div className="sidebar-spacer" />
      <div className="guard-card"><ShieldCheck size={18} /><div><strong>Guardrails on</strong><span>Paper orders only</span></div><span className="guard-check"><Check size={12} /></span></div>
      <div className="profile-chip"><div className="avatar">AV</div><div><strong>Avery Vale</strong><span>Desk operator</span></div><ChevronDown size={15} /></div>
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-sidebar-backdrop" />}
    <main className="workspace">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={20} /></button>
        <div><span className="eyebrow">VECTOR / D</span><h1>{current}</h1></div>
        <div className="topbar-actions"><div className="feed-chip"><span className="live-dot" /> Feed nominal</div><button className="icon-button" aria-label="Notifications" data-testid="button-notifications"><Bell size={18} /><i /></button><div className="top-avatar">AV</div></div>
      </header>
      <div className="page-content">{children}</div>
    </main>
  </div>;
}

function DashboardPage() {
  const dashboard = useGetDashboard();
  const orders = useGetPaperOrders();
  const signals = useGetScannerSignals({ limit: 6 });
  const queryClient = useQueryClient();
  const snapshot = dashboard.data;
  const orderRows = orders.data ?? [];
  const signalRows = signals.data ?? [];
  return <Shell><div className="page-intro"><div><p className="eyebrow">Tuesday / 14:32 UTC</p><h2>Read the tape.<br /><em>Keep the edge.</em></h2><p className="intro-copy">A compact view of your paper desk, live scanner conviction, and what needs a second look.</p></div><div className="intro-actions"><Button variant="quiet" onClick={() => { void queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetScannerSignalsQueryKey({ limit: 6 }) }); }} data-testid="button-refresh-dashboard"><RefreshCw size={15} /> Refresh feed</Button><Link href="/bulk-trading" className="ui-button button-primary" data-testid="link-build-batch"><Zap size={15} /> Build a batch</Link></div></div>
    {dashboard.isLoading ? <LoadingRows rows={1} /> : dashboard.isError ? <QueryError onRetry={() => void dashboard.refetch()} /> : snapshot && <div className="metric-grid">
      <MetricCard label="Paper balance" value={money(snapshot.balance)} helper="Available simulation capital" icon={WalletCards} tone="mint" testId="metric-balance" />
      <MetricCard label="Today’s P&L" value={money(snapshot.dailyPnl)} helper={`${snapshot.dailyPnl >= 0 ? 'Positive session' : 'Drawdown in session'}`} icon={snapshot.dailyPnl >= 0 ? TrendingUp : TrendingDown} tone={snapshot.dailyPnl >= 0 ? 'mint' : 'coral'} testId="metric-pnl" />
      <MetricCard label="Win rate" value={`${snapshot.winRate.toFixed(1)}%`} helper="Settled paper orders" icon={Target} tone="amber" testId="metric-win-rate" />
      <MetricCard label="Open positions" value={String(snapshot.openPositions).padStart(2, '0')} helper={`${snapshot.activeSignals} active scanner signals`} icon={Activity} tone="blue" testId="metric-open-positions" />
    </div>}
    <div className="dashboard-grid">
      <section className="panel signal-panel"><div className="panel-heading"><div><p className="eyebrow">Signal radar</p><h3>Highest conviction now</h3></div><Link href="/scanner" className="text-link" data-testid="link-see-all-signals">See all <ArrowUpRight size={14} /></Link></div>
        {signals.isLoading ? <LoadingRows /> : signals.isError ? <QueryError onRetry={() => void signals.refetch()} /> : signalRows.length === 0 ? <div className="empty-state"><Radar size={24} /><strong>No active signals</strong><p>The scanner is quiet. That is a valid market state.</p></div> : <div className="signal-list">{signalRows.slice(0, 4).map((signal) => <SignalRow key={signal.symbol} signal={signal} />)}</div>}
      </section>
      <section className="panel feed-panel"><div className="panel-heading"><div><p className="eyebrow">Market feed</p><h3>Connection health</h3></div><Pill tone="green">{snapshot?.feedStatus ?? 'checking'}</Pill></div><div className="feed-visual"><div className="pulse-ring"><Activity size={22} /></div><div><strong>Deriv synthetic index feed</strong><span>Streaming cleanly · last tick {shortTime(snapshot?.updatedAt)}</span></div></div><div className="feed-line"><span>Latency</span><strong>42 ms</strong><div className="bar"><i style={{ width: '31%' }} /></div></div><div className="feed-line"><span>Tick continuity</span><strong>99.8%</strong><div className="bar"><i style={{ width: '92%' }} /></div></div><div className="feed-note"><Sparkles size={14} /> Analysis context is current to the latest completed candle.</div></section>
    </div>
    <section className="panel activity-panel"><div className="panel-heading"><div><p className="eyebrow">Paper ledger</p><h3>Recent activity</h3></div><Link href="/bulk-trading" className="text-link" data-testid="link-open-batch-builder">Open batch builder <ArrowUpRight size={14} /></Link></div>{orders.isLoading ? <LoadingRows /> : orders.isError ? <QueryError onRetry={() => void orders.refetch()} /> : orderRows.length === 0 ? <div className="empty-state compact"><Clock3 size={22} /><strong>No paper orders yet</strong><p>Build a guarded batch or place a single paper order from analysis.</p></div> : <OrderTable orders={orderRows.slice(0, 5)} />}</section>
  </Shell>;
}

function SignalRow({ signal, onSelect }: { signal: ScannerSignal; onSelect?: () => void }) {
  const isCall = signal.direction === 'CALL';
  return <button className="signal-row" onClick={onSelect} data-testid={`button-signal-${signal.symbol}`}><div className={`direction-badge ${isCall ? 'call' : 'put'}`}>{isCall ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}</div><div className="signal-identity"><strong>{signal.symbol}</strong><span>{signal.name}</span></div><div className="signal-timeframe">{signal.timeframe}</div><div className="signal-score"><span>score</span><strong>{signal.score}</strong></div><Pill tone={signal.status === 'ready' ? 'green' : signal.status === 'caution' ? 'amber' : 'slate'}>{signal.status}</Pill><ArrowUpRight className="row-arrow" size={15} /></button>;
}

function OrderTable({ orders }: { orders: PaperOrder[] }) {
  return <div className="table-wrap"><table><thead><tr><th>Symbol</th><th>Direction</th><th>Stake</th><th>Duration</th><th>Status</th><th>Result</th><th>Time</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} data-testid={`row-order-${order.id}`}><td><strong>{order.symbol}</strong></td><td><span className={`table-direction ${order.direction === 'CALL' ? 'positive' : 'negative'}`}>{order.direction}</span></td><td>{money(order.stake)}</td><td>{order.duration}m</td><td><Pill tone={order.status === 'settled' ? 'green' : 'amber'}>{order.status}</Pill></td><td className={order.result && order.result >= 0 ? 'positive' : order.result ? 'negative' : 'muted'}>{order.result == null ? '—' : money(order.result)}</td><td className="muted">{shortTime(order.createdAt)}</td></tr>)}</tbody></table></div>;
}

function ScannerPage() {
  const [market, setMarket] = useState('all');
  const [timeframe, setTimeframe] = useState('15m');
  const [minScore, setMinScore] = useState(0);
  const [selected, setSelected] = useState<ScannerSignal | null>(null);
  const params = useMemo(() => ({ timeframe: timeframe as '1m' | '5m' | '15m' | '1h' | '4h', limit: 20, ...(market !== 'all' ? { market } : {}) }), [market, timeframe]);
  const query = useGetScannerSignals(params);
  const rows = (query.data ?? []).filter((signal) => signal.score >= minScore);
  return <Shell><div className="page-intro compact-intro"><div><p className="eyebrow">Technical intelligence / ranked</p><h2>Scan for <em>asymmetry.</em></h2><p className="intro-copy">The desk ranks synthetic market setups by multi-factor conviction. Signal logic stays visible.</p></div><div className="scanner-status"><span className="live-dot" /> Updated moments ago</div></div>
    <section className="filter-bar panel"><div className="filter-title"><SlidersHorizontal size={16} /><strong>Scan filters</strong></div><label>Market<select value={market} onChange={(e) => setMarket(e.target.value)} data-testid="select-market"><option value="all">All synthetic markets</option><option value="volatility">Volatility indices</option><option value="boom">Boom / Crash</option><option value="step">Step indices</option></select></label><label>Timeframe<select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} data-testid="select-timeframe"><option value="1m">1 minute</option><option value="5m">5 minutes</option><option value="15m">15 minutes</option><option value="1h">1 hour</option><option value="4h">4 hours</option></select></label><label className="score-filter">Minimum score<input type="range" min="0" max="90" step="5" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} data-testid="input-min-score" /><span>{minScore}+</span></label><Button variant="quiet" onClick={() => { setMarket('all'); setTimeframe('15m'); setMinScore(0); }} data-testid="button-reset-filters">Reset</Button></section>
    <div className="scanner-layout"><section className="panel scanner-table-panel"><div className="panel-heading"><div><p className="eyebrow">Ranked opportunities</p><h3>{rows.length} setups in view</h3></div><Pill tone="green">AI rank live</Pill></div>{query.isLoading ? <LoadingRows rows={6} /> : query.isError ? <QueryError onRetry={() => void query.refetch()} /> : rows.length === 0 ? <div className="empty-state"><Radar size={24} /><strong>No setups match</strong><p>Lower the score threshold or widen the timeframe.</p></div> : <div className="scanner-rows">{rows.map((signal, index) => <button className={`scanner-row ${selected?.symbol === signal.symbol ? 'selected' : ''}`} onClick={() => setSelected(signal)} key={signal.symbol} data-testid={`button-scanner-row-${signal.symbol}`}><span className="rank">0{index + 1}</span><div className={`direction-badge ${signal.direction === 'CALL' ? 'call' : 'put'}`}>{signal.direction === 'CALL' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}</div><div className="signal-identity"><strong>{signal.symbol}</strong><span>{signal.name}</span></div><div className="scanner-price"><strong>{signal.price.toFixed(2)}</strong><span className={signal.change >= 0 ? 'positive' : 'negative'}>{pct(signal.change)}</span></div><div className="confidence"><div className="confidence-track"><i style={{ width: `${signal.confidence}%` }} /></div><span>{signal.confidence}% confidence</span></div><Pill tone={signal.status === 'ready' ? 'green' : signal.status === 'caution' ? 'amber' : 'slate'}>{signal.status}</Pill><ChevronDown className="scanner-chevron" size={16} /></button>)}</div>}</section>
      <SignalDetail signal={selected ?? rows[0]} />
    </div>
  </Shell>;
}

function SignalDetail({ signal }: { signal?: ScannerSignal }) {
  if (!signal) return <aside className="panel detail-panel empty-detail"><Target size={26} /><strong>Select a setup</strong><span>Choose a ranked signal to inspect its reasoning.</span></aside>;
  const isCall = signal.direction === 'CALL';
  return <aside className="panel detail-panel"><div className="detail-kicker"><span>Signal brief</span><Pill tone={signal.status === 'ready' ? 'green' : 'amber'}>{signal.status}</Pill></div><div className="detail-symbol"><div className={`direction-badge large ${isCall ? 'call' : 'put'}`}>{isCall ? <ArrowUpRight /> : <ArrowDownRight />}</div><div><h3>{signal.symbol}</h3><span>{signal.name} · {signal.timeframe}</span></div></div><div className="detail-score"><div><span>Conviction score</span><strong>{signal.score}<small>/100</small></strong></div><div className="score-dial" style={{ '--score': `${signal.score * 3.6}deg` } as CSSProperties}><b>{signal.confidence}%</b><span>confidence</span></div></div><div className="detail-price"><span>Latest price</span><strong>{signal.price.toFixed(2)}</strong><Pill tone={signal.change >= 0 ? 'green' : 'red'}>{pct(signal.change)}</Pill></div><div className="reasoning"><div className="section-label"><Sparkles size={14} /> Why this setup ranked</div>{signal.reasons.map((reason, index) => <div className="reason" key={reason}><span>0{index + 1}</span><p>{reason}</p></div>)}</div><Link href={`/analysis?symbol=${encodeURIComponent(signal.symbol)}`} className="ui-button button-primary full-button" data-testid={`link-analyze-${signal.symbol}`}><LineChart size={15} /> Open in chart room</Link></aside>;
}

function AnalysisPage() {
  const params = useParams<{ symbol?: string }>();
  const [location, setLocation] = useLocation();
  const searchSymbol = new URLSearchParams(location.split('?')[1] ?? '').get('symbol');
  const [symbol, setSymbol] = useState(params.symbol ?? searchSymbol ?? 'R_100');
  const [timeframe, setTimeframe] = useState('15m');
  const query = useGetSymbolAnalysis({ symbol, timeframe: timeframe as '1m' | '5m' | '15m' | '1h' | '4h' });
  const analysis = query.data;
  const candles = analysis?.candles ?? [];
  return <Shell><div className="chart-toolbar"><div><p className="eyebrow">DTrader context / technical analysis</p><h2>Chart <em>room.</em></h2></div><div className="chart-controls"><div className="symbol-picker"><span>Symbol</span><input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter') void query.refetch(); }} data-testid="input-analysis-symbol" /><button onClick={() => void query.refetch()} aria-label="Refresh symbol analysis" data-testid="button-refresh-analysis"><RefreshCw size={14} /></button></div><div className="timeframe-tabs">{['1m', '5m', '15m', '1h', '4h'].map((frame) => <button className={timeframe === frame ? 'active' : ''} onClick={() => setTimeframe(frame)} key={frame} data-testid={`button-timeframe-${frame}`}>{frame}</button>)}</div></div></div>
    {query.isLoading ? <div className="chart-loading panel"><LoadingRows rows={2} /></div> : query.isError ? <QueryError onRetry={() => void query.refetch()} /> : analysis && <div className="analysis-grid"><section className="panel chart-panel"><div className="chart-heading"><div><div className="chart-symbol"><span className="market-icon">R</span><div><strong>{analysis.symbol}</strong><span>{analysis.name} · {analysis.timeframe}</span></div></div><div className="chart-price"><strong>{analysis.price.toFixed(2)}</strong><span className={analysis.change >= 0 ? 'positive' : 'negative'}>{pct(analysis.change)}</span></div></div><div className="chart-actions"><Pill tone={analysis.bias === 'bullish' ? 'green' : analysis.bias === 'bearish' ? 'red' : 'amber'}>{analysis.bias} bias</Pill><button className="icon-button" aria-label="Chart settings" data-testid="button-chart-settings"><SlidersHorizontal size={17} /></button></div></div><CandleChart candles={candles} levels={analysis.levels} /><div className="chart-legend"><span><i className="legend-line mint" /> EMA 20</span><span><i className="legend-line blue" /> EMA 50</span><span><i className="legend-candle up" /> Up candle</span><span><i className="legend-candle down" /> Down candle</span></div></section><AnalysisAside analysis={analysis} /></div>}
  </Shell>;
}

function CandleChart({ candles, levels }: Pick<SymbolAnalysis, 'candles' | 'levels'>) {
  const chartCandles = candles.length ? candles.slice(-32) : [];
  const highs = chartCandles.map((c) => c.high);
  const lows = chartCandles.map((c) => c.low);
  const max = Math.max(...highs, 1);
  const min = Math.min(...lows, 0);
  const range = max - min || 1;
  const xStep = 720 / Math.max(chartCandles.length, 1);
  const y = (price: number) => 18 + ((max - price) / range) * 235;
  return <div className="candle-chart"><svg viewBox="0 0 790 280" role="img" aria-label="Candlestick chart"><defs><pattern id="grid" width="72" height="47" patternUnits="userSpaceOnUse"><path d="M 72 0 L 0 0 0 47" fill="none" stroke="rgba(32,54,73,.09)" strokeWidth="1" /></pattern></defs><rect x="0" y="0" width="790" height="280" fill="url(#grid)" />{levels.map((level) => { const yy = y(level.price); return <g key={level.label}><line x1="0" x2="720" y1={yy} y2={yy} stroke={level.type === 'resistance' ? '#ec8d73' : '#16b981'} strokeDasharray="5 5" strokeWidth="1" /><text x="728" y={yy + 4} className="level-label">{level.label}</text></g>; })}{chartCandles.map((candle, index) => { const cx = 25 + index * xStep; const openY = y(candle.open); const closeY = y(candle.close); const highY = y(candle.high); const lowY = y(candle.low); const rising = candle.close >= candle.open; const bodyY = Math.min(openY, closeY); const bodyH = Math.max(Math.abs(closeY - openY), 3); return <g key={`${candle.time}-${index}`}><line x1={cx} x2={cx} y1={highY} y2={lowY} stroke={rising ? '#16b981' : '#e47563'} strokeWidth="1.5" /><rect x={cx - 5} y={bodyY} width="10" height={bodyH} rx="1" fill={rising ? '#16b981' : '#e47563'} /></g>; })}<polyline points={chartCandles.map((c, i) => `${25 + i * xStep},${y(c.close) - 10}`).join(' ')} fill="none" stroke="#57c7ad" strokeWidth="1.5" opacity=".75" /></svg><div className="chart-axis"><span>{chartCandles[0]?.time ? new Date(chartCandles[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span><span>price / synthetic ticks</span><span>{chartCandles.at(-1)?.time ? new Date(chartCandles.at(-1)!.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span></div></div>;
}

function AnalysisAside({ analysis }: { analysis: SymbolAnalysis }) {
  return <aside className="analysis-aside"><div className="panel bias-card"><div className="panel-heading"><div><p className="eyebrow">Model read</p><h3>Current bias</h3></div><Gauge size={19} /></div><div className={`bias-word bias-${analysis.bias}`}>{analysis.bias}</div><p className="muted-copy">Momentum and trend structure are {analysis.bias === 'neutral' ? 'in conflict' : `leaning ${analysis.bias}`} on the selected timeframe.</p><div className="bias-meter"><i style={{ width: analysis.bias === 'bullish' ? '74%' : analysis.bias === 'bearish' ? '27%' : '50%' }} /></div></div><div className="panel indicators-card"><div className="panel-heading"><div><p className="eyebrow">Indicator stack</p><h3>Signal inputs</h3></div><Activity size={17} /></div>{[['RSI', analysis.indicators.rsi.toFixed(1), analysis.indicators.rsi > 70 ? 'Overbought' : analysis.indicators.rsi < 30 ? 'Oversold' : 'Balanced'], ['MACD', analysis.indicators.macd.toFixed(3), analysis.indicators.macd >= 0 ? 'Above zero' : 'Below zero'], ['EMA 20', analysis.indicators.ema20.toFixed(2), 'Short trend'], ['EMA 50', analysis.indicators.ema50.toFixed(2), 'Long trend'], ['Volatility', `${analysis.indicators.volatility.toFixed(2)}%`, 'Range profile']].map(([label, value, note]) => <div className="indicator-row" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div><div className="panel levels-card"><div className="panel-heading"><div><p className="eyebrow">Structure</p><h3>Key levels</h3></div><Crosshair size={17} /></div>{analysis.levels.map((level) => <div className="level-row" key={level.label}><span className={`level-dot ${level.type}`} /><strong>{level.label}</strong><span>{level.price.toFixed(2)}</span></div>)}</div></aside>;
}

function BulkTradingPage() {
  const presets = useGetBulkPresets();
  const previewMutation = usePreviewBulkTrade();
  const createOrder = useCreatePaperOrder();
  const queryClient = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbolInput, setSymbolInput] = useState('');
  const [direction, setDirection] = useState<'CALL' | 'PUT' | 'AUTO'>('AUTO');
  const [stake, setStake] = useState(1);
  const [duration, setDuration] = useState(5);
  const [maxLoss, setMaxLoss] = useState(20);
  const [preview, setPreview] = useState<BulkTradePreview | null>(null);
  const [notice, setNotice] = useState('');
  const presetRows = presets.data ?? [];
  const addSymbol = () => { const next = symbolInput.trim().toUpperCase(); if (next && !symbols.includes(next) && symbols.length < 20) { setSymbols([...symbols, next]); setSymbolInput(''); setPreview(null); } };
  const applyPreset = (preset: BulkPreset) => { setSelectedPreset(preset.id); setSymbols(preset.symbols); setDirection(preset.direction); setPreview(null); };
  const input: BulkTradeInput = { symbols, direction, stake, duration, maxLoss };
  const submitPreview = () => { if (symbols.length === 0) { setNotice('Add at least one market before requesting a preview.'); return; } setNotice(''); previewMutation.mutate({ data: input }, { onSuccess: (data) => setPreview(data) }); };
  const submitOrders = () => { if (!preview?.withinRiskLimit) return; preview.orders.forEach((order) => createOrder.mutate({ data: { symbol: order.symbol, direction: order.direction, stake: order.stake, duration: order.duration } })); setNotice(`${preview.orders.length} paper orders queued safely.`); setPreview(null); void queryClient.invalidateQueries({ queryKey: getGetPaperOrdersQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); };
  return <Shell><div className="page-intro compact-intro"><div><p className="eyebrow">Guarded execution / simulation</p><h2>Assemble a <em>clean batch.</em></h2><p className="intro-copy">Preview exposure before anything leaves this desk. Every order here is paper-only and risk-capped.</p></div><div className="paper-stamp"><ShieldCheck size={16} /> PAPER ONLY</div></div>
    <div className="bulk-layout"><section className="panel builder-panel"><div className="panel-heading"><div><p className="eyebrow">01 / Choose a playbook</p><h3>Preset selection</h3></div><Pill tone="amber">simulation</Pill></div>{presets.isLoading ? <LoadingRows rows={3} /> : presets.isError ? <QueryError onRetry={() => void presets.refetch()} /> : presetRows.length === 0 ? <div className="empty-state compact"><Target size={20} /><strong>No presets returned</strong><p>Build manually with the controls below.</p></div> : <div className="preset-grid">{presetRows.map((preset) => <button className={`preset-card ${selectedPreset === preset.id ? 'selected' : ''}`} onClick={() => applyPreset(preset)} key={preset.id} data-testid={`button-preset-${preset.id}`}><div className="preset-head"><strong>{preset.name}</strong><span>{selectedPreset === preset.id ? <Check size={15} /> : <ArrowUpRight size={14} />}</span></div><p>{preset.description}</p><div><span>{preset.symbols.length} markets</span><span>{preset.risk} risk</span></div></button>)}</div>}<div className="section-divider" /><div className="panel-heading"><div><p className="eyebrow">02 / Define exposure</p><h3>Batch parameters</h3></div></div><label className="field-label">Markets <span>{symbols.length}/20</span><div className="tag-input"><div className="tags">{symbols.map((item) => <span className="market-tag" key={item}>{item}<button onClick={() => { setSymbols(symbols.filter((symbol) => symbol !== item)); setPreview(null); }} aria-label={`Remove ${item}`} data-testid={`button-remove-symbol-${item}`}><X size={12} /></button></span>)}</div><input value={symbolInput} onChange={(e) => setSymbolInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSymbol(); } }} placeholder="Type a symbol and press enter" data-testid="input-bulk-symbol" /></div></label><div className="form-grid"><label className="field-label">Direction<select value={direction} onChange={(e) => setDirection(e.target.value as 'CALL' | 'PUT' | 'AUTO')} data-testid="select-bulk-direction"><option value="AUTO">Auto from signal</option><option value="CALL">Call / Up</option><option value="PUT">Put / Down</option></select></label><label className="field-label">Stake per order <div className="input-prefix"><span>$</span><input type="number" min="0.35" step=".05" value={stake} onChange={(e) => setStake(Number(e.target.value))} data-testid="input-bulk-stake" /></div></label><label className="field-label">Duration <div className="input-suffix"><input type="number" min="1" step="1" value={duration} onChange={(e) => setDuration(Number(e.target.value))} data-testid="input-bulk-duration" /><span>min</span></div></label><label className="field-label">Max batch loss <div className="input-prefix"><span>$</span><input type="number" min="0.35" step=".50" value={maxLoss} onChange={(e) => setMaxLoss(Number(e.target.value))} data-testid="input-bulk-max-loss" /></div></label></div>{notice && <div className="notice"><Check size={15} /> {notice}</div>}<Button onClick={submitPreview} disabled={previewMutation.isPending} className="full-button" data-testid="button-preview-batch">{previewMutation.isPending ? <><LoaderCircle size={15} className="spin" /> Calculating risk...</> : <><ShieldCheck size={15} /> Preview guarded batch</>}</Button></section>
      <aside className="panel preview-panel"><div className="panel-heading"><div><p className="eyebrow">03 / Risk preview</p><h3>Before you commit</h3></div><Gauge size={19} /></div>{preview ? <><div className={`risk-summary ${preview.withinRiskLimit ? 'safe' : 'blocked'}`}><div className="risk-icon">{preview.withinRiskLimit ? <Check size={18} /> : <CircleAlert size={18} />}</div><div><strong>{preview.withinRiskLimit ? 'Within risk limit' : 'Limit exceeded'}</strong><span>{preview.mode} · simulated execution</span></div></div><div className="preview-stats"><div><span>Orders</span><strong>{preview.orders.length}</strong></div><div><span>Total stake</span><strong>{money(preview.totalStake)}</strong></div><div><span>Worst-case loss</span><strong>{money(preview.worstCaseLoss)}</strong></div></div><div className="preview-orders">{preview.orders.map((order) => <div className="preview-order" key={order.id}><span className="order-number">{order.symbol.slice(-1)}</span><strong>{order.symbol}</strong><span>{order.direction} · {order.duration}m</span><b>{money(order.stake)}</b></div>)}</div><Button onClick={submitOrders} disabled={!preview.withinRiskLimit || createOrder.isPending} className="full-button" data-testid="button-submit-paper-batch">{createOrder.isPending ? <><LoaderCircle size={15} className="spin" /> Queueing...</> : <><Zap size={15} /> Queue paper batch</>}</Button><button className="reset-preview" onClick={() => setPreview(null)} data-testid="button-edit-batch">Back to edit</button></> : <div className="preview-empty"><div className="preview-orbit"><ShieldCheck size={27} /></div><strong>Nothing committed yet</strong><p>Set your symbols and exposure. The preview will calculate aggregate stake, worst-case loss, and whether the batch clears your guardrail.</p><div className="guard-rule"><span>Guardrail</span><strong>{money(maxLoss)} max loss</strong></div></div>}</aside></div>
  </Shell>;
}

function AppRouter() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/login" component={LoginPage} /><Route path="/" component={DashboardPage} /><Route path="/scanner" component={ScannerPage} /><Route path="/bulk-trading" component={BulkTradingPage} /><Route path="/analysis" component={AnalysisPage} /><Route path="/analysis/:symbol" component={AnalysisPage} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppRouter /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;