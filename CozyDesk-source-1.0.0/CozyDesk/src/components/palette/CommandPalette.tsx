/** Palette de commandes — Ctrl+K : recherche floue, navigation clavier. */
import clsx from 'clsx';
import { useEffect, useMemo, useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CornerDownLeft,
  Download,
  FilePlus2,
  GraduationCap,
  LayoutGrid,
  Minimize2,
  Monitor,
  Moon,
  Music,
  Palette,
  RotateCcw,
  Search,
  Sun,
  Timer,
  Upload,
  X,
  type LucideIcon
} from 'lucide-react';
import { MODULES, MODULE_MAP } from '@/modules/registry';
import { usePaletteStore } from '@/stores/palette';
import { useWindowStore } from '@/stores/windows';
import { useSettingsStore, THEMES, type GraphicsProfile } from '@/stores/settings';
import { useDashboardStore } from '@/stores/dashboard';
import { usePomodoroStore } from '@/stores/pomodoro';
import { exportToFile, importFromFile } from '@/services/storage/exportImport';
import { emitBus } from '@/services/bus';
import { fuzzyScore } from '@/services/fuzzy';
import { toast } from '@/stores/toast';

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  keywords: string;
  run: () => void;
}

export function CommandPalette(): React.ReactNode {
  const open = usePaletteStore((s) => s.open);
  const query = usePaletteStore((s) => s.query);
  const selected = usePaletteStore((s) => s.selected);
  const recents = usePaletteStore((s) => s.recents);
  const openPalette = usePaletteStore((s) => s.openPalette);
  const setQuery = usePaletteStore((s) => s.setQuery);
  const setSelected = usePaletteStore((s) => s.setSelected);
  const remember = usePaletteStore((s) => s.remember);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const commands = useMemo<Command[]>(() => buildCommands(), []);

  const results = useMemo(() => {
    if (query.trim().length === 0) {
      const recentCmds = recents
        .map((id) => commands.find((c) => c.id === id))
        .filter((c): c is Command => c !== undefined);
      const recentSet = new Set(recentCmds.map((c) => c.id));
      const modules = commands.filter((c) => c.id.startsWith('open:') && !recentSet.has(c.id));
      const others = commands.filter((c) => !c.id.startsWith('open:') && !recentSet.has(c.id));
      return [
        ...recentCmds.map((c) => ({ cmd: c, score: 1000, recent: true })),
        ...modules.map((c) => ({ cmd: c, score: 1, recent: false })),
        ...others.slice(0, 8).map((c) => ({ cmd: c, score: 1, recent: false }))
      ];
    }
    return commands
      .map((c) => ({
        cmd: c,
        score: Math.max(fuzzyScore(query, c.title), fuzzyScore(query, c.keywords) * 0.85),
        recent: false
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 14);
  }, [commands, query, recents]);

  useEffect(() => {
    if (open) {
      setQuery('');
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, setQuery]);

  useEffect(() => {
    if (selected >= results.length) setSelected(0);
  }, [results.length, selected, setSelected]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        openPalette(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((selected + 1) % Math.max(1, results.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((selected - 1 + results.length) % Math.max(1, results.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = results[selected];
        if (r) {
          r.cmd.run();
          remember(r.cmd.id);
          openPalette(false);
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, results, selected, setSelected, remember, openPalette]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected, results]);

  if (!open) return null;

  return (
    <div className="palette-backdrop" onMouseDown={() => openPalette(false)}>
      <div
        className="palette-panel glass-float anim-pop"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Palette de commandes"
      >
        <div className="palette-input-row">
          <Search size={17} className="text-muted" />
          <input
            ref={inputRef}
            value={query}
            placeholder="Rechercher une commande, un module, une action…"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Recherche de commandes"
          />
          {query.length > 0 && (
            <button className="palette-clear" aria-label="Effacer" onClick={() => setQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <div className="palette-results" ref={listRef} role="listbox">
          {results.length === 0 && (
            <div className="palette-empty">Aucune commande ne correspond à « {query} ».</div>
          )}
          {results.map((r, i) => {
            const Icon = r.cmd.icon;
            return (
              <button
                key={r.cmd.id}
                role="option"
                aria-selected={i === selected}
                data-selected={i === selected}
                className={clsx('palette-item', i === selected && 'selected')}
                onMouseEnter={() => setSelected(i)}
                onClick={() => {
                  r.cmd.run();
                  remember(r.cmd.id);
                  openPalette(false);
                }}
              >
                <span className="palette-item-icon">
                  <Icon size={16} />
                </span>
                <span className="palette-item-text">
                  <span>{r.cmd.title}</span>
                  {r.cmd.subtitle && <span className="palette-subtitle">{r.cmd.subtitle}</span>}
                </span>
                {r.recent && <span className="chip">récent</span>}
              </button>
            );
          })}
        </div>
        <div className="palette-footer">
          <span>
            <ArrowUp size={11} /> <ArrowDown size={11} /> naviguer
          </span>
          <span>
            <CornerDownLeft size={11} /> lancer
          </span>
          <span>Échap fermer</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Construction des commandes ---------- */

function buildCommands(): Command[] {
  const winStore = useWindowStore.getState();

  const openModule = (id: string): void => {
    const m = MODULE_MAP[id];
    if (m) useWindowStore.getState().open(id, m.defaultSize);
  };

  const openAndEmit = (id: string, event: Parameters<typeof emitBus>[0]): void => {
    openModule(id);
    window.setTimeout(() => emitBus(event), 260);
  };

  const cmds: Command[] = [];

  for (const m of MODULES) {
    cmds.push({
      id: `open:${m.id}`,
      title: `Ouvrir — ${m.title}`,
      subtitle: 'Module',
      icon: m.icon,
      keywords: `ouvrir module ${m.title} ${m.id}`,
      run: () => openModule(m.id)
    });
  }

  cmds.push(
    {
      id: 'action:new-task',
      title: 'Créer une tâche',
      subtitle: 'Tâches',
      icon: FilePlus2,
      keywords: 'nouvelle tâche creer todo ajouter',
      run: () => openAndEmit('tasks', 'tasks:create')
    },
    {
      id: 'action:new-note',
      title: 'Créer une note',
      subtitle: 'Notes',
      icon: FilePlus2,
      keywords: 'nouvelle note creer ecrire',
      run: () => openAndEmit('notes', 'notes:create')
    },
    {
      id: 'action:journal-today',
      title: 'Écrire dans le journal',
      subtitle: 'Journal',
      icon: BookOpen,
      keywords: 'journal aujourd hui ecrire daily',
      run: () => openAndEmit('journal', 'journal:open-today')
    },
    {
      id: 'action:pomodoro-toggle',
      title: 'Démarrer / mettre en pause le Pomodoro',
      subtitle: 'Pomodoro',
      icon: Timer,
      keywords: 'pomodoro demarrer pause focus timer',
      run: () => {
        usePomodoroStore.getState().startPause();
        openModule('pomodoro');
      }
    },
    {
      id: 'action:study-review',
      title: 'Réviser les cartes dues',
      subtitle: 'Étude',
      icon: GraduationCap,
      keywords: 'etude revision flashcards cartes sm2',
      run: () => openAndEmit('study', 'study:review-due')
    },
    {
      id: 'action:play-music',
      title: 'Lecture / pause de la musique',
      subtitle: 'Musique',
      icon: Music,
      keywords: 'musique lecture pause lecteur play',
      run: () => {
        openModule('music');
        void import('@/stores/music').then((m) => {
          m.useMusicStore.getState().init();
          void m.useMusicStore.getState().togglePlay();
        });
      }
    },
    {
      id: 'action:export',
      title: 'Exporter toutes les données',
      subtitle: 'Données',
      icon: Download,
      keywords: 'export sauvegarde backup donnees json',
      run: () => {
        void exportToFile().then((path) => {
          if (path) toast('success', 'Export réussi', path);
        });
      }
    },
    {
      id: 'action:import',
      title: 'Importer des données',
      subtitle: 'Données',
      icon: Upload,
      keywords: 'import restaurer donnees json',
      run: () => {
        void importFromFile()
          .then((r) =>
            toast(
              'success',
              'Import terminé',
              `${Object.values(r.inserted).reduce((a, b) => a + b, 0)} éléments fusionnés.`
            )
          )
          .catch((err) => toast('error', 'Import impossible', String(err.message ?? err)));
      }
    },
    {
      id: 'action:minimize-all',
      title: 'Réduire toutes les fenêtres',
      icon: Minimize2,
      keywords: 'reduire minimiser fenetres tout',
      run: () => winStore.minimizeAll()
    },
    {
      id: 'action:close-all',
      title: 'Fermer toutes les fenêtres',
      icon: X,
      keywords: 'fermer fenetres tout',
      run: () => winStore.closeAll()
    },
    {
      id: 'action:dashboard-edit',
      title: 'Personnaliser le tableau de bord',
      subtitle: 'Dashboard',
      icon: LayoutGrid,
      keywords: 'dashboard widgets personnaliser disposition editer',
      run: () => useDashboardStore.getState().setEditMode(true)
    },
    {
      id: 'action:dashboard-reset',
      title: 'Réinitialiser le tableau de bord',
      subtitle: 'Dashboard',
      icon: RotateCcw,
      keywords: 'dashboard reinitialiser defaut disposition widgets',
      run: () => {
        useDashboardStore.getState().resetDefault();
        toast('success', 'Tableau de bord réinitialisé');
      }
    },
    {
      id: 'action:mode-light',
      title: 'Passer en mode clair',
      icon: Sun,
      keywords: 'clair light theme mode',
      run: () => useSettingsStore.getState().setSettings({ mode: 'light' })
    },
    {
      id: 'action:mode-dark',
      title: 'Passer en mode sombre',
      icon: Moon,
      keywords: 'sombre dark theme mode nuit',
      run: () => useSettingsStore.getState().setSettings({ mode: 'dark' })
    }
  );

  for (const theme of THEMES) {
    cmds.push({
      id: `theme:${theme.id}`,
      title: `Thème — ${theme.label}`,
      subtitle: 'Apparence',
      icon: Palette,
      keywords: `theme ${theme.label} apparence couleur`,
      run: () => useSettingsStore.getState().setSettings({ theme: theme.id })
    });
  }

  const profiles: { id: GraphicsProfile; label: string }[] = [
    { id: 'high', label: 'Haute qualité' },
    { id: 'balanced', label: 'Basculée' },
    { id: 'performance', label: 'Performance' }
  ];
  for (const p of profiles) {
    cmds.push({
      id: `profile:${p.id}`,
      title: `Profil graphique — ${p.label}`,
      subtitle: 'Performances',
      icon: Monitor,
      keywords: `profil performances qualite ${p.label}`,
      run: () => useSettingsStore.getState().setSettings({ graphicsProfile: p.id })
    });
  }

  return cmds;
}
