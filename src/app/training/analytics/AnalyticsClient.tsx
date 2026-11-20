'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export interface SerializedGame {
  _id: string;
  date: string;
  mode: string;
  finalScoreA: number;
  finalScoreB: number;
  checkInSnapshot: {
    shirtNumber: number;
    name: string;
    role: string;
    mental: number;
    physical: number;
  }[];
  points: {
    winner: 'A' | 'B';
    scoreA: number;
    scoreB: number;
    teamA: number[];
    teamB: number[];
    servingTeam?: 'A' | 'B' | null;
    server?: number | null;
    isEighthBall?: boolean;
    clutchScorer?: number | null;
    clutchIsError?: boolean;
    timestamp: string;
  }[];
  queensLeaderboard?: {
    teamName: string;
    players: number[];
    points: number;
  }[];
}

export interface SerializedMatch {
  _id: string;
  date: string;
  status: string;
  opponentName: string;
  sets: {
    setNumber: number;
    startingLineup: string[];
    libero: string;
    finalScore: string;
    liberoShares: Record<string, number>;
    substitutions: {
      playerOut: string;
      playerIn: string;
      score: string;
    }[];
  }[];
}

interface BucketStat {
  wins: number;
  rallies: number;
}

interface PlayerStats {
  name: string;
  number: number | null;
  role: string;
  rallies: number;
  wins: number;
  losses: number;
  plusMinus: number;
  winRate: number;
  queensPoints: number;
  queensGames: number;
  clutchPoints: number;
  clutchErrors: number;
  clutchNet: number;
  eighthServes: number;
  eighthServeWins: number;
  subIns: number;
  subWins: number;
  subLosses: number;
  mentalBuckets: { low: BucketStat; mid: BucketStat; high: BucketStat };
  physicalBuckets: { low: BucketStat; mid: BucketStat; high: BucketStat };
}

interface PairStats {
  p1: string;
  p2: string;
  rallies: number;
  wins: number;
  winRate: number;
  synergyLift: number;
}

interface MatchSummary {
  id: string;
  date: string;
  opponent: string;
  setsWon: number;
  setsLost: number;
  setScores: string[];
}

const parseScore = (raw: string): { us: number; them: number } | null => {
  if (!raw || !raw.includes(':')) return null;
  const [a, b] = raw.split(':').map((x) => Number(x.trim()));
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return { us: a, them: b };
};

const getBucket = (val: number): 'low' | 'mid' | 'high' => {
  if (val <= 4) return 'low';
  if (val <= 7) return 'mid';
  return 'high';
};

const pct = (wins: number, total: number) =>
  total > 0 ? Math.round((wins / total) * 100) : null;

