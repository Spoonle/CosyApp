/** Module Étude — matières, chapitres, sessions, flashcards SM-2. */
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BookOpenCheck,
  Check,
  ChevronRight,
  GraduationCap,
  Layers,
  Plus,
  Timer,
  Trash2
} from 'lucide-react';
import {
  EmptyState,
  Field,
  GlassButton,
  IconButton,
  Input,
  Modal,
  ProgressBar,
  SectionTitle,
  Segmented,
  Select,
  Slider,
  Textarea
} from '@/components/glass';
import { db, nowTs, uid } from '@/services/storage/db';
import type { Chapter, Flashcard, Subject } from '@/types/domain';
import { confirmAction, toast } from '@/stores/toast';
import { onBus } from '@/services/bus';
import { schedule as srsSchedule, type Grade } from '@/services/study/srs';
import { addDaysKey, dateKey, minutesToHM, todayKey } from '@/services/dates/dateUtils';

type Tab = 'subjects' | 'flashcards' | 'sessions';

const SUBJECT_COLORS = [
  'hsl(248 84% 70%)',
  'hsl(172 70% 50%)',
  'hsl(36 90% 58%)',
  'hsl(150 62% 52%)',
  'hsl(0 78% 66%)',
  'hsl(210 88% 64%)'
];

export default function StudyModule(): React.ReactNode {
  const [tab, setTab] = useState<Tab>('subjects');

  useEffect(() => onBus('study:review-due', () => setTab('flashcards')), []);

  return (
    <div className="module-root">
      <div className="module-header">
        <h2>Espace d’étude</h2>
        <span className="spacer" />
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'subjects', label: 'Matières' },
            { value: 'flashcards', label: 'Flashcards' },
            { value: 'sessions', label: 'Sessions' }
          ]}
        />
      </div>
      <div className="module-body">
        {tab === 'subjects' && <SubjectsTab />}
        {tab === 'flashcards' && <FlashcardsTab />}
        {tab === 'sessions' && <SessionsTab />}
      </div>
    </div>
  );
}

/* ---------- Matières ---------- */

