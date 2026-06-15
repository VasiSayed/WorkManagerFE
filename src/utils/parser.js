/**
 * parseMomNotepad — smart parser for MOM notepad input
 *
 * Recognises section headers (MOM:, Conclusion:, Action:, Next:, Discussed:)
 * and plain bullet points. Returns { mom, conclusion, next_action }.
 *
 * Example input (all formats supported):
 *   MOM: Discussed sprint goals, reviewed velocity
 *   - Login bug to be fixed by Rahul by Friday
 *   Conclusion: Proceed with Phase 2
 *   Action: Priya to update docs, Rahul to fix bug
 *
 * Or plain paragraphs split by blank line:
 *   First paragraph → mom
 *   Second → conclusion
 *   Third  → next_action
 */
export function parseMomNotepad(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const result = { mom: '', conclusion: '', next_action: '', action_items: [] };

  const momTriggers    = /^(mom|discussed|discussion|minutes|notes?|meeting notes?)\s*[:\-–]/i;
  const conclTriggers  = /^(conclusion|summary|outcome|result|decided|decision|resolved)\s*[:\-–]/i;
  const actionTriggers = /^(action|actions?|next actions?|next steps?|follow[\s-]?up|todo|to[\s-]?do|tasks?)\s*[:\-–]/i;

  let currentSection = 'mom';
  const buckets = { mom: [], conclusion: [], next_action: [] };

  lines.forEach(line => {
    if (momTriggers.test(line)) {
      currentSection = 'mom';
      const content = line.replace(momTriggers, '').trim();
      if (content) buckets.mom.push(content);
    } else if (conclTriggers.test(line)) {
      currentSection = 'conclusion';
      const content = line.replace(conclTriggers, '').trim();
      if (content) buckets.conclusion.push(content);
    } else if (actionTriggers.test(line)) {
      currentSection = 'next_action';
      const content = line.replace(actionTriggers, '').trim();
      if (content) buckets.next_action.push(content);
    } else {
      // plain line or bullet — goes to current section
      const clean = line.replace(/^[-•*]\s*/, '');
      if (clean) buckets[currentSection].push(clean);
    }
  });

  // If nothing was section-tagged, try splitting by blank-line blocks
  if (!buckets.mom.length && !buckets.conclusion.length && !buckets.next_action.length) {
    const blocks = raw.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    result.mom         = blocks[0] || '';
    result.conclusion  = blocks[1] || '';
    result.next_action = blocks[2] || '';
    result.action_items = parseActionItems(result.next_action);
    return result;
  }

  result.mom         = buckets.mom.join('\n');
  result.conclusion  = buckets.conclusion.join('\n');
  result.next_action = buckets.next_action.join('\n');
  result.action_items = parseActionItems(result.next_action);
  return result;
}

export function parseNotepadMulti(raw) {
  const blocks = raw.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return (blocks.length > 1 ? blocks : [raw]).flatMap(block => {
    const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
    const flat = lines.join(', ');
    const parts = flat.split(/,\s*/).map(p => p.trim()).filter(Boolean);
    const pMap = { urgent:'urgent', high:'high', hi:'high', normal:'normal', med:'normal', medium:'normal', low:'low' };
    const statusMap = { todo:'todo', pending:'todo', progress:'in_progress', 'in progress':'in_progress', done:'completed', completed:'completed' };
    const timeRx = /^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/;
    const dateRx = /^\d{4}-\d{2}-\d{2}$/;
    let current = { name:'', description:'', date:'', start:'', end:'', priority:'normal', status:'todo', assigned:'', reason:'', notes:'' };
    let nameSet = false;

    const assignText = (key, value) => {
      const clean = value.trim();
      if (!clean) return true;
      if (/^(note|notes)\s*[:\-–]/i.test(key)) { current.notes = clean; return true; }
      if (/^(reason|why)\s*[:\-–]/i.test(key)) { current.reason = clean; return true; }
      if (/^(desc|description|details)\s*[:\-–]/i.test(key)) { current.description = clean; return true; }
      return false;
    };

    parts.forEach(p => {
      const lo = p.toLowerCase();
      const kv = p.match(/^([a-zA-Z ]+)\s*[:\-–]\s*(.+)$/);
      if (kv && assignText(kv[1], kv[2])) return;
      if (dateRx.test(p)) { current.date = p; return; }
      if (timeRx.test(p)) { const [,s,e] = p.match(timeRx); current.start = s; current.end = e; return; }
      if (pMap[lo]) { current.priority = pMap[lo]; return; }
      if (statusMap[lo]) { current.status = statusMap[lo]; return; }
      if (!nameSet && p.length > 2) { current.name = p; nameSet = true; return; }
      if (nameSet && !current.assigned && /^[A-Z]/.test(p) && p.split(' ').length <= 3) { current.assigned = p; return; }
      if (nameSet && !current.notes) { current.notes = p; return; }
    });
    if (!current.date) current.date = new Date().toISOString().slice(0, 10);
    return current.name ? [current] : [];
  });
}


export function parseActionItems(raw) {
  return String(raw || '')
    .split(/\n|(?:\s{2,})/)
    .map(line => line.trim().replace(/^[-•*\d.)]+\s*/, ''))
    .filter(Boolean)
    .map(text => {
      const lower = text.toLowerCase();
      const done = /\b(done|completed|closed)\b/.test(lower) || /\[(done|completed|closed|x|✓)\]/i.test(text);
      text = text.replace(/\s*\[(done|completed|closed|x|✓|todo|pending)\]\s*$/i, '').trim();
      return { text, done };
    });
}
