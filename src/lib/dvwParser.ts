export interface D2PlayerStat {
  number: number;
  name: string;
  isLibero: boolean;
  serve: { total: number; aces: number; errors: number };
  reception: { total: number; perfect: number; positive: number; errors: number };
  attack: { total: number; kills: number; errors: number; blocked: number };
  block: { total: number; kills: number; positive: number; errors: number };
  dig: { total: number; positive: number; errors: number };
}

export interface D2RotationStat {
  zone: number; // Setter zone 1-6 (z1..z6)
  soTotal: number;
  soWon: number;
  bpTotal: number;
  bpWon: number;
}

export interface ParsedD2Match {
  date: string;
  opponent: string;
  isHome: boolean;
  setsWon: number;
  setsLost: number;
  setScores: string[]; // Always formatted as "D2:Opponent"
  players: D2PlayerStat[];
  rotations: D2RotationStat[];
}

export function parseDvwFile(rawText: string, teamKeyword = 'D2'): ParsedD2Match {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  let section = '';

  let matchDate = new Date().toISOString().slice(0, 10);
  const teamLines: string[] = [];
  const setLines: string[] = [];
  const homePlayers = new Map<number, D2PlayerStat>();
  const awayPlayers = new Map<number, D2PlayerStat>();
  const scoutLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('[3')) {
      section = line;
      continue;
    }

    if (section === '[3MATCH]' && line.includes('/')) {
      const parts = line.split(';');
      const d = parts[0]?.trim(); // DD/MM/YYYY
      if (d && /^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
        const [day, month, year] = d.split('/');
        matchDate = `${year}-${month}-${day}`;
      }
    } else if (section === '[3TEAMS]') {
      if (line.split(';')[0]) teamLines.push(line);
    } else if (section === '[3SET]') {
      setLines.push(line);
    } else if (section === '[3PLAYERS-H]' || section === '[3PLAYERS-V]') {
      const p = line.split(';');
      const num = parseInt(p[1], 10);
      if (Number.isNaN(num)) continue;
      const first = (p[9] || '').trim();
      const last = (p[10] || '').trim();
      const isLibero = (p[12] || '').trim().toUpperCase() === 'L';
      const stat: D2PlayerStat = {
        number: num,
        name: `${first} ${last}`.trim() || `#${num}`,
        isLibero,
        serve: { total: 0, aces: 0, errors: 0 },
        reception: { total: 0, perfect: 0, positive: 0, errors: 0 },
        attack: { total: 0, kills: 0, errors: 0, blocked: 0 },
        block: { total: 0, kills: 0, positive: 0, errors: 0 },
        dig: { total: 0, positive: 0, errors: 0 },
      };
      if (section === '[3PLAYERS-H]') homePlayers.set(num, stat);
      else awayPlayers.set(num, stat);
    } else if (section === '[3SCOUT]') {
      scoutLines.push(line);
    }
  }

  // Detect whether D2 is Home ('*') or Away ('a')
  const homeCols = (teamLines[0] || '').split(';');
  const awayCols = (teamLines[1] || '').split(';');
  const homeName = (homeCols[1] || homeCols[0] || 'Home').trim();
  const awayName = (awayCols[1] || awayCols[0] || 'Away').trim();

  const homeMatches =
    homeName.toUpperCase().includes(teamKeyword.toUpperCase()) ||
    (homeCols[0] || '').toUpperCase().includes(teamKeyword.toUpperCase());
  const awayMatches =
    awayName.toUpperCase().includes(teamKeyword.toUpperCase()) ||
    (awayCols[0] || '').toUpperCase().includes(teamKeyword.toUpperCase());

  const isHome = homeMatches || !awayMatches;
  const ourPrefix = isHome ? '*' : 'a';
  const opponent = isHome ? awayName : homeName;
  const ourPlayers = isHome ? homePlayers : awayPlayers;

  // Parse set scores (always normalized to "D2:Opponent")
  const setScores: string[] = [];
  let setsWon = 0;
  let setsLost = 0;

  for (const sLine of setLines) {
    const cols = sLine.split(';');
    const finalRaw = (cols[4] || '').trim(); // e.g., "17-25"
    const match = finalRaw.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) continue;
    const hScore = parseInt(match[1], 10);
    const aScore = parseInt(match[2], 10);
    const ourScore = isHome ? hScore : aScore;
    const oppScore = isHome ? aScore : hScore;
    setScores.push(`${ourScore}:${oppScore}`);
    if (ourScore > oppScore) setsWon++;
    else setsLost++;
  }

  // Rotation stats (Setter zones 1-6)
  const rotationsMap = new Map<number, D2RotationStat>();
  for (let z = 1; z <= 6; z++) {
    rotationsMap.set(z, { zone: z, soTotal: 0, soWon: 0, bpTotal: 0, bpWon: 0 });
  }

  // Parse [3SCOUT] touches and rally outcomes
  let currentRallyServer: '*' | 'a' | null = null;
  let currentRallyOurZone: number | null = null;

  const skillRegex = /^([*a])(\d{2})([SREABD]).([#+\!/\-=])/;
  const pointRegex = /^([*a])p(\d{2}):(\d{2})/;

  for (const sLine of scoutLines) {
    const cols = sLine.split(';');
    const code = cols[0] || '';

    // 1. Rally point scored (*p01:03 or ap00:01)
    const ptMatch = code.match(pointRegex);
    if (ptMatch && currentRallyServer && currentRallyOurZone) {
      const pointWinner = ptMatch[1] as '*' | 'a';
      const weWon = pointWinner === ourPrefix;
      const rot = rotationsMap.get(currentRallyOurZone);
      if (rot) {
        if (currentRallyServer === ourPrefix) {
          rot.bpTotal++;
          if (weWon) rot.bpWon++;
        } else {
          rot.soTotal++;
          if (weWon) rot.soWon++;
        }
      }
      currentRallyServer = null;
      currentRallyOurZone = null;
      continue;
    }

    // 2. Player skill touch
    const skMatch = code.match(skillRegex);
    if (!skMatch) continue;

    const team = skMatch[1] as '*' | 'a';
    const num = parseInt(skMatch[2], 10);
    const skill = skMatch[3];
    const grade = skMatch[4];

    // Track who served this rally & our setter zone (col 9 = home zone, col 10 = away zone)
    if (skill === 'S') {
      currentRallyServer = team;
      const zoneVal = parseInt(isHome ? cols[9] : cols[10], 10);
      currentRallyOurZone = zoneVal >= 1 && zoneVal <= 6 ? zoneVal : null;
    }

    if (team !== ourPrefix) continue;

    let player = ourPlayers.get(num);
    if (!player) {
      player = {
        number: num,
        name: `#${num}`,
        isLibero: false,
        serve: { total: 0, aces: 0, errors: 0 },
        reception: { total: 0, perfect: 0, positive: 0, errors: 0 },
        attack: { total: 0, kills: 0, errors: 0, blocked: 0 },
        block: { total: 0, kills: 0, positive: 0, errors: 0 },
        dig: { total: 0, positive: 0, errors: 0 },
      };
      ourPlayers.set(num, player);
    }

    if (skill === 'S') {
      player.serve.total++;
      if (grade === '#') player.serve.aces++;
      else if (grade === '=') player.serve.errors++;
    } else if (skill === 'R') {
      player.reception.total++;
      if (grade === '#') player.reception.perfect++;
      else if (grade === '+') player.reception.positive++;
      else if (grade === '=') player.reception.errors++;
    } else if (skill === 'A') {
      player.attack.total++;
      if (grade === '#') player.attack.kills++;
      else if (grade === '=') player.attack.errors++;
      else if (grade === '/') player.attack.blocked++;
    } else if (skill === 'B') {
      player.block.total++;
      if (grade === '#') player.block.kills++;
      else if (grade === '+') player.block.positive++;
      else if (grade === '=') player.block.errors++;
    } else if (skill === 'D') {
      player.dig.total++;
      if (grade === '#' || grade === '+') player.dig.positive++;
      else if (grade === '=') player.dig.errors++;
    }
  }

  // Only keep players who had at least one touch
  const players = Array.from(ourPlayers.values())
    .filter(
      (p) =>
        p.serve.total +
          p.reception.total +
          p.attack.total +
          p.block.total +
          p.dig.total >
        0
    )
    .sort((a, b) => a.number - b.number);

  return {
    date: matchDate,
    opponent,
    isHome,
    setsWon,
    setsLost,
    setScores,
    players,
    rotations: Array.from(rotationsMap.values()),
  };
}