function SubjectsTab(): React.ReactNode {
  const subjects = useLiveQuery(() => db.subjects.toArray(), [], [] as Subject[]);
  const chapters = useLiveQuery(() => db.chapters.toArray(), [], [] as Chapter[]);
  const [creating, setCreating] = useState(false);
  const [newChapter, setNewChapter] = useState<Record<string, string>>({});

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <GlassButton size="sm" variant="primary" onClick={() => setCreating(true)}>
          <Plus size={14} /> Nouvelle matière
        </GlassButton>
      </div>
      {subjects.length === 0 && (
        <EmptyState icon={<GraduationCap size={30} />} title="Aucune matière">
          Créez vos matières, ajoutez des chapitres et suivez votre progression. Les flashcards et
          les sessions de révision s’y rattachent.
        </EmptyState>
      )}
      {subjects.map((subject) => {
        const mine = chapters.filter((c) => c.subjectId === subject.id);
        const done = mine.filter((c) => c.done).length;
        return (
          <div key={subject.id} className="glass-ultra card" style={{ marginBottom: 10, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 99, background: subject.color }} />
              <span style={{ fontWeight: 650, flex: 1 }}>{subject.name}</span>
              <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                {done}/{mine.length} chapitres
              </span>
              <IconButton
                label="Supprimer la matière"
                size="sm"
                className="btn-danger"
                onClick={async () => {
                  const ok = await confirmAction({
                    title: 'Supprimer cette matière ?',
                    message: `« ${subject.name} », ses chapitres et ses flashcards seront supprimés.`,
                    confirmLabel: 'Supprimer',
                    danger: true
                  });
                  if (!ok) return;
                  await db.chapters.bulkDelete(mine.map((c) => c.id));
                  const cards = await db.flashcards.where('subjectId').equals(subject.id).toArray();
                  await db.flashcards.bulkDelete(cards.map((c) => c.id));
                  await db.subjects.delete(subject.id);
                }}
              >
                <Trash2 size={13} />
              </IconButton>
            </div>
            <ProgressBar value={mine.length > 0 ? done / mine.length : 0} label={`Progression ${subject.name}`} />
            <div style={{ marginTop: 10 }}>
              {mine
                .sort((a, b) => a.order - b.order)
                .map((ch) => (
                  <div key={ch.id} className="list-row" style={{ padding: '4px 4px' }}>
                    <input
                      type="checkbox"
                      checked={ch.done}
                      onChange={() =>
                        void db.chapters.put({ ...ch, done: !ch.done, updatedAt: nowTs() })
                      }
                      aria-label={ch.name}
                    />
                    <span style={{ flex: 1, opacity: ch.done ? 0.6 : 1, textDecoration: ch.done ? 'line-through' : 'none' }}>
                      {ch.name}
                    </span>
                    <button
                      className="text-muted"
                      aria-label="Supprimer le chapitre"
                      onClick={() => void db.chapters.delete(ch.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <Input
                  placeholder="Nouveau chapitre…"
                  value={newChapter[subject.id] ?? ''}
                  onChange={(e) => setNewChapter((s) => ({ ...s, [subject.id]: e.target.value }))}
                  onKeyDown={async (e) => {
                    if (e.key !== 'Enter') return;
                    const name = (newChapter[subject.id] ?? '').trim();
                    if (!name) return;
                    const ts = nowTs();
                    await db.chapters.put({
                      id: uid(),
                      createdAt: ts,
                      updatedAt: ts,
                      subjectId: subject.id,
                      name,
                      done: false,
                      order: mine.length
                    });
                    setNewChapter((s) => ({ ...s, [subject.id]: '' }));
                  }}
                  style={{ fontSize: 'var(--text-sm)' }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {creating && (
        <SubjectEditor
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}

function SubjectEditor({ onClose }: { onClose: () => void }): React.ReactNode {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  return (
    <Modal
      open
      onClose={onClose}
      title="Nouvelle matière"
      footer={
        <>
          <GlassButton variant="ghost" onClick={onClose}>Annuler</GlassButton>
          <GlassButton
            variant="primary"
            onClick={async () => {
              if (!name.trim()) return;
              const ts = nowTs();
              await db.subjects.put({
                id: uid(),
                createdAt: ts,
                updatedAt: ts,
                name: name.trim(),
                color,
                order: ts
              });
              onClose();
            }}
          >
            Créer
          </GlassButton>
        </>
      }
    >
      <div className="module-editor">
        <Field label="Nom de la matière">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Histoire, Biologie…" />
        </Field>
        <Field label="Couleur">
          <span style={{ display: 'flex', gap: 6 }}>
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Couleur ${c}`}
                onClick={() => setColor(c)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 99,
                  background: c,
                  border: color === c ? '2px solid rgb(255 255 255 / 0.9)' : '2px solid transparent'
                }}
              />
            ))}
          </span>
        </Field>
      </div>
    </Modal>
  );
}

/* ---------- Flashcards (SM-2) ---------- */

function FlashcardsTab(): React.ReactNode {
  const subjects = useLiveQuery(() => db.subjects.toArray(), [], [] as Subject[]);
  const cards = useLiveQuery(() => db.flashcards.toArray(), [], [] as Flashcard[]);
  const [subjectId, setSubjectId] = useState<string>('all');
  const [reviewing, setReviewing] = useState(false);
  const [creating, setCreating] = useState<Flashcard | null>(null);

  const today = todayKey();
  const filtered = useMemo(
    () => (subjectId === 'all' ? cards : cards.filter((c) => c.subjectId === subjectId)),
    [cards, subjectId]
  );
  const dueCards = useMemo(
    () => filtered.filter((c) => c.due <= today).sort((a, b) => a.due.localeCompare(b.due)),
    [filtered, today]
  );

  if (reviewing) {
    return (
      <ReviewSession
        cards={dueCards}
        onExit={() => setReviewing(false)}
      />
    );
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">Toutes les matières</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <span className="chip chip-accent">{dueCards.length} à réviser aujourd’hui</span>
        <span style={{ flex: 1 }} />
        <GlassButton
          size="sm"
          variant="primary"
          disabled={dueCards.length === 0}
          onClick={() => setReviewing(true)}
        >
          <BookOpenCheck size={14} /> Réviser ({dueCards.length})
        </GlassButton>
      </div>

      {filtered.length === 0 && (
        <EmptyState icon={<Layers size={28} />} title="Aucune flashcard">
          Créez des cartes (recto/verso) : CozyDesk planifie leurs révisions avec l’algorithme de
          répétition espacée SM-2.
        </EmptyState>
      )}

      {filtered.map((card) => {
        const subject = subjects.find((s) => s.id === card.subjectId);
        return (
          <div key={card.id} className="list-row glass-ultra" style={{ borderRadius: 'var(--radius-md)', marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: subject?.color ?? '#888' }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 550 }}>{card.front}</span>
              <span className="text-muted" style={{ fontSize: 'var(--text-xs)', display: 'block' }}>
                {card.back}
              </span>
            </span>
            <span className="chip" style={{ fontSize: 'var(--text-2xs)' }}>
              {card.due <= today ? 'due' : card.due}
            </span>
            <IconButton label="Modifier" size="sm" onClick={() => setCreating(card)}>
              <ChevronRight size={13} />
            </IconButton>
          </div>
        );
      })}

      <GlassButton size="sm" variant="ghost" onClick={() => setCreating({
        id: '',
        createdAt: 0,
        updatedAt: 0,
        subjectId: subjectId === 'all' ? (subjects[0]?.id ?? '') : subjectId,
        front: '',
        back: '',
        ease: 2.5,
        intervalDays: 0,
        due: today,
        reps: 0,
        lapses: 0
      })}>
        <Plus size={14} /> Nouvelle carte
      </GlassButton>

      {creating !== null && (
        <CardEditor
          card={creating}
          subjects={subjects}
          onClose={() => setCreating(null)}
        />
      )}
    </>
  );
}

function CardEditor({
  card,
  subjects,
  onClose
}: {
  card: Flashcard;
  subjects: Subject[];
  onClose: () => void;
}): React.ReactNode {
  const isNew = card.id === '';
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [subjectId, setSubjectId] = useState(card.subjectId || subjects[0]?.id || '');
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Nouvelle flashcard' : 'Modifier la carte'}
      footer={
        <>
          {!isNew && (
            <GlassButton
              variant="danger"
              onClick={async () => {
                await db.flashcards.delete(card.id);
                onClose();
              }}
            >
              <Trash2 size={14} /> Supprimer
            </GlassButton>
          )}
          <span style={{ flex: 1 }} />
          <GlassButton variant="ghost" onClick={onClose}>Annuler</GlassButton>
          <GlassButton
            variant="primary"
            onClick={async () => {
              if (front.trim().length === 0 || back.trim().length === 0) {
                setError('Recto et verso sont obligatoires.');
                return;
              }
              const ts = nowTs();
              await db.flashcards.put({
                ...card,
                id: isNew ? uid() : card.id,
                createdAt: card.createdAt || ts,
                updatedAt: ts,
                subjectId,
                front: front.trim(),
                back: back.trim()
              });
              onClose();
            }}
          >
            Enregistrer
          </GlassButton>
        </>
      }
    >
      <div className="module-editor">
        <Field label="Matière">
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Recto (question)">
          <Textarea rows={2} value={front} onChange={(e) => setFront(e.target.value)} />
        </Field>
        <Field label="Verso (réponse)">
          <Textarea rows={2} value={back} onChange={(e) => setBack(e.target.value)} />
        </Field>
        {error && <p style={{ color: '#ff8d8d', fontSize: 'var(--text-sm)' }}>{error}</p>}
      </div>
    </Modal>
  );
}

function ReviewSession({ cards, onExit }: { cards: Flashcard[]; onExit: () => void }): React.ReactNode {
  const [queue, setQueue] = useState<Flashcard[]>(cards);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const card = queue[0];

  const grade = async (g: Grade): Promise<void> => {
    if (!card) return;
    const next = srsSchedule(
      { ease: card.ease, intervalDays: card.intervalDays, reps: card.reps, lapses: card.lapses, due: card.due },
      g
    );
    await db.flashcards.put({
      ...card,
      ease: next.ease,
      intervalDays: next.intervalDays,
      reps: next.reps,
      lapses: next.lapses,
      due: next.due,
      updatedAt: nowTs()
    });
    setReviewed((r) => r + 1);
    setRevealed(false);
    setQueue((q) => (g === 0 ? [...q.slice(1), { ...card, ...next }] : q.slice(1)));
  };

  if (!card) {
    return (
      <EmptyState icon={<Check size={30} />} title={`Révision terminée — ${reviewed} carte${reviewed > 1 ? 's' : ''} vue${reviewed > 1 ? 's' : ''}`}>
        <GlassButton variant="primary" onClick={onExit}>
          Retour aux flashcards
        </GlassButton>
      </EmptyState>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', padding: '10px 0' }}>
      <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
        {queue.length} carte{queue.length > 1 ? 's' : ''} restante{queue.length > 1 ? 's' : ''} · {reviewed} révisée
        {reviewed > 1 ? 's' : ''}
      </div>
      <button
        className="glass card selectable"
        style={{
          width: '100%',
          maxWidth: 480,
          minHeight: 170,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          cursor: 'pointer',
          textAlign: 'center'
        }}
        onClick={() => setRevealed(true)}
      >
        <span style={{ fontSize: 'var(--text-xl)', fontWeight: 650 }}>{card.front}</span>
        {revealed ? (
          <span className="text-secondary" style={{ fontSize: 'var(--text-lg)' }}>{card.back}</span>
        ) : (
          <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Cliquez pour révéler la réponse
          </span>
        )}
      </button>
      {revealed && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <GlassButton variant="danger" onClick={() => void grade(0)}>Encore</GlassButton>
          <GlassButton onClick={() => void grade(3)}>Difficile</GlassButton>
          <GlassButton variant="primary" onClick={() => void grade(4)}>Bien</GlassButton>
          <GlassButton onClick={() => void grade(5)}>Facile</GlassButton>
        </div>
      )}
      <GlassButton size="sm" variant="ghost" onClick={onExit}>
        Interrompre la révision
      </GlassButton>
    </div>
  );
}

/* ---------- Sessions d'étude ---------- */

function SessionsTab(): React.ReactNode {
  const subjects = useLiveQuery(() => db.subjects.toArray(), [], [] as Subject[]);
  const sessions = useLiveQuery(
    () => db.studySessions.orderBy('startedAt').reverse().limit(60).toArray(),
    [],
    []
  );
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [goalMin, setGoalMin] = useState(120);

  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const goalMeta = useLiveQuery(() => db.meta.get('studyGoal'), []);
  useEffect(() => {
    if (goalMeta?.value !== undefined && typeof goalMeta.value === 'number') {
      setGoalMin(goalMeta.value);
    }
  }, [goalMeta]);

  const weekStart = useMemo(() => {
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d.getTime();
  }, []);
  const weekMinutes = sessions
    .filter((s) => s.startedAt >= weekStart)
    .reduce((a, s) => a + s.minutes, 0);

  const stop = async (): Promise<void> => {
    if (startedAt === null || activeSubject === null) return;
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    const ts = nowTs();
    await db.studySessions.put({
      id: uid(),
      createdAt: ts,
      updatedAt: ts,
      subjectId: activeSubject,
      startedAt,
      endedAt: Date.now(),
      minutes
    });
    toast('success', 'Session enregistrée', `${minutes} min de révision`);
    setStartedAt(null);
    setActiveSubject(null);
  };

  return (
    <>
      <div className="stat-cards">
        <div className="stat-card glass-ultra">
          <div className="stat-label">Objectif hebdo</div>
          <div className="stat-value tabular">{minutesToHM(weekMinutes)}</div>
          <div className="stat-hint">sur {minutesToHM(goalMin)} visés</div>
          <div style={{ marginTop: 8 }}>
            <ProgressBar value={Math.min(1, weekMinutes / goalMin)} label="Progression hebdomadaire" />
          </div>
        </div>
        <div className="stat-card glass-ultra">
          <div className="stat-label">Objectif (minutes/semaine)</div>
          <div className="stat-value tabular">{goalMin}</div>
          <Slider
            value={goalMin}
            min={30}
            max={600}
            step={30}
            onChange={(v) => setGoalMin(v)}
            ariaLabel="Objectif hebdomadaire en minutes"
          />
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={() => void db.meta.put({ key: 'studyGoal', value: goalMin })}
          >
            Enregistrer l’objectif
          </GlassButton>
        </div>
      </div>

      <SectionTitle icon={<Timer size={15} />}>
        {startedAt !== null ? 'Session en cours' : 'Démarrer une session'}
      </SectionTitle>
      <div className="meta-row" style={{ marginBottom: 14 }}>
        {subjects.map((s) => (
          <button
            key={s.id}
            className={`btn btn-sm ${activeSubject === s.id ? 'btn-primary' : ''}`}
            onClick={() => {
              if (startedAt !== null) return;
              setActiveSubject(s.id);
              setStartedAt(Date.now());
              setNow(Date.now());
            }}
            disabled={startedAt !== null}
          >
            {s.name}
          </button>
        ))}
        {subjects.length === 0 && (
          <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Créez d’abord une matière dans l’onglet Matières.
          </span>
        )}
      </div>
      {startedAt !== null && activeSubject !== null && (
        <div className="glass-ultra card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <span className="tabular" style={{ fontSize: 'var(--text-2xl)', fontWeight: 600 }}>
            {new Date(now - startedAt).toLocaleTimeString('fr-FR', { minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-secondary">
            {subjects.find((s) => s.id === activeSubject)?.name}
          </span>
          <span style={{ flex: 1 }} />
          <GlassButton variant="danger" onClick={() => void stop()}>
            Terminer la session
          </GlassButton>
        </div>
      )}

      <SectionTitle>Historique</SectionTitle>
      {sessions.length === 0 && (
        <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
          Aucune session enregistrée.
        </p>
      )}
      {sessions
        .filter((s) => dateKey(new Date(s.startedAt)) >= addDaysKey(todayKey(), -30))
        .map((s) => (
          <div key={s.id} className="list-row" style={{ padding: '5px 6px' }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: subjects.find((x) => x.id === s.subjectId)?.color ?? '#888' }} />
            <span style={{ fontWeight: 550 }}>
              {subjects.find((x) => x.id === s.subjectId)?.name ?? 'Matière supprimée'}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              {new Date(s.startedAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="tabular" style={{ marginLeft: 'auto', fontWeight: 600 }}>
              {s.minutes} min
            </span>
          </div>
        ))}
    </>
  );
}
