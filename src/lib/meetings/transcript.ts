export type SpeakerTurn = {
  speaker: string;
  text: string;
};

const SPEAKER_LINE = /^(speaker|spreker)\s+(\d+)\s*:\s*(.*)$/i;

function speakerLabel(kind: string, number: string): string {
  return `${kind.toLowerCase() === 'spreker' ? 'Spreker' : 'Speaker'} ${number}`;
}

/**
 * Split a diarized transcript into turns.
 * Returns null when the text is not a speaker dialogue (fewer than two turns,
 * or prose before the first speaker), so the editor can keep a plain text area.
 */
export function parseSpeakerTurns(text: string): SpeakerTurn[] | null {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const turns: SpeakerTurn[] = [];
  let current: SpeakerTurn | null = null;

  for (const line of lines) {
    const match = line.match(SPEAKER_LINE);
    if (match) {
      if (current) turns.push(finishTurn(current));
      current = { speaker: speakerLabel(match[1], match[2]), text: match[3] ?? '' };
      continue;
    }
    if (!current) {
      if (line.trim()) return null;
      continue;
    }
    current.text += `\n${line}`;
  }

  if (current) turns.push(finishTurn(current));
  if (turns.length < 2) return null;
  return turns;
}

function finishTurn(turn: SpeakerTurn): SpeakerTurn {
  return { speaker: turn.speaker, text: turn.text.replace(/\s+$/u, '') };
}

export function serializeSpeakerTurns(turns: SpeakerTurn[]): string {
  return turns
    .map((turn) => `${turn.speaker}: ${turn.text}`.replace(/\s+$/u, ''))
    .join('\n\n');
}

export function meetingImportKind(filename: string): 'text' | 'docx' | null {
  const name = filename.toLowerCase().trim();
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.txt') || name.endsWith('.md')) return 'text';
  return null;
}
