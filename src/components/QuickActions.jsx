import React, { useMemo, useRef, useState } from 'react';
import './QuickActions.css';
import { addToCalendar } from '../calendar';

/**
 * Quick Action Items panel (embedded in the dashboard) with swipe gestures.
 *   Swipe right -> toggle complete
 *   Swipe left  -> delete
 *   Tap         -> toggle complete
 *
 * Props (shapes match the /quick-items API):
 *   items:    [{ id, text, dueDate?: ISO string | "YYYY-MM-DD" | null, completed }]
 *   onAdd(text, dueDate|null)
 *   onToggle(id)
 *   onDelete(id)
 */

const SWIPE_TRIGGER = 90;
const MAX_DRAG = 140;
const CARD_TONES = ['#fdf3ee', '#f9e9eb', '#fbfae6', '#eef4fb', '#eef8ea'];

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dueKey = (item) => (item.dueDate ? item.dueDate.slice(0, 10) : null);

const nextSevenDays = () => {
  const out = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d);
  }
  return out;
};

const formatDue = (key, todayKey) => {
  if (!key) return '';
  if (key === todayKey) return 'Today';
  const d = new Date(key + 'T00:00');
  const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return key < todayKey ? `Overdue · ${label}` : label;
};

function SwipeRow({ item, tone, todayKey, onToggle, onDelete }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const start = useRef(null);
  const axis = useRef(null);

  const down = (e) => {
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = null;
  };

  const move = (e) => {
    if (!start.current) return;
    const mx = e.clientX - start.current.x;
    const my = e.clientY - start.current.y;
    if (!axis.current && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
      axis.current = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (axis.current === 'x') {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }
    }
    if (axis.current === 'x') setDx(Math.max(-MAX_DRAG, Math.min(MAX_DRAG, mx)));
  };

  const up = () => {
    if (!start.current) return;
    const wasSwipe = axis.current === 'x';
    const wasScroll = axis.current === 'y';
    start.current = null;
    axis.current = null;
    setDragging(false);

    if (wasScroll) return;
    if (!wasSwipe) {
      onToggle(item.id);
      return;
    }
    if (dx >= SWIPE_TRIGGER) {
      setDx(0);
      onToggle(item.id);
    } else if (dx <= -SWIPE_TRIGGER) {
      setLeaving(true);
      setTimeout(() => onDelete(item.id), 200);
    } else {
      setDx(0);
    }
  };

  const cancel = () => {
    start.current = null;
    axis.current = null;
    setDragging(false);
    setDx(0);
  };

  const key = dueKey(item);
  const dueClass = !key || item.completed ? '' : key < todayKey ? 'qa-due-overdue' : key === todayKey ? 'qa-due-today' : '';
  const reveal = dx > 0 ? 'complete' : dx < 0 ? 'delete' : '';
  const armed = Math.abs(dx) >= SWIPE_TRIGGER;

  return (
    <div className={`qa-row ${leaving ? 'qa-leaving' : ''}`}>
      <div className={`qa-under qa-under-${reveal} ${armed ? 'qa-armed' : ''}`}>
        <span className="qa-under-left">{item.completed ? '↺ Undo' : '✓ Done'}</span>
        <span className="qa-under-right">🗑 Delete</span>
      </div>
      <div
        className={`qa-card ${item.completed ? 'qa-done' : ''}`}
        style={{
          background: tone,
          transform: `translateX(${leaving ? -500 : dx}px)`,
          transition: dragging ? 'none' : 'transform 200ms ease',
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
      >
        <span className={`qa-check ${item.completed ? 'qa-check-on' : ''}`}>{item.completed ? '✓' : ''}</span>
        <span className="qa-body">
          <span className="qa-title">{item.text}</span>
          {key && <span className={`qa-due-label ${dueClass}`}>{formatDue(key, todayKey)}</span>}
        </span>
        {key && !item.completed && (
          <button
            type="button"
            className="qa-cal-btn"
            aria-label="Add to Calendar"
            title="Add to Calendar"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              addToCalendar({ title: item.text, description: 'Quick Action Item', dueDate: key });
            }}
          >
            📅
          </button>
        )}
        <span className="qa-count">{item.completed ? '1/1' : '0/1'}</span>
      </div>
    </div>
  );
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'nodate', label: 'No date' },
];

