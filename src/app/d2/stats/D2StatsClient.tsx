'use client';

import { useState, useMemo } from 'react';
import type { D2PlayerStat, D2RotationStat } from '@/lib/dvwParser';

export interface SerializedD2Match {
  _id: string;
  date: string;
  opponent: string;
  isHome: boolean;
  setsWon: number;
  setsLost: number;
  setScores: string[];
  players: D2PlayerStat[];
  rotations: D2RotationStat[];
}

type RoleName = 'Neben' | 'Dia' | 'Mitte' | 'Pass' | 'Libera' | 'Sonstige';
type SortKey = 'role' | 'pts' | 'net' | 'serve' | 'recPos' | 'attEff' | 'block';

const ROLE_ORDER: RoleName[] = ['Neben', 'Dia', 'Mitte', 'Pass', 'Libera', 'Sonstige'];

const FIRST_NAME_TO_ROLE: Record<string, RoleName> = {
  nicole: 'Neben',
  ainoa: 'Neben',
  melina: 'Neben',
  anina: 'Neben',
  emily: 'Dia',
  noemie: 'Dia',
  isadora: 'Mitte',
  sina: 'Mitte',
  jael: 'Mitte',
  alina: 'Pass',
  berna: 'Pass',
  eda: 'Libera',
  gina: 'Libera',
};

const getPlayerRole = (name: string, isLibero: boolean): RoleName => {
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() || '';
  if (FIRST_NAME_TO_ROLE[first]) return FIRST_NAME_TO_ROLE[first];
  if (isLibero) return 'Libera';
  return 'Sonstige';
};

const getRoleBadgeStyle = (role: RoleName) => {
  switch (role) {
    case 'Neben': return 'bg-red-500/20 text-red-300 border-red-500/30';
    case 'Dia': return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
    case 'Mitte': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'Pass': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'Libera': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    default: return 'bg-slate-700/60 text-slate-400 border-slate-600';
  }
};

const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : null;

const fmtPct = (part: number, total: number) => {
  const val = pct(part, total);
  return val === null ? '–' : `${val}%`;
};

const attackEff = (kills: number, errors: number, blocked: number, total: number) => {
  if (total === 0) return null;
  return Math.round(((kills - errors - blocked) / total) * 100);
};

interface EnrichedPlayer extends D2PlayerStat {
  role: RoleName;
  pts: number;
  net: number;
  recPosPct: number | null;
  attEffVal: number | null;
}

