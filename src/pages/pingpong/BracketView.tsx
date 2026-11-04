import { stageHe, type TTMatch, type TTParticipant } from '../../lib/pingpong';
import { PP } from './theme';

interface Props {
  matches: TTMatch[];                 // knockout matches only (stage != group)
  byId: Record<string, TTParticipant>;
  onPick?: (m: TTMatch, winnerId: string) => void; // editable when provided
}

export default function BracketView({ matches, byId, onPick }: Props) {
  const ko = matches.filter(m => m.stage !== 'group');
  if (ko.length === 0) return null;
  const rounds = [...new Set(ko.map(m => m.round))].sort((a, b) => a - b);
  const name = (id?: string | null) => (id && byId[id]?.full_name) || '—';

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 18, direction: 'rtl', minWidth: 'min-content' }}>
        {rounds.map(r => {
          const col = ko.filter(m => m.round === r).sort((a, b) => a.slot - b.slot);
          const label = stageHe[col[0].stage] || '';
          return (
            <div key={r} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 14, minWidth: 190 }}>
              <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: PP.orange, marginBottom: 2 }}>{label}</div>
              {col.map(m => {
                const done = m.status === 'done';
                const row = (pid?: string | null, slot?: number) => {
                  const win = done && m.winner_id === pid;
                  const clickable = !!onPick && !!pid;
                  return (
                    <div
                      onClick={() => clickable && pid && onPick!(m, pid)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 10px', fontSize: 13, fontWeight: win ? 800 : 600,
                        background: win ? 'rgba(22,163,74,0.22)' : '#0e1626',
                        color: win ? '#bbf7d0' : PP.text,
                        cursor: clickable ? 'pointer' : 'default',
                        borderBottom: slot === 1 ? `1px solid ${PP.line}` : 'none',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(pid)}</span>
                      {win && <span>🏆</span>}
                    </div>
                  );
                };
                return (
                  <div key={m.id} style={{ border: `1.5px solid ${m.stage === 'final' ? PP.orange : PP.line}`, borderRadius: 10, overflow: 'hidden', boxShadow: m.stage === 'final' ? '0 0 16px rgba(255,122,24,0.25)' : 'none' }}>
                    {row(m.player1_id, 1)}
                    {row(m.player2_id, 2)}
                    {m.score && m.score !== 'bye' && <div style={{ textAlign: 'center', fontSize: 11, color: PP.dim, padding: '2px 0', background: '#0a1120' }}>{m.score}</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
