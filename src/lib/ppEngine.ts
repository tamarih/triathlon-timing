import { supabase } from './supabase';
import { splitIntoGroups, roundRobin, type TTParticipant, type TTMatch, type TTGroup, type TTStage } from './pingpong';

// ---- Standings -------------------------------------------------------
export interface Standing {
  participant: TTParticipant;
  played: number; wins: number; losses: number; points: number; // points = wins
}

// Compute standings for a set of players from their completed matches.
// Tiebreak: wins → head-to-head → fewer losses → name.
export function computeStandings(players: TTParticipant[], matches: TTMatch[]): Standing[] {
  const rows: Record<string, Standing> = {};
  for (const p of players) rows[p.id] = { participant: p, played: 0, wins: 0, losses: 0, points: 0 };
  for (const m of matches) {
    if (m.status !== 'done' || !m.winner_id) continue;
    const loserId = m.winner_id === m.player1_id ? m.player2_id : m.player1_id;
    if (m.winner_id && rows[m.winner_id]) { rows[m.winner_id].wins++; rows[m.winner_id].played++; rows[m.winner_id].points++; }
    if (loserId && rows[loserId]) { rows[loserId].losses++; rows[loserId].played++; }
  }
  const h2h = (a: string, b: string): number => {
    const m = matches.find(x => x.status === 'done' && x.winner_id &&
      ((x.player1_id === a && x.player2_id === b) || (x.player1_id === b && x.player2_id === a)));
    if (!m) return 0;
    return m.winner_id === a ? -1 : 1;
  };
  return Object.values(rows).sort((x, y) =>
    y.wins - x.wins ||
    h2h(x.participant.id, y.participant.id) ||
    x.losses - y.losses ||
    x.participant.full_name.localeCompare(y.participant.full_name, 'he'));
}

// ---- Group stage -----------------------------------------------------
const LETTERS = 'ABCDEFGHIJKLMNOP';

export async function generateGroups(categoryId: string, players: TTParticipant[], groupSize = 4) {
  // wipe anything existing for this category
  await supabase.from('tt_matches').delete().eq('category_id', categoryId);
  await supabase.from('tt_groups').delete().eq('category_id', categoryId);
  await supabase.from('tt_participants').update({ group_id: null, status: 'active' }).eq('category_id', categoryId);

  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const groups = splitIntoGroups(shuffled, groupSize);
  for (let i = 0; i < groups.length; i++) {
    const { data: g } = await supabase.from('tt_groups')
      .insert({ category_id: categoryId, name: LETTERS[i] || `${i + 1}`, sort: i }).select().single();
    if (!g) continue;
    for (const m of groups[i]) await supabase.from('tt_participants').update({ group_id: g.id }).eq('id', m.id);
    const pairs = roundRobin(groups[i]);
    const rows = pairs.map(([a, b], idx) => ({
      category_id: categoryId, stage: 'group', group_id: g.id, slot: idx,
      player1_id: a.id, player2_id: b.id, status: 'pending',
    }));
    if (rows.length) await supabase.from('tt_matches').insert(rows);
  }
}

// ---- Knockout --------------------------------------------------------
function seedOrder(size: number): number[] {
  let pls = [1, 2];
  const rounds = Math.log2(size);
  for (let r = 1; r < rounds; r++) {
    const out: number[] = [];
    const sum = pls.length * 2 + 1;
    for (const p of pls) { out.push(p); out.push(sum - p); }
    pls = out;
  }
  return pls;
}

function stageFor(matchesInRound: number): TTStage {
  if (matchesInRound <= 1) return 'final';
  if (matchesInRound === 2) return 'semi';
  if (matchesInRound === 4) return 'quarter';
  if (matchesInRound === 8) return 'r16';
  return 'r32';
}