export default function AnalyticsClient({
  games,
  matches,
}: {
  games: SerializedGame[];
  matches: SerializedMatch[];
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'synergy' | 'matches' | 'checkin' | 'clutch'>('overview');
  const [sourceFilter, setSourceFilter] = useState<'both' | 'training' | 'match'>(
    matches.length > 0 && games.length === 0 ? 'match' : 'both'
  );
  const [dateFilter, setDateFilter] = useState<'all' | '30d' | '7d'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | '6v6' | '8ball'>('all');
  const [fairOnly, setFairOnly] = useState<boolean>(true);
  const [minRallies, setMinRallies] = useState<number>(10);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const cutoffMs = useMemo(() => {
    const now = Date.now();
    if (dateFilter === '7d') return now - 7 * 24 * 60 * 60 * 1000;
    if (dateFilter === '30d') return now - 30 * 24 * 60 * 60 * 1000;
    return 0;
  }, [dateFilter]);

  const filteredGames = useMemo(
    () => games.filter((g) => new Date(g.date).getTime() >= cutoffMs),
    [games, cutoffMs]
  );

  const filteredMatches = useMemo(
    () => matches.filter((m) => new Date(m.date).getTime() >= cutoffMs),
    [matches, cutoffMs]
  );

  // Core Stats Engine (Unified by Player Name)
  const stats = useMemo(() => {
    const playersMap = new Map<string, PlayerStats>();
    const pairsMap = new Map<string, { p1: string; p2: string; rallies: number; wins: number }>();
    const numToName = new Map<number, string>();
    const matchSummaries: MatchSummary[] = [];

    let totalRallies = 0;
    let totalMatchSets = 0;
    let totalMatchSetsWon = 0;
    let eighthBallTotal = 0;
    let eighthBallServeWins = 0;
    let eighthBallServeTotal = 0;

    const ensurePlayer = (name: string, number: number | null = null, role = '') => {
      const clean = name.trim();
      if (!playersMap.has(clean)) {
        playersMap.set(clean, {
          name: clean,
          number,
          role: role || '–',
          rallies: 0,
          wins: 0,
          losses: 0,
          plusMinus: 0,
          winRate: 0,
          queensPoints: 0,
          queensGames: 0,
          clutchPoints: 0,
          clutchErrors: 0,
          clutchNet: 0,
          eighthServes: 0,
          eighthServeWins: 0,
          subIns: 0,
          subWins: 0,
          subLosses: 0,
          mentalBuckets: {
            low: { wins: 0, rallies: 0 },
            mid: { wins: 0, rallies: 0 },
            high: { wins: 0, rallies: 0 },
          },
          physicalBuckets: {
            low: { wins: 0, rallies: 0 },
            mid: { wins: 0, rallies: 0 },
            high: { wins: 0, rallies: 0 },
          },
        });
      } else {
        const existing = playersMap.get(clean)!;
        if (existing.number === null && number !== null) existing.number = number;
        if (existing.role === '–' && role) existing.role = role;
      }
      return playersMap.get(clean)!;
    };

    const addPairPoints = (names: string[], wins: number, losses: number) => {
      const total = wins + losses;
      if (total <= 0) return;
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const [a, b] = [names[i], names[j]].sort();
          const key = `${a}||${b}`;
          if (!pairsMap.has(key)) {
            pairsMap.set(key, { p1: a, p2: b, rallies: 0, wins: 0 });
          }
          const pair = pairsMap.get(key)!;
          pair.rallies += total;
          pair.wins += wins;
        }
      }
    };

    // Pre-seed shirtNumber -> name/role lookup from all training snapshots
    games.forEach((g) => {
      g.checkInSnapshot.forEach((c) => {
        if (c.shirtNumber > 0 && c.name) {
          numToName.set(c.shirtNumber, c.name.trim());
          ensurePlayer(c.name, c.shirtNumber, c.role);
        }
      });
    });

    const resolveName = (num: number) => numToName.get(num) || `#${num}`;

    // 1. PROCESS TRAINING GAMES
    if (sourceFilter === 'training' || sourceFilter === 'both') {
      filteredGames.forEach((game) => {
        const snapMap = new Map<string, { mental: number; physical: number }>();
        game.checkInSnapshot.forEach((c) => {
          if (c.shirtNumber > 0) {
            ensurePlayer(c.name, c.shirtNumber, c.role);
            snapMap.set(c.name.trim(), { mental: c.mental, physical: c.physical });
          }
        });

        if (game.mode.startsWith('queens')) {
          (game.queensLeaderboard || []).forEach((team) => {
            team.players.forEach((num) => {
              if (num > 0) {
                const p = ensurePlayer(resolveName(num), num);
                p.queensPoints += team.points;
                p.queensGames += 1;
              }
            });
          });
          return;
        }

        if (modeFilter !== 'all' && game.mode !== modeFilter) return;

        game.points.forEach((pt) => {
          const isFair = pt.teamA.length === pt.teamB.length;

          if (pt.isEighthBall) {
            eighthBallTotal++;
            if (pt.servingTeam) {
              eighthBallServeTotal++;
              if (pt.servingTeam === pt.winner) eighthBallServeWins++;
            }
            if (pt.server && pt.server > 0) {
              const srv = ensurePlayer(resolveName(pt.server), pt.server);
              srv.eighthServes++;
              if (pt.servingTeam === pt.winner) srv.eighthServeWins++;
            }
            if (pt.clutchScorer && pt.clutchScorer > 0) {
              const cl = ensurePlayer(resolveName(pt.clutchScorer), pt.clutchScorer);
              if (pt.clutchIsError) {
                cl.clutchErrors++;
                cl.clutchNet--;
              } else {
                cl.clutchPoints++;
                cl.clutchNet++;
              }
            }
          }

          if (fairOnly && !isFair) return;
          totalRallies++;

          const processSide = (sideNums: number[], won: boolean) => {
            const realNames = sideNums.filter((n) => n > 0).map(resolveName);

            realNames.forEach((name) => {
              const p = ensurePlayer(name);
              p.rallies++;
              if (won) {
                p.wins++;
                p.plusMinus++;
              } else {
                p.losses++;
                p.plusMinus--;
              }

              const snap = snapMap.get(name);
              if (snap) {
                const mB = getBucket(snap.mental);
                const pB = getBucket(snap.physical);
                p.mentalBuckets[mB].rallies++;
                if (won) p.mentalBuckets[mB].wins++;
                p.physicalBuckets[pB].rallies++;
                if (won) p.physicalBuckets[pB].wins++;
              }
            });

            addPairPoints(realNames, won ? 1 : 0, won ? 0 : 1);
          };

          processSide(pt.teamA, pt.winner === 'A');
          processSide(pt.teamB, pt.winner === 'B');
        });
      });
    }

    // 2. PROCESS OFFICIAL MATCHES (Stint reconstruction from lineups + sorted subs + liberoShares)
    if (sourceFilter === 'match' || sourceFilter === 'both') {
      filteredMatches.forEach((match) => {
        let setsWon = 0;
        let setsLost = 0;
        const setScores: string[] = [];

        match.sets.forEach((set) => {
          const final = parseScore(set.finalScore);
          if (!final || final.us + final.them === 0) return;

          totalMatchSets++;
          setScores.push(set.finalScore);
          if (final.us > final.them) {
            setsWon++;
            totalMatchSetsWon++;
          } else {
            setsLost++;
          }

          totalRallies += final.us + final.them;

          // Determine if a single libero played 100% of the set
          const shareEntries = Object.entries(set.liberoShares || {}).filter(([, pctVal]) => pctVal > 0);
          let fullSetLibero: string | null = null;
          if (shareEntries.length === 1 && shareEntries[0][1] === 100) {
            fullSetLibero = shareEntries[0][0].trim();
          } else if (shareEntries.length === 0 && set.libero) {
            fullSetLibero = set.libero.trim();
          }

          // Split liberoShares (e.g., 80/20): credit proportional points for the set
          if (!fullSetLibero && shareEntries.length > 0) {
            shareEntries.forEach(([libName, share]) => {
              const p = ensurePlayer(libName);
              const w = Math.round(final.us * (share / 100));
              const l = Math.round(final.them * (share / 100));
              p.rallies += w + l;
              p.wins += w;
              p.losses += l;
              p.plusMinus += w - l;
            });
          }

          // Sort substitutions chronologically by total points scored
          const parsedSubs = set.substitutions
            .map((sub) => ({
              playerOut: sub.playerOut.trim(),
              playerIn: sub.playerIn.trim(),
              parsed: parseScore(sub.score),
            }))
            .filter((s) => s.parsed !== null && s.playerOut && s.playerIn)
            .sort(
              (a, b) =>
                a.parsed!.us + a.parsed!.them - (b.parsed!.us + b.parsed!.them)
            );

          // Group simultaneous subs (e.g., double-subs at the exact same score)
          const subGroups: { us: number; them: number; subs: { playerOut: string; playerIn: string }[] }[] = [];
          parsedSubs.forEach((s) => {
            const last = subGroups[subGroups.length - 1];
            if (last && last.us === s.parsed!.us && last.them === s.parsed!.them) {
              last.subs.push({ playerOut: s.playerOut, playerIn: s.playerIn });
            } else {
              subGroups.push({
                us: s.parsed!.us,
                them: s.parsed!.them,
                subs: [{ playerOut: s.playerOut, playerIn: s.playerIn }],
              });
            }
          });

          const activeLineup = new Set<string>(set.startingLineup.map((n) => n.trim()).filter(Boolean));
          if (fullSetLibero) activeLineup.add(fullSetLibero);

          const activeSubbedIn = new Set<string>();
          let prevUs = 0;
          let prevThem = 0;

          const creditStint = (toUs: number, toThem: number) => {
            const deltaUs = Math.max(0, toUs - prevUs);
            const deltaThem = Math.max(0, toThem - prevThem);
            const total = deltaUs + deltaThem;
            if (total === 0) return;

            const names = Array.from(activeLineup);
            names.forEach((name) => {
              const p = ensurePlayer(name);
              p.rallies += total;
              p.wins += deltaUs;
              p.losses += deltaThem;
              p.plusMinus += deltaUs - deltaThem;

              if (activeSubbedIn.has(name)) {
                p.subWins += deltaUs;
                p.subLosses += deltaThem;
              }
            });

            addPairPoints(names, deltaUs, deltaThem);
          };

          subGroups.forEach((group) => {
            creditStint(group.us, group.them);
            group.subs.forEach(({ playerOut, playerIn }) => {
              activeLineup.delete(playerOut);
              activeSubbedIn.delete(playerOut);
              activeLineup.add(playerIn);
              activeSubbedIn.add(playerIn);
              ensurePlayer(playerIn).subIns += 1;
            });
            prevUs = Math.max(prevUs, group.us);
            prevThem = Math.max(prevThem, group.them);
          });

          // Final stint to end of set
          creditStint(final.us, final.them);
        });

        if (setScores.length > 0) {
          matchSummaries.push({
            id: match._id,
            date: match.date,
            opponent: match.opponentName,
            setsWon,
            setsLost,
            setScores,
          });
        }
      });
    }

    const playersList = Array.from(playersMap.values())
      .filter((p) => p.rallies > 0 || p.queensGames > 0 || p.clutchPoints + p.clutchErrors > 0)
      .map((p) => ({
        ...p,
        winRate: p.rallies > 0 ? Math.round((p.wins / p.rallies) * 100) : 0,
      }))
      .sort((a, b) => b.plusMinus - a.plusMinus || b.winRate - a.winRate);

    const pairsList: PairStats[] = Array.from(pairsMap.values()).map((pair) => {
      const p1Stat = playersMap.get(pair.p1);
      const p2Stat = playersMap.get(pair.p2);
      const wr1 = p1Stat && p1Stat.rallies > 0 ? (p1Stat.wins / p1Stat.rallies) * 100 : 50;
      const wr2 = p2Stat && p2Stat.rallies > 0 ? (p2Stat.wins / p2Stat.rallies) * 100 : 50;
      const pairWR = pair.rallies > 0 ? (pair.wins / pair.rallies) * 100 : 0;
      const expectedWR = (wr1 + wr2) / 2;

      return {
        ...pair,
        winRate: Math.round(pairWR),
        synergyLift: Math.round(pairWR - expectedWR),
      };
    });

    return {
      playersMap,
      playersList,
      pairsList,
      matchSummaries,
      totalRallies,
      totalMatchSets,
      totalMatchSetsWon,
      eighthBallTotal,
      eighthBallServeWins,
      eighthBallServeTotal,
    };
  }, [games, filteredGames, filteredMatches, sourceFilter, modeFilter, fairOnly]);

  const activePlayerName = selectedPlayer ?? stats.playersList[0]?.name ?? null;

  const selectedPlayerPairs = useMemo(() => {
    if (!activePlayerName) return [];
    return stats.pairsList
      .filter((p) => (p.p1 === activePlayerName || p.p2 === activePlayerName) && p.rallies >= minRallies)
      .sort((a, b) => b.synergyLift - a.synergyLift);
  }, [stats.pairsList, activePlayerName, minRallies]);

  // 1-Click AI Export
  const copyForAI = async () => {
    const lines: string[] = [];
    const sourceLabel = sourceFilter === 'both' ? 'Training + Match' : sourceFilter === 'match' ? 'Nur Match' : 'Nur Training';
    lines.push(`# Volleyball Analytics [${sourceLabel}] (${stats.totalRallies} Bälle)`);
    lines.push(`Filter: Zeitraum=${dateFilter}, Training-Modus=${modeFilter}, Min. Bälle=${minRallies}\n`);

    lines.push(`## 1. Spielerinnen Übersicht`);
    stats.playersList
      .filter((p) => p.rallies >= minRallies || p.queensGames > 0)
      .forEach((p) => {
        const subInfo = p.subIns > 0 ? `, Einwechslungen: ${p.subIns}x (${p.subWins - p.subLosses >= 0 ? '+' : ''}${p.subWins - p.subLosses})` : '';
        const numPrefix = p.number ? `#${p.number} ` : '';
        lines.push(
          `- ${numPrefix}${p.name} (${p.role}): ${p.rallies} Bälle, ${p.winRate}% Win, +/- ${p.plusMinus >= 0 ? '+' : ''}${p.plusMinus}${subInfo}`
        );
      });

    lines.push(`\n## 2. Top & Bottom Synergien (Min. ${minRallies} gemeinsame Bälle)`);
    const validPairs = stats.pairsList
      .filter((p) => p.rallies >= minRallies)
      .sort((a, b) => b.synergyLift - a.synergyLift);

    lines.push(`Top 5 Duos:`);
    validPairs.slice(0, 5).forEach((pair) => {
      lines.push(`- ${pair.p1} + ${pair.p2}: ${pair.winRate}% Win (${pair.rallies} Bälle, Lift: ${pair.synergyLift >= 0 ? '+' : ''}${pair.synergyLift}%)`);
    });

    lines.push(`Schwächste 5 Duos:`);
    validPairs.slice(-5).reverse().forEach((pair) => {
      lines.push(`- ${pair.p1} + ${pair.p2}: ${pair.winRate}% Win (${pair.rallies} Bälle, Lift: ${pair.synergyLift >= 0 ? '+' : ''}${pair.synergyLift}%)`);
    });

    if (stats.matchSummaries.length > 0) {
      lines.push(`\n## 3. Offizielle Matches (${stats.matchSummaries.length} Spiele, Sätze ${stats.totalMatchSetsWon}:${stats.totalMatchSets - stats.totalMatchSetsWon})`);
      stats.matchSummaries.forEach((m) => {
        lines.push(`- vs. ${m.opponent} (${m.date.slice(0, 10)}): ${m.setsWon}:${m.setsLost} [${m.setScores.join(', ')}]`);
      });
    }

    if (sourceFilter !== 'match') {
      lines.push(`\n## 4. Check-in Effekt (Win% Tief 1-4 / Mittel 5-7 / Hoch 8-10)`);
      stats.playersList
        .filter((p) => p.rallies >= minRallies)
        .forEach((p) => {
          const mL = pct(p.mentalBuckets.low.wins, p.mentalBuckets.low.rallies);
          const mM = pct(p.mentalBuckets.mid.wins, p.mentalBuckets.mid.rallies);
          const mH = pct(p.mentalBuckets.high.wins, p.mentalBuckets.high.rallies);
          const pL = pct(p.physicalBuckets.low.wins, p.physicalBuckets.low.rallies);
          const pM = pct(p.physicalBuckets.mid.wins, p.physicalBuckets.mid.rallies);
          const pH = pct(p.physicalBuckets.high.wins, p.physicalBuckets.high.rallies);
          if ([mL, mM, mH, pL, pM, pH].some((v) => v !== null)) {
            lines.push(
              `- ${p.name}: Mental [${mL ?? '-'}% / ${mM ?? '-'}% / ${mH ?? '-'}%] | Physis [${pL ?? '-'}% / ${pM ?? '-'}% / ${pH ?? '-'}%]`
            );
          }
        });

      if (stats.eighthBallTotal > 0) {
        const serveWinPct = pct(stats.eighthBallServeWins, stats.eighthBallServeTotal);
        lines.push(`\n## 5. 8-Ball Clutch (${stats.eighthBallTotal} gespielte 8. Bälle)`);
        lines.push(`- Service-Team gewinnt: ${serveWinPct ?? '-'}% (${stats.eighthBallServeWins}/${stats.eighthBallServeTotal})`);
      }
    }

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-wide">📊 Volley Analytics</h1>
            <p className="text-xs text-slate-400 mt-1">
              {stats.matchSummaries.length} Matches ({stats.totalMatchSets} Sätze) · {filteredGames.length} Trainings · {stats.totalRallies} gewertete Bälle
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/training"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300"
            >
              ← Game Board
            </Link>
            <button
              onClick={copyForAI}
              className="bg-fuchsia-600 hover:bg-fuchsia-500 active:scale-95 px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-lg transition-all"
            >
              {copied ? '✅ Für KI kopiert!' : '📋 Für KI kopieren'}
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* DATA SOURCE TOGGLE: Beide / Training / Match */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 font-black">
              {([
                ['both', 'Beide'],
                ['training', '🏋️ Training'],
                ['match', '🏐 Match'],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSourceFilter(val)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    sourceFilter === val
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* DATE FILTER */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 font-bold">
              {([['all', 'Alle'], ['30d', '30 Tage'], ['7d', '7 Tage']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setDateFilter(val)}
                  className={`px-3 py-1 rounded-lg ${dateFilter === val ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* TRAINING MODE FILTER (hidden when Match-only) */}
            {sourceFilter !== 'match' && (
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 font-bold">
                {([['all', '6v6 + 8-Ball'], ['6v6', 'Nur 6v6'], ['8ball', 'Nur 8-Ball']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setModeFilter(val)}
                    className={`px-3 py-1 rounded-lg ${modeFilter === val ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {sourceFilter !== 'match' && (
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300">
                <input
                  type="checkbox"
                  checked={fairOnly}
                  onChange={(e) => setFairOnly(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4"
                />
                Nur faire Teams
              </label>
            )}

            <div className="flex items-center gap-2 font-bold text-slate-300">
              <span>Min. Bälle:</span>
              <input
                type="number"
                min={1}
                max={200}
                value={minRallies}
                onChange={(e) => setMinRallies(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-black text-white"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {([
            ['overview', '🏆 Übersicht'],
            ['synergy', '🤝 Synergie'],
            ['matches', '🏐 Matches & Subs'],
            ['checkin', '🧠 Check-in Effekt'],
            ['clutch', '🎱 8-Ball Clutch'],
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

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/70 text-xs uppercase text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="p-4">Spielerin</th>
                    <th className="p-4">Rolle</th>
                    <th className="p-4 text-right">Bälle</th>
                    <th className="p-4 text-right">Win %</th>
                    <th className="p-4 text-right">+/-</th>
                    <th className="p-4 text-right">🔄 Sub Impact</th>
                    <th className="p-4 text-right">👑 Queens</th>
                    <th className="p-4 text-right">🎱 Clutch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {stats.playersList.map((p) => {
                    const lowSample = p.rallies < minRallies;
                    const subDiff = p.subWins - p.subLosses;
                    return (
                      <tr key={p.name} className={lowSample ? 'opacity-45' : 'hover:bg-slate-800/80'}>
                        <td className="p-4 font-black">
                          {p.number ? `#${p.number} ` : ''}{p.name}
                        </td>
                        <td className="p-4 text-xs text-slate-400">{p.role}</td>
                        <td className="p-4 text-right font-bold">{p.rallies}</td>
                        <td className="p-4 text-right font-black">
                          {p.rallies > 0 ? `${p.winRate}%` : '–'}
                        </td>
                        <td
                          className={`p-4 text-right font-black ${
                            p.plusMinus > 0
                              ? 'text-emerald-400'
                              : p.plusMinus < 0
                              ? 'text-red-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {p.plusMinus > 0 ? `+${p.plusMinus}` : p.plusMinus}
                        </td>
                        <td
                          className={`p-4 text-right font-bold ${
                            p.subIns === 0
                              ? 'text-slate-600'
                              : subDiff > 0
                              ? 'text-emerald-400'
                              : subDiff < 0
                              ? 'text-red-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {p.subIns > 0
                            ? `${subDiff > 0 ? '+' : ''}${subDiff} (${p.subIns}×)`
                            : '–'}
                        </td>
                        <td className="p-4 text-right font-bold text-amber-300">
                          {p.queensGames > 0 ? `${p.queensPoints} (${p.queensGames}×)` : '–'}
                        </td>
                        <td
                          className={`p-4 text-right font-black ${
                            p.clutchNet > 0
                              ? 'text-emerald-400'
                              : p.clutchNet < 0
                              ? 'text-red-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {p.clutchPoints + p.clutchErrors > 0
                            ? `${p.clutchNet > 0 ? '+' : ''}${p.clutchNet}`
                            : '–'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PAIR SYNERGY */}
        {activeTab === 'synergy' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-400 mr-2">Spielerin wählen:</span>
              {stats.playersList.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setSelectedPlayer(p.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activePlayerName === p.name
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {p.number ? `#${p.number} ` : ''}{p.name}
                </button>
              ))}
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-5">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-1">
                Synergie-Lift (Pair Win% minus Durchschnitt beider Spielerinnen)
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Positiver Lift (+) = das Duo spielt zusammen stärker als erwartet.
              </p>

              {selectedPlayerPairs.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  Noch zu wenige gemeinsame Bälle (Min. {minRallies}). Senke ggf. &quot;Min. Bälle&quot; oben.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {selectedPlayerPairs.map((pair) => {
                    const partnerName = pair.p1 === activePlayerName ? pair.p2 : pair.p1;
                    const partner = stats.playersMap.get(partnerName);
                    return (
                      <div
                        key={`${pair.p1}||${pair.p2}`}
                        className="bg-slate-900/60 border border-slate-700 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <span className="font-black text-white">
                            mit {partner?.number ? `#${partner.number} ` : ''}{partnerName}
                          </span>
                          {partner?.role && partner.role !== '–' && (
                            <span className="ml-2 text-xs text-slate-400">({partner.role})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-xs text-slate-400">{pair.rallies} Bälle</span>
                          <span className="font-bold">{pair.winRate}% Win</span>
                          <span
                            className={`font-black px-2.5 py-1 rounded-lg text-xs ${
                              pair.synergyLift > 0
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : pair.synergyLift < 0
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            Lift {pair.synergyLift > 0 ? `+${pair.synergyLift}%` : `${pair.synergyLift}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MATCHES & SUBS */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            {stats.matchSummaries.length === 0 ? (
              <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-8 text-center text-slate-400 text-sm">
                Keine Match-Daten für diesen Filter (stelle oben auf <strong>Beide</strong> oder <strong>🏐 Match</strong>).
              </div>
            ) : (
              <>
                <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-5 space-y-3">
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    🏐 Gespielte Matches ({stats.matchSummaries.length})
                  </h2>
                  <div className="space-y-2.5">
                    {stats.matchSummaries.map((m) => {
                      const wonMatch = m.setsWon > m.setsLost;
                      return (
                        <div
                          key={m.id}
                          className="bg-slate-900/60 border border-slate-700 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div>
                            <span className="font-black text-white">vs. {m.opponent}</span>
                            <span className="ml-2 text-xs text-slate-400">{m.date.slice(0, 10)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 font-mono">
                              {m.setScores.join(' · ')}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-black ${
                                wonMatch
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
                </div>

                {/* Sub Impact Leaderboard */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-3xl overflow-hidden">
                  <div className="p-4 border-b border-slate-700">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                      🔄 Joker / Einwechslungs-Impact (Punkte ab Einwechslung bis Auswechslung/Satzende)
                    </h2>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/70 text-xs uppercase text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="p-4">Spielerin</th>
                        <th className="p-4 text-right">Einwechslungen</th>
                        <th className="p-4 text-right">Bälle als Sub</th>
                        <th className="p-4 text-right">Win % als Sub</th>
                        <th className="p-4 text-right">Sub +/-</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {stats.playersList
                        .filter((p) => p.subIns > 0)
                        .sort((a, b) => (b.subWins - b.subLosses) - (a.subWins - a.subLosses))
                        .map((p) => {
                          const total = p.subWins + p.subLosses;
                          const diff = p.subWins - p.subLosses;
                          return (
                            <tr key={p.name} className="hover:bg-slate-800/80">
                              <td className="p-4 font-black">{p.name}</td>
                              <td className="p-4 text-right font-bold">{p.subIns}×</td>
                              <td className="p-4 text-right text-slate-300">{total}</td>
                              <td className="p-4 text-right font-bold">{pct(p.subWins, total) ?? '–'}%</td>
                              <td
                                className={`p-4 text-right font-black ${
                                  diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-300'
                                }`}
                              >
                                {diff > 0 ? `+${diff}` : diff}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: CHECK-IN IMPACT */}
        {activeTab === 'checkin' && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/70 text-xs uppercase text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="p-4">Spielerin</th>
                    <th className="p-4 text-center">🧠 Tief (1–4)</th>
                    <th className="p-4 text-center">🧠 Mittel (5–7)</th>
                    <th className="p-4 text-center">🧠 Hoch (8–10)</th>
                    <th className="p-4 text-center border-l border-slate-700">🔋 Tief (1–4)</th>
                    <th className="p-4 text-center">🔋 Mittel (5–7)</th>
                    <th className="p-4 text-center">🔋 Hoch (8–10)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {stats.playersList
                    .filter((p) => p.rallies >= minRallies)
                    .map((p) => {
                      const renderCell = (b: BucketStat) => {
                        const val = pct(b.wins, b.rallies);
                        if (val === null) return <span className="text-slate-600">–</span>;
                        return (
                          <div>
                            <span className={`font-black ${val >= 55 ? 'text-emerald-400' : val <= 45 ? 'text-red-400' : 'text-white'}`}>
                              {val}%
                            </span>
                            <span className="block text-[10px] text-slate-500">({b.rallies})</span>
                          </div>
                        );
                      };
                      return (
                        <tr key={p.name} className="hover:bg-slate-800/80">
                          <td className="p-4 font-black">{p.name}</td>
                          <td className="p-4 text-center">{renderCell(p.mentalBuckets.low)}</td>
                          <td className="p-4 text-center">{renderCell(p.mentalBuckets.mid)}</td>
                          <td className="p-4 text-center">{renderCell(p.mentalBuckets.high)}</td>
                          <td className="p-4 text-center border-l border-slate-700">{renderCell(p.physicalBuckets.low)}</td>
                          <td className="p-4 text-center">{renderCell(p.physicalBuckets.mid)}</td>
                          <td className="p-4 text-center">{renderCell(p.physicalBuckets.high)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: 8-BALL CLUTCH */}
        {activeTab === 'clutch' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                <div className="text-xs font-black uppercase text-slate-400">8. Ball: Service-Team gewinnt</div>
                <div className="text-3xl font-black text-indigo-400 mt-1">
                  {pct(stats.eighthBallServeWins, stats.eighthBallServeTotal) ?? '–'}%
                  <span className="text-sm text-slate-400 font-bold ml-2">
                    ({stats.eighthBallServeWins} / {stats.eighthBallServeTotal})
                  </span>
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                <div className="text-xs font-black uppercase text-slate-400">8. Ball: Annahme-Team gewinnt</div>
                <div className="text-3xl font-black text-amber-400 mt-1">
                  {pct(stats.eighthBallServeTotal - stats.eighthBallServeWins, stats.eighthBallServeTotal) ?? '–'}%
                  <span className="text-sm text-slate-400 font-bold ml-2">
                    ({stats.eighthBallServeTotal - stats.eighthBallServeWins} / {stats.eighthBallServeTotal})
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/70 text-xs uppercase text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-4">Spielerin</th>
                      <th className="p-4 text-right">✅ Clutch Punkte</th>
                      <th className="p-4 text-right">❌ Clutch Fehler</th>
                      <th className="p-4 text-right">Netto</th>
                      <th className="p-4 text-right">🏐 8. Ball Service</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {[...stats.playersList]
                      .filter((p) => p.clutchPoints + p.clutchErrors + p.eighthServes > 0)
                      .sort((a, b) => b.clutchNet - a.clutchNet || b.clutchPoints - a.clutchPoints)
                      .map((p) => (
                        <tr key={p.name} className="hover:bg-slate-800/80">
                          <td className="p-4 font-black">{p.name}</td>
                          <td className="p-4 text-right font-bold text-emerald-400">+{p.clutchPoints}</td>
                          <td className="p-4 text-right font-bold text-red-400">-{p.clutchErrors}</td>
                          <td
                            className={`p-4 text-right font-black ${
                              p.clutchNet > 0 ? 'text-emerald-400' : p.clutchNet < 0 ? 'text-red-400' : 'text-slate-300'
                            }`}
                          >
                            {p.clutchNet > 0 ? `+${p.clutchNet}` : p.clutchNet}
                          </td>
                          <td className="p-4 text-right font-bold text-slate-300">
                            {p.eighthServes > 0
                              ? `${pct(p.eighthServeWins, p.eighthServes)}% (${p.eighthServeWins}/${p.eighthServes})`
                              : '–'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}