export default function D2StatsClient({
  initialMatches,
}: {
  initialMatches: SerializedD2Match[];
}) {
  const matches = initialMatches;
  const [selectedMatchId, setSelectedMatchId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'players' | 'rotations' | 'matches'>('players');
  const [sortKey, setSortKey] = useState<SortKey>('role');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [copied, setCopied] = useState<boolean>(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'role' ? 'asc' : 'desc');
    }
  };

  const activeMatches = useMemo(() => {
    if (selectedMatchId === 'all') return matches;
    return matches.filter((m) => m._id === selectedMatchId);
  }, [matches, selectedMatchId]);

  // Aggregate Player & Rotation Stats across activeMatches
  const agg = useMemo(() => {
    const pMap = new Map<string, D2PlayerStat>();
    const rMap = new Map<number, D2RotationStat>();
    for (let z = 1; z <= 6; z++) {
      rMap.set(z, { zone: z, soTotal: 0, soWon: 0, bpTotal: 0, bpWon: 0 });
    }

    const team = {
      serve: { total: 0, aces: 0, errors: 0 },
      reception: { total: 0, perfect: 0, positive: 0, errors: 0 },
      attack: { total: 0, kills: 0, errors: 0, blocked: 0 },
      block: { total: 0, kills: 0, positive: 0, errors: 0 },
      dig: { total: 0, positive: 0, errors: 0 },
    };

    activeMatches.forEach((m) => {
      m.players.forEach((p) => {
        const key = p.name.trim() || `#${p.number}`;
        if (!pMap.has(key)) {
          pMap.set(key, {
            number: p.number,
            name: key,
            isLibero: p.isLibero,
            serve: { total: 0, aces: 0, errors: 0 },
            reception: { total: 0, perfect: 0, positive: 0, errors: 0 },
            attack: { total: 0, kills: 0, errors: 0, blocked: 0 },
            block: { total: 0, kills: 0, positive: 0, errors: 0 },
            dig: { total: 0, positive: 0, errors: 0 },
          });
        }
        const acc = pMap.get(key)!;
        if (p.isLibero) acc.isLibero = true;

        acc.serve.total += p.serve.total;
        acc.serve.aces += p.serve.aces;
        acc.serve.errors += p.serve.errors;

        acc.reception.total += p.reception.total;
        acc.reception.perfect += p.reception.perfect;
        acc.reception.positive += p.reception.positive;
        acc.reception.errors += p.reception.errors;

        acc.attack.total += p.attack.total;
        acc.attack.kills += p.attack.kills;
        acc.attack.errors += p.attack.errors;
        acc.attack.blocked += p.attack.blocked;

        acc.block.total += p.block.total;
        acc.block.kills += p.block.kills;
        acc.block.positive += p.block.positive;
        acc.block.errors += p.block.errors;

        acc.dig.total += p.dig.total;
        acc.dig.positive += p.dig.positive;
        acc.dig.errors += p.dig.errors;

        // Team totals
        team.serve.total += p.serve.total;
        team.serve.aces += p.serve.aces;
        team.serve.errors += p.serve.errors;

        team.reception.total += p.reception.total;
        team.reception.perfect += p.reception.perfect;
        team.reception.positive += p.reception.positive;
        team.reception.errors += p.reception.errors;

        team.attack.total += p.attack.total;
        team.attack.kills += p.attack.kills;
        team.attack.errors += p.attack.errors;
        team.attack.blocked += p.attack.blocked;

        team.block.total += p.block.total;
        team.block.kills += p.block.kills;
        team.block.positive += p.block.positive;
        team.block.errors += p.block.errors;

        team.dig.total += p.dig.total;
        team.dig.positive += p.dig.positive;
        team.dig.errors += p.dig.errors;
      });

      m.rotations.forEach((r) => {
        const rot = rMap.get(r.zone);
        if (!rot) return;
        rot.soTotal += r.soTotal;
        rot.soWon += r.soWon;
        rot.bpTotal += r.bpTotal;
        rot.bpWon += r.bpWon;
      });
    });

    const players: EnrichedPlayer[] = Array.from(pMap.values()).map((p) => {
      const role = getPlayerRole(p.name, p.isLibero);
      const pts = p.serve.aces + p.attack.kills + p.block.kills;
      const totalErrors =
        p.serve.errors +
        p.reception.errors +
        p.attack.errors +
        p.attack.blocked +
        p.block.errors;
      const net = pts - totalErrors;
      const recPosPct = pct(p.reception.perfect + p.reception.positive, p.reception.total);
      const attEffVal = attackEff(p.attack.kills, p.attack.errors, p.attack.blocked, p.attack.total);

      return { ...p, role, pts, net, recPosPct, attEffVal };
    });

    const rotations = Array.from(rMap.values());

    return { players, rotations, team };
  }, [activeMatches]);

  const sortedPlayers = useMemo(() => {
    const list = [...agg.players];
    const dir = sortDir === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (sortKey === 'role') {
        const rDiff = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
        if (rDiff !== 0) return rDiff * dir;
        return a.number - b.number;
      }
      if (sortKey === 'pts') return (a.pts - b.pts) * dir || b.net - a.net;
      if (sortKey === 'net') return (a.net - b.net) * dir || b.pts - a.pts;
      if (sortKey === 'serve') {
        const aNet = a.serve.aces - a.serve.errors;
        const bNet = b.serve.aces - b.serve.errors;
        return (aNet - bNet) * dir || b.serve.total - a.serve.total;
      }
      if (sortKey === 'recPos') {
        const aVal = a.recPosPct ?? -999;
        const bVal = b.recPosPct ?? -999;
        return (aVal - bVal) * dir || b.reception.total - a.reception.total;
      }
      if (sortKey === 'attEff') {
        const aVal = a.attEffVal ?? -999;
        const bVal = b.attEffVal ?? -999;
        return (aVal - bVal) * dir || b.attack.total - a.attack.total;
      }
      if (sortKey === 'block') return (a.block.kills - b.block.kills) * dir || b.block.positive - a.block.positive;
      return 0;
    });

    return list;
  }, [agg.players, sortKey, sortDir]);

  const copyForAI = async () => {
    const lines: string[] = [];
    const scope =
      selectedMatchId === 'all'
        ? `Saison (${activeMatches.length} Matches)`
        : `vs. ${activeMatches[0]?.opponent} (${activeMatches[0]?.date})`;
    lines.push(`# D2 VolleyStation Analytics [${scope}]\n`);

    const t = agg.team;
    const tRecPos = t.reception.perfect + t.reception.positive;
    const tAttEff = attackEff(t.attack.kills, t.attack.errors, t.attack.blocked, t.attack.total);
    lines.push(`## Team-Übersicht`);
    lines.push(`- Service: ${t.serve.total} (Aces: ${t.serve.aces} / ${fmtPct(t.serve.aces, t.serve.total)}, Fehler: ${t.serve.errors} / ${fmtPct(t.serve.errors, t.serve.total)})`);
    lines.push(`- Annahme: ${t.reception.total} (Pos: ${fmtPct(tRecPos, t.reception.total)}, Perf: ${fmtPct(t.reception.perfect, t.reception.total)}, Fehler: ${t.reception.errors})`);
    lines.push(`- Angriff: ${t.attack.total} (Kills: ${t.attack.kills} / ${fmtPct(t.attack.kills, t.attack.total)}, Eff: ${tAttEff ?? '-'}%, Fehler: ${t.attack.errors}, Geblockt: ${t.attack.blocked})`);
    lines.push(`- Block: ${t.block.kills} Punkte, ${t.block.positive} Positiv | Defense: ${t.dig.total} (${fmtPct(t.dig.positive, t.dig.total)} Pos)\n`);

    lines.push(`## Spielerinnen (nach Rolle)`);
    const byRole = [...agg.players].sort(
      (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.number - b.number
    );
    byRole.forEach((p) => {
      const recPos = p.reception.perfect + p.reception.positive;
      lines.push(
        `- [${p.role}] #${p.number} ${p.name}: ` +
          `Pts ${p.pts} (${p.net >= 0 ? '+' : ''}${p.net}) | ` +
          `Srv ${p.serve.total} (${p.serve.aces}#/${p.serve.errors}=) | ` +
          `Rec ${p.reception.total} (${fmtPct(recPos, p.reception.total)} Pos, ${p.reception.errors}=) | ` +
          `Att ${p.attack.total} (${p.attack.kills}# / ${fmtPct(p.attack.kills, p.attack.total)} / Eff ${p.attEffVal ?? '-'}%) | ` +
          `Blk ${p.block.kills}#`
      );
    });

    lines.push(`\n## Rotationen (Setter-Zone)`);
    agg.rotations.forEach((r) => {
      lines.push(
        `- z${r.zone}: Sideout ${fmtPct(r.soWon, r.soTotal)} (${r.soWon}/${r.soTotal}) | Breakpoint ${fmtPct(r.bpWon, r.bpTotal)} (${r.bpWon}/${r.bpTotal})`
      );
    });

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const t = agg.team;
  const teamRecPos = t.reception.perfect + t.reception.positive;
  const teamAttEff = attackEff(t.attack.kills, t.attack.errors, t.attack.blocked, t.attack.total);

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-wide">D2 Match Analytics</h1>
            <p className="text-xs text-slate-400 mt-1">
              VolleyStation / DataVolley Auswertung · {matches.length} gespeicherte Matches
            </p>
          </div>

          {matches.length > 0 && (
            <button
              onClick={copyForAI}
              className="bg-fuchsia-600 hover:bg-fuchsia-500 active:scale-95 px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-lg transition-all"
            >
              {copied ? 'Kopiert!' : 'Kopie der Daten'}
            </button>
          )}
        </div>

        {matches.length === 0 ? (
          <div className="bg-slate-800/60 border-2 border-dashed border-slate-700 rounded-3xl p-12 text-center space-y-3">
            <div className="text-4xl">📊</div>
            <h2 className="text-lg font-black text-white">Noch keine Match-Daten vorhanden</h2>
            <p className="text-sm text-slate-400">
              Sobald ein Match importiert wurde, erscheinen hier alle Team-, Spielerinnen- und Rotationsstatistiken.
            </p>
          </div>
        ) : (
          <>
            {/* Match Selector + Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {([
                  ['players', 'Spielerinnen'],
                  ['rotations', 'Rotationen (p1–p6)'],
                  ['matches', `Matches (${matches.length})`],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
                      activeTab === key
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <select
                value={selectedMatchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm font-bold rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500"
              >
                <option value="all">Alle Matches (Saison: {matches.length})</option>
                {matches.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.date} · vs. {m.opponent} ({m.setsWon}:{m.setsLost})
                  </option>
                ))}
              </select>
            </div>

            {/* Top Team KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <div className="text-[11px] font-black uppercase text-slate-400">Service Ace / Err</div>
                <div className="text-xl font-black mt-1">
                  <span className="text-emerald-400">{fmtPct(t.serve.aces, t.serve.total)}</span>
                  <span className="text-slate-600 mx-1.5">/</span>
                  <span className="text-red-400">{fmtPct(t.serve.errors, t.serve.total)}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t.serve.aces} Aces · {t.serve.errors} Err ({t.serve.total})
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <div className="text-[11px] font-black uppercase text-slate-400">Annahme Pos / Perf</div>
                <div className="text-xl font-black mt-1">
                  <span className="text-cyan-400">{fmtPct(teamRecPos, t.reception.total)}</span>
                  <span className="text-slate-600 mx-1.5">/</span>
                  <span className="text-indigo-300">{fmtPct(t.reception.perfect, t.reception.total)}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  <span className="text-red-400 font-bold">{t.reception.errors} Fehler</span> ({t.reception.total} Annahmen)
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <div className="text-[11px] font-black uppercase text-slate-400">Angriff Kill / Eff</div>
                <div className="text-xl font-black mt-1">
                  <span className="text-emerald-400">{fmtPct(t.attack.kills, t.attack.total)}</span>
                  <span className="text-slate-600 mx-1.5">/</span>
                  <span className={teamAttEff !== null && teamAttEff >= 20 ? 'text-emerald-300' : 'text-amber-300'}>
                    {teamAttEff === null ? '–' : `${teamAttEff}%`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t.attack.kills}# · {t.attack.errors}= · {t.attack.blocked}/ ({t.attack.total})
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <div className="text-[11px] font-black uppercase text-slate-400">Block Punkte</div>
                <div className="text-2xl font-black text-violet-400 mt-1">{t.block.kills}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  +{t.block.positive} Positiv · {t.block.errors} Fehler
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 col-span-2 lg:col-span-1">
                <div className="text-[11px] font-black uppercase text-slate-400">Defense (Dig %)</div>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {fmtPct(t.dig.positive, t.dig.total)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t.dig.positive} / {t.dig.total} Digs ({t.dig.errors} Err)
                </div>
              </div>
            </div>

            {/* TAB 1: PLAYERS */}
            {activeTab === 'players' && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-900/80 text-[11px] uppercase text-slate-400 border-b border-slate-700 select-none">
                      <tr>
                        <th
                          onClick={() => handleSort('role')}
                          className="p-3.5 cursor-pointer hover:text-white transition-colors"
                        >
                          Spielerin / Rolle{sortArrow('role')}
                        </th>
                        <th
                          onClick={() => handleSort('pts')}
                          className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                        >
                          Pts{sortArrow('pts')}
                        </th>
                        <th
                          onClick={() => handleSort('net')}
                          className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                        >
                          +/-{sortArrow('net')}
                        </th>
                        <th
                          onClick={() => handleSort('serve')}
                          className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                        >
                          Service (Ace / Err){sortArrow('serve')}
                        </th>
                        <th
                          onClick={() => handleSort('recPos')}
                          className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                        >
                          Annahme (Pos / Perf / Err){sortArrow('recPos')}
                        </th>
                        <th
                          onClick={() => handleSort('attEff')}
                          className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                        >
                          Angriff (Kill% / Eff){sortArrow('attEff')}
                        </th>
                        <th
                          onClick={() => handleSort('block')}
                          className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                        >
                          Block{sortArrow('block')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {sortedPlayers.map((p) => {
                        const recColor =
                          p.recPosPct === null
                            ? 'text-slate-600'
                            : p.recPosPct >= 45
                            ? 'text-emerald-400'
                            : p.recPosPct <= 30
                            ? 'text-red-400'
                            : 'text-cyan-400';

                        const effColor =
                          p.attEffVal === null
                            ? 'text-slate-400'
                            : p.attEffVal >= 25
                            ? 'text-emerald-400'
                            : p.attEffVal <= 5
                            ? 'text-red-400'
                            : 'text-amber-300';

                        return (
                          <tr key={p.name} className="hover:bg-slate-800/80">
                            <td className="p-3.5 font-black whitespace-nowrap">
                              <span className="text-slate-500 mr-1.5">#{p.number}</span>
                              {p.name}
                              <span
                                className={`ml-2 px-1.5 py-0.5 rounded border text-[10px] font-bold ${getRoleBadgeStyle(
                                  p.role
                                )}`}
                              >
                                {p.role}
                              </span>
                            </td>

                            <td className="p-3.5 text-right font-black text-white whitespace-nowrap">
                              {p.pts > 0 ? p.pts : <span className="text-slate-600">0</span>}
                            </td>

                            <td
                              className={`p-3.5 text-right font-black whitespace-nowrap ${
                                p.net > 0
                                  ? 'text-emerald-400'
                                  : p.net < 0
                                  ? 'text-red-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {p.net > 0 ? `+${p.net}` : p.net}
                            </td>

                            <td className="p-3.5 text-right whitespace-nowrap">
                              {p.serve.total > 0 ? (
                                <>
                                  <span className="font-bold">{p.serve.total}</span>
                                  <span className="text-slate-400 ml-1.5">
                                    (<span className="text-emerald-400">{p.serve.aces}#</span> /{' '}
                                    <span className="text-red-400">{p.serve.errors}=</span>)
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-600">–</span>
                              )}
                            </td>

                            <td className="p-3.5 text-right whitespace-nowrap">
                              {p.reception.total > 0 ? (
                                <>
                                  <span className={`font-black ${recColor}`}>
                                    {p.recPosPct}%
                                  </span>
                                  <span className="text-slate-400 ml-1.5">
                                    ({fmtPct(p.reception.perfect, p.reception.total)} ·{' '}
                                    <span className={p.reception.errors > 0 ? 'text-red-400 font-bold' : ''}>
                                      {p.reception.errors}=
                                    </span>{' '}
                                    · {p.reception.total})
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-600">–</span>
                              )}
                            </td>

                            <td className="p-3.5 text-right whitespace-nowrap">
                              {p.attack.total > 0 ? (
                                <>
                                  <span className="font-black text-white">
                                    {fmtPct(p.attack.kills, p.attack.total)}
                                  </span>
                                  <span className="text-slate-400 ml-1.5">
                                    (<span className={`font-bold ${effColor}`}>Eff {p.attEffVal}%</span> ·{' '}
                                    {p.attack.kills}/{p.attack.total})
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-600">–</span>
                              )}
                            </td>

                            <td className="p-3.5 text-right whitespace-nowrap">
                              {p.block.total > 0 ? (
                                <>
                                  <span className="font-black text-violet-400">{p.block.kills}#</span>
                                  <span className="text-slate-400 ml-1">
                                    (+{p.block.positive} / {p.block.errors}=)
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-600">–</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: ROTATIONS */}
            {activeTab === 'rotations' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {agg.rotations.map((r) => {
                  const soPct = pct(r.soWon, r.soTotal);
                  const bpPct = pct(r.bpWon, r.bpTotal);
                  return (
                    <div
                      key={r.zone}
                      className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-3"
                    >
                      <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                        <span className="text-lg font-black text-white">Rotation p{r.zone}</span>
                        <span className="text-xs text-slate-400 font-bold">
                          {r.soTotal + r.bpTotal} Rallies
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-slate-400">Sideout (Annahme)</span>
                        <span
                          className={`text-lg font-black ${
                            soPct !== null && soPct >= 55
                              ? 'text-emerald-400'
                              : soPct !== null && soPct <= 40
                              ? 'text-red-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          {soPct ?? '–'}%{' '}
                          <span className="text-xs text-slate-400 font-normal">
                            ({r.soWon}/{r.soTotal})
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-slate-400">Breakpoint (Service)</span>
                        <span
                          className={`text-lg font-black ${
                            bpPct !== null && bpPct >= 45
                              ? 'text-emerald-400'
                              : bpPct !== null && bpPct <= 30
                              ? 'text-red-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {bpPct ?? '–'}%{' '}
                          <span className="text-xs text-slate-400 font-normal">
                            ({r.bpWon}/{r.bpTotal})
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 3: MATCHES LIST */}
            {activeTab === 'matches' && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-5 space-y-3">
                {matches.map((m) => {
                  const won = m.setsWon > m.setsLost;
                  return (
                    <div
                      key={m._id}
                      className="bg-slate-900/60 border border-slate-700 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-black text-white">vs. {m.opponent}</span>
                        <span className="ml-2 text-xs text-slate-400">{m.date}</span>
                        <span className="ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {m.isHome ? 'Heim' : 'Auswärts'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-mono">
                          {m.setScores.join(' · ')}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-black ${
                            won
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {m.setsWon} : {m.setsLost}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}