// Build a knockout bracket from the top `advancersPerGroup` of each group.
export async function generateKnockout(categoryId: string, groups: TTGroup[], players: TTParticipant[], groupMatches: TTMatch[], advancersPerGroup = 2) {
  // Remove any existing knockout matches (keep group matches).
  await supabase.from('tt_matches').delete().eq('category_id', categoryId).neq('stage', 'group');

  // advancing players, seeded: all group-winners first, then 2nd places, etc.
  const perGroup = groups.map(g => {
    const mem = players.filter(p => p.group_id === g.id);
    const st = computeStandings(mem, groupMatches.filter(m => m.group_id === g.id));
    return st.slice(0, advancersPerGroup).map(s => s.participant);
  });
  const seeds: TTParticipant[] = [];
  for (let rank = 0; rank < advancersPerGroup; rank++)
    for (const g of perGroup) if (g[rank]) seeds.push(g[rank]);

  if (seeds.length < 2) throw new Error('צריך לפחות 2 מעפילים ליצירת נוקאאוט');

  let size = 1; while (size < seeds.length) size *= 2;
  const order = seedOrder(size); // bracket slot -> seed number (1-based)
  const slotPlayers = order.map(seedNo => seeds[seedNo - 1] || null); // null = bye

  // Create rounds from final backwards so next_match_id is known.
  const roundsCount = Math.log2(size);
  const roundIds: string[][] = [];
  for (let r = 0; r < roundsCount; r++) roundIds.push([]);

  // final (round index roundsCount-1) has 1 match; first round (0) has size/2
  // create from final back to first
  let nextRoundIds: string[] = [];
  for (let r = roundsCount - 1; r >= 0; r--) {
    const count = Math.pow(2, roundsCount - 1 - r); // matches this round
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const nextId = r === roundsCount - 1 ? null : nextRoundIds[Math.floor(i / 2)];
      const nextSlot = r === roundsCount - 1 ? null : (i % 2) + 1;
      const { data } = await supabase.from('tt_matches').insert({
        category_id: categoryId, stage: stageFor(count), group_id: null,
        round: r, slot: i, next_match_id: nextId, next_slot: nextSlot, status: 'pending',
      }).select('id').single();
      ids.push(data!.id);
    }
    roundIds[r] = ids;
    nextRoundIds = ids;
  }

  // Fill first round players from seeded slots.
  const first = roundIds[0];
  for (let i = 0; i < first.length; i++) {
    const p1 = slotPlayers[i * 2] || null;
    const p2 = slotPlayers[i * 2 + 1] || null;
    await supabase.from('tt_matches').update({ player1_id: p1?.id || null, player2_id: p2?.id || null }).eq('id', first[i]);
  }
  // Resolve byes (a player with no opponent auto-advances).
  const { data: fresh } = await supabase.from('tt_matches').select('*').eq('category_id', categoryId).eq('round', 0);
  for (const m of (fresh || []) as TTMatch[]) {
    const only = m.player1_id && !m.player2_id ? m.player1_id : (!m.player1_id && m.player2_id ? m.player2_id : null);
    if (only) await recordResult(m, only, 'bye', true);
  }
}

// ---- Record a result + propagate winner ------------------------------
export async function recordResult(match: TTMatch, winnerId: string, score: string | null, silent = false) {
  await supabase.from('tt_matches').update({ winner_id: winnerId, score, status: 'done' }).eq('id', match.id);
  if (match.next_match_id && match.next_slot) {
    const field = match.next_slot === 1 ? 'player1_id' : 'player2_id';
    await supabase.from('tt_matches').update({ [field]: winnerId }).eq('id', match.next_match_id);
  }
  // Champion: a finished final.
  if (!silent && match.stage === 'final') {
    await supabase.from('tt_participants').update({ status: 'champion' }).eq('id', winnerId);
  }
}

// Clear a result (undo) — also clears the player from the next match slot.
export async function clearResult(match: TTMatch) {
  await supabase.from('tt_matches').update({ winner_id: null, score: null, status: 'pending' }).eq('id', match.id);
  if (match.winner_id) await supabase.from('tt_participants').update({ status: 'active' }).eq('id', match.winner_id);
  if (match.next_match_id && match.next_slot && match.winner_id) {
    const field = match.next_slot === 1 ? 'player1_id' : 'player2_id';
    // only clear if the next slot still holds this winner
    const { data: nm } = await supabase.from('tt_matches').select('*').eq('id', match.next_match_id).single();
    if (nm && nm[field] === match.winner_id) await supabase.from('tt_matches').update({ [field]: null }).eq('id', match.next_match_id);
  }
}
