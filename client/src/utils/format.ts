export function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export function lastFullWeekLabel(): string {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun, 6=Sat
  const daysBackToSat = dow === 6 ? 7 : dow + 1;
  const lastSat = new Date(today);
  lastSat.setDate(today.getDate() - daysBackToSat);
  const lastSun = new Date(lastSat);
  lastSun.setDate(lastSat.getDate() - 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(lastSun)} – ${fmt(lastSat)}`;
}