export default function QuickActions({ items = [], onAdd, onToggle, onDelete }) {
  const days = useMemo(nextSevenDays, []);
  const todayKey = ymd(new Date());
  const [day, setDay] = useState(null); // null = no day selected
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [due, setDue] = useState('');

  const counts = useMemo(() => {
    const c = {};
    for (const it of items) {
      if (it.completed) continue;
      const k = dueKey(it);
      if (k) c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [items]);

  const matches = (it) => {
    const k = dueKey(it);
    if (day) return k === day;
    switch (filter) {
      case 'overdue': return !!k && k < todayKey;
      case 'today': return k === todayKey;
      case 'upcoming': return !!k && k > todayKey;
      case 'nodate': return !k;
      default: return true;
    }
  };

  const sortByDue = (a, b) => (dueKey(a) || '9999') .localeCompare(dueKey(b) || '9999');
  const visible = items.filter(matches);
  const open = visible.filter((i) => !i.completed).sort(sortByDue);
  const done = visible.filter((i) => i.completed);

  const pickDay = (k) => {
    setDay(day === k ? null : k);
  };
  const pickFilter = (f) => {
    setDay(null);
    setFilter(f);
  };

  const openAdd = () => {
    setDue(day || '');
    setAdding(true);
  };

  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onAdd(t, due || null);
    setText('');
    setAdding(false);
  };

  const dayLabel = day
    ? day === todayKey
      ? 'Today'
      : new Date(day + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  return (
    <section className="qa-panel">
      <header className="qa-header">
        <h3>
          Quick Action Items
          {dayLabel && <span className="qa-header-day"> · {dayLabel}</span>}
        </h3>
        <button className="qa-add-btn" onClick={openAdd} aria-label="Add action item">+ Add</button>
      </header>

      <div className="qa-week">
        {days.map((d) => {
          const k = ymd(d);
          return (
            <button key={k} className={`qa-day ${k === day ? 'qa-day-on' : ''}`} onClick={() => pickDay(k)}>
              <span className="qa-dow">{d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}</span>
              <span className={`qa-dnum ${k === todayKey ? 'qa-dnum-today' : ''}`}>{d.getDate()}</span>
              <span className="qa-dot">{counts[k] ? '•'.repeat(Math.min(counts[k], 3)) : ''}</span>
            </button>
          );
        })}
      </div>

      <div className="qa-chips">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`qa-chip ${!day && filter === f.id ? 'qa-chip-on' : ''}`}
            onClick={() => pickFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="qa-list">
        {open.length === 0 && done.length === 0 && <p className="qa-empty">Nothing here. Tap + to add.</p>}
        {open.map((it, i) => (
          <SwipeRow
            key={it.id}
            item={it}
            tone={CARD_TONES[i % CARD_TONES.length]}
            todayKey={todayKey}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
        {done.length > 0 && <h2 className="qa-section">Completed ({done.length})</h2>}
        {done.map((it) => (
          <SwipeRow key={it.id} item={it} tone="#f2f3f5" todayKey={todayKey} onToggle={onToggle} onDelete={onDelete} />
        ))}
        {visible.length > 0 && <p className="qa-hint">Swipe right to complete · left to delete</p>}
      </div>

      {adding && (
        <div className="qa-sheet-backdrop" onClick={() => setAdding(false)}>
          <form className="qa-sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <input autoFocus placeholder="New action item" value={text} onChange={(e) => setText(e.target.value)} />
            <label className="qa-due-field">
              Due date (optional)
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
            <button type="submit" className="qa-save">Add</button>
          </form>
        </div>
      )}
    </section>
  );
}
