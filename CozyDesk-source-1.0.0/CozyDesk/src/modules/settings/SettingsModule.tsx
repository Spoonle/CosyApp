/** Module Paramètres — chaque contrôle agit réellement sur l'application. */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BellRing,
  CloudSun,
  Cpu,
  Database,
  Download,
  HardDriveDownload,
  Info,
  Languages,
  Monitor,
  Palette as PaletteIcon,
  RotateCcw,
  Search,
  Upload
} from 'lucide-react';
import {
  Field,
  GlassButton,
  Input,
  SectionTitle,
  Segmented,
  Slider,
  Toggle
} from '@/components/glass';
import {
  THEMES,
  resolvedMode,
  useSettingsStore,
  type ColorMode,
  type GraphicsProfile
} from '@/stores/settings';
import { buildExportBundle, exportToFile, importFromFile } from '@/services/storage/exportImport';
import { writeBackup, listBackups } from '@/services/storage/backup';
import { importLegacyData, scanLegacyData, type LegacyScanReport } from '@/services/storage/legacy';
import { ensureNotificationPermission } from '@/services/notifications/notify';
import { toast } from '@/stores/toast';
import { db } from '@/services/storage/db';
import type { AppInfoDto } from '@/types/ipc';
import { chime } from '@/services/notifications/notify';
import { WorkspaceSection } from './WorkspaceSection';

type Section = 'espace' | 'apparence' | 'performances' | 'general' | 'donnees' | 'apropos';

export default function SettingsModule(): React.ReactNode {
  const [section, setSection] = useState<Section>('espace');

  return (
    <div className="module-root">
      <div className="module-header">
        <h2>Paramètres</h2>
      </div>
      <div className="module-body">
        <div className="segmented settings-tabs" style={{ marginBottom: 16 }}>
          <button data-active={section === 'espace'} onClick={() => setSection('espace')}>
            Bureau
          </button>
          <button data-active={section === 'apparence'} onClick={() => setSection('apparence')}>
            Apparence
          </button>
          <button data-active={section === 'performances'} onClick={() => setSection('performances')}>
            Performances
          </button>
          <button data-active={section === 'general'} onClick={() => setSection('general')}>
            Général
          </button>
          <button data-active={section === 'donnees'} onClick={() => setSection('donnees')}>
            Données
          </button>
          <button data-active={section === 'apropos'} onClick={() => setSection('apropos')}>
            À propos
          </button>
        </div>

        {section === 'espace' && <WorkspaceSection />}
        {section === 'apparence' && <AppearanceSection />}
        {section === 'performances' && <PerformanceSection />}
        {section === 'general' && <GeneralSection />}
        {section === 'donnees' && <DataSection />}
        {section === 'apropos' && <AboutSection />}
      </div>
    </div>
  );
}

/* ---------- Apparence ---------- */

function AppearanceSection(): React.ReactNode {
  const theme = useSettingsStore((s) => s.theme);
  const mode = useSettingsStore((s) => s.mode);
  const accent = useSettingsStore((s) => s.accent);
  const blur = useSettingsStore((s) => s.blurIntensity);
  const transparency = useSettingsStore((s) => s.transparency);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const resetAppearance = useSettingsStore((s) => s.resetAppearance);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <SectionTitle icon={<PaletteIcon size={15} />}>Thème</SectionTitle>
        <div className="card-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSettings({ theme: t.id })}
              style={{
                padding: 10,
                borderRadius: 'var(--radius-md)',
                border:
                  theme === t.id
                    ? '2px solid hsl(var(--accent-h) var(--accent-s) var(--accent-l))'
                    : '1px solid rgb(var(--stroke-rgb) / 0.15)',
                background: 'rgb(var(--glass-deep-rgb) / 0.4)',
                textAlign: 'left'
              }}
            >
              <span style={{ display: 'flex', gap: 4, marginBottom: 7 }}>
                {t.swatch.map((c, i) => (
                  <span key={i} style={{ width: 18, height: 18, borderRadius: 6, background: c, border: '1px solid rgb(255 255 255 / 0.15)' }} />
                ))}
              </span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-ultra card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Mode">
          <Segmented
            value={mode}
            onChange={(v) => setSettings({ mode: v as ColorMode })}
            options={[
              { value: 'auto', label: 'Automatique' },
              { value: 'light', label: 'Clair' },
              { value: 'dark', label: 'Sombre' }
            ]}
          />
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Mode actuel résolu : {resolvedMode(mode) === 'dark' ? 'sombre' : 'clair'}.
          </div>
        </Field>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>Couleur d’accent</span>
            {accent !== null && (
              <GlassButton size="sm" variant="ghost" onClick={() => setSettings({ accent: null })}>
                <RotateCcw size={12} /> Thème par défaut
              </GlassButton>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="color"
              value={accent ? hslToHex(accent.h, accent.s, accent.l) : hslToHex(248, 84, 70)}
              onChange={(e) => {
                const { h, s, l } = hexToHsl(e.target.value);
                setSettings({ accent: { h, s, l } });
              }}
              aria-label="Couleur d’accent personnalisée"
              style={{ width: 44, height: 34, border: 'none', background: 'none', cursor: 'pointer' }}
            />
            <Slider
              value={accent ? accent.h : 248}
              min={0}
              max={360}
              step={1}
              onChange={(h) =>
                setSettings({ accent: { h, s: accent?.s ?? 82, l: accent?.l ?? 68 } })
              }
              ariaLabel="Teinte de l’accent"
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Intensité du flou</span>
            <span className="tabular text-muted">{Math.round(blur * 100)}%</span>
          </div>
          <Slider value={blur} min={0.2} max={1.6} step={0.05} onChange={(v) => setSettings({ blurIntensity: v })} ariaLabel="Intensité du flou" />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Transparence du verre</span>
            <span className="tabular text-muted">{Math.round(transparency * 100)}%</span>
          </div>
          <Slider value={transparency} min={0.6} max={1.4} step={0.05} onChange={(v) => setSettings({ transparency: v })} ariaLabel="Transparence" />
        </div>

        <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
          L’intensité des animations se règle dans <strong>Bureau → Ambiance</strong>
          (un seul réglage pour toute l’application).
        </div>

        <div>
          <GlassButton size="sm" variant="ghost" onClick={() => resetAppearance()}>
            <RotateCcw size={13} /> Réinitialiser l’apparence
          </GlassButton>
        </div>
      </div>
    </div>
  );
}

/* ---------- Performances ---------- */

function PerformanceSection(): React.ReactNode {
  const profile = useSettingsStore((s) => s.graphicsProfile);
  const videoEnabled = useSettingsStore((s) => s.wallpaper.videoEnabled);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const setWallpaper = useSettingsStore((s) => s.setWallpaper);

  const profiles: { id: GraphicsProfile; label: string; desc: string }[] = [
    {
      id: 'high',
      label: 'Haute qualité',
      desc: 'Liquid Glass complet, animations avancées, fonds vidéo, blobs d’ambiance animés.'
    },
    {
      id: 'balanced',
      label: 'Basculée',
      desc: 'Flou réduit d’un tiers, opacité accrue : le compromis confort / fluidité.'
    },
    {
      id: 'performance',
      label: 'Performance',
      desc: 'Flou quasi retiré sur les surfaces, vidéos figées, ambiances statiques : pour les machines modestes.'
    }
  ];

  return (
    <div className="card-grid">
      {profiles.map((p) => (
        <button
          key={p.id}
          onClick={() => setSettings({ graphicsProfile: p.id })}
          className="glass"
          style={{
            padding: 16,
            textAlign: 'left',
            borderColor:
              profile === p.id
                ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))'
                : undefined
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Cpu size={16} className="text-accent" />
            <span style={{ fontWeight: 650 }}>{p.label}</span>
            {profile === p.id && <span className="chip chip-accent">actif</span>}
          </span>
          <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{p.desc}</span>
        </button>
      ))}
      <div className="glass-ultra card" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Toggle checked={videoEnabled} onChange={(v) => setWallpaper({ videoEnabled: v })} label="Fonds vidéo" />
        <div>
          <div style={{ fontWeight: 600 }}>Fonds vidéo animés</div>
          <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Les vidéos se mettent aussi en pause automatiquement quand la fenêtre est masquée.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Général ---------- */

function GeneralSection(): React.ReactNode {
  const ambientResume = useSettingsStore((s) => s.ambientResume);
  const weather = useSettingsStore((s) => s.weather);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const [city, setCity] = useState(weather?.city ?? '');
  const [searching, setSearching] = useState(false);

  const searchCity = async (): Promise<void> => {
    if (!city.trim()) return;
    setSearching(true);
    try {
      const resp = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1&language=fr&format=json`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as {
        results?: { name: string; latitude: number; longitude: number; country?: string }[];
      };
      const hit = data.results?.[0];
      if (!hit) {
        toast('warning', 'Ville introuvable', 'Essayez une orthographe différente.');
        return;
      }
      setSettings({
        weather: {
          city: hit.country ? `${hit.name}, ${hit.country}` : hit.name,
          lat: hit.latitude,
          lon: hit.longitude
        }
      });
      toast('success', 'Météo configurée', `${hit.name} — données réelles Open-Meteo.`);
    } catch (err) {
      toast('error', 'Recherche impossible', err instanceof Error ? err.message : undefined);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="glass-ultra card">
        <SectionTitle icon={<Languages size={15} />}>Langue</SectionTitle>
        <Segmented
          value="fr"
          onChange={() => toast('info', 'Bientôt disponible', 'L’anglais arrivera dans une prochaine mise à jour.')}
          options={[
            { value: 'fr', label: 'Français' },
            { value: 'en', label: 'English (à venir)' }
          ]}
        />
        <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 6 }}>
          L’architecture d’internationalisation est en place ; le français est la locale de référence.
        </div>
      </div>

      <div className="glass-ultra card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BellRing size={17} className="text-accent" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>Notifications système</div>
          <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Utilisées par le Pomodoro et les rappels du calendrier.
          </div>
        </div>
        <GlassButton
          size="sm"
          variant="ghost"
          onClick={async () => {
            const ok = await ensureNotificationPermission();
            toast(ok ? 'success' : 'warning', ok ? 'Notifications activées' : 'Autorisation refusée');
          }}
        >
          Activer
        </GlassButton>
        <GlassButton size="sm" variant="ghost" data-tooltip="Jouer un carillon de test" onClick={() => chime('work-end')}>
          Tester le son
        </GlassButton>
      </div>

      <div className="glass-ultra card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Volume2Icon />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>Ambiances au démarrage</div>
          <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Relancer les sons d’ambiance actifs à l’ouverture de CozyDesk.
          </div>
        </div>
        <Toggle checked={ambientResume} onChange={(v) => setSettings({ ambientResume: v })} label="Ambiances au démarrage" />
      </div>

      <div className="glass-ultra card">
        <SectionTitle icon={<CloudSun size={15} />}>Météo (optionnelle)</SectionTitle>
        <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginBottom: 10 }}>
          Source réelle : Open-Meteo (gratuit, sans clé). Aucune donnée n’est envoyée — seul le nom
          de la ville est recherché. Laissez vide pour désactiver le widget météo.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="Ex. Paris"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void searchCity();
            }}
          />
          <GlassButton size="sm" variant="primary" onClick={() => void searchCity()} disabled={searching}>
            <Search size={13} /> Rechercher
          </GlassButton>
          {weather && (
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => {
                setSettings({ weather: null });
                setCity('');
                toast('info', 'Météo désactivée');
              }}
            >
              Désactiver
            </GlassButton>
          )}
        </div>
        {weather && (
          <div className="chip chip-accent" style={{ marginTop: 8 }}>
            Configurée : {weather.city} ({weather.lat.toFixed(2)}, {weather.lon.toFixed(2)})
          </div>
        )}
      </div>
    </div>
  );
}

function Volume2Icon(): React.ReactNode {
  return <Monitor size={17} className="text-accent" />;
}

/* ---------- Données ---------- */

function DataSection(): React.ReactNode {
  const [legacy, setLegacy] = useState<LegacyScanReport | null>(null);
  const [busy, setBusy] = useState(false);
  const backups = useLiveQuery(() => listBackups(), [], []);

  const counts = useLiveQuery(
    async () => ({
      tasks: await db.tasks.count(),
      notes: await db.notes.count(),
      journal: await db.journal.count(),
      sessions: await db.pomodoroSessions.count(),
      habits: await db.habits.count(),
      events: await db.events.count(),
      flashcards: await db.flashcards.count(),
      tracks: await db.tracks.count()
    }),
    []
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="glass-ultra card">
        <SectionTitle icon={<Database size={15} />}>Vos données locales</SectionTitle>
        <div className="meta-row" style={{ marginBottom: 12 }}>
          {counts &&
            Object.entries(counts)
              .filter(([, n]) => n > 0)
              .map(([key, n]) => (
                <span key={key} className="chip">
                  {n} {labelOf(key)}
                </span>
              ))}
          {counts && Object.values(counts).every((n) => n === 0) && (
            <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              Base encore vide.
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <GlassButton
            size="sm"
            onClick={() =>
              void exportToFile().then((path) => {
                if (path) toast('success', 'Export réussi', path);
              })
            }
          >
            <Download size={13} /> Exporter (JSON)
          </GlassButton>
          <GlassButton
            size="sm"
            onClick={() =>
              void importFromFile()
                .then((r) =>
                  toast(
                    'success',
                    'Import terminé',
                    `${Object.values(r.inserted).reduce((a, b) => a + b, 0)} éléments fusionnés — sauvegarde préalable créée.`
                  )
                )
                .catch((err) => toast('error', 'Import impossible', String(err.message ?? err)))
            }
          >
            <Upload size={13} /> Importer
          </GlassButton>
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={() =>
              void writeBackup('manuel').then((b) => {
                toast('success', 'Sauvegarde créée', b.key);
                void buildExportBundle(); // valider que tout est lisible
              })
            }
          >
            <HardDriveDownload size={13} /> Sauvegarder maintenant
          </GlassButton>
        </div>
      </div>

      <div className="glass-ultra card">
        <SectionTitle>Données d’une installation antérieure</SectionTitle>
        <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginBottom: 10 }}>
          CozyDesk scanne localStorage et IndexedDB à la recherche de données d’une version
          précédente. L’import crée une sauvegarde préalable et n’efface JAMAIS les originaux.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <GlassButton size="sm" onClick={() => void scanLegacyData().then(setLegacy)}>
            Lancer un scan
          </GlassButton>
          {legacy && legacy.potential.tasks + legacy.potential.notes + legacy.potential.habits + legacy.potential.pomodoro > 0 && (
            <GlassButton
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void importLegacyData()
                  .then((r) =>
                    toast(
                      'success',
                      'Import best-effort terminé',
                      `${r.tasks} tâches, ${r.notes} notes, ${r.habits} habitudes, ${r.pomodoro} sessions. Originaux intacts.`
                    )
                  )
                  .catch((err) => toast('error', 'Import impossible', String(err)))
                  .finally(() => setBusy(false));
              }}
            >
              Importer les données détectées
            </GlassButton>
          )}
        </div>
        {legacy && (
          <div style={{ fontSize: 'var(--text-sm)' }}>
            {legacy.localStorageKeys.length === 0 && legacy.indexedDBs.length === 0 && (
              <p className="text-muted">Aucune donnée legacy détectée.</p>
            )}
            {legacy.localStorageKeys.map((k) => (
              <div key={k.key} className="list-row" style={{ padding: '4px 4px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{k.key}</div>
                  <div className="text-muted" style={{ fontSize: 'var(--text-2xs)', wordBreak: 'break-all' }}>
                    {k.bytes} octets {k.detected.length > 0 ? `· ${k.detected.join(', ')}` : ''}
                  </div>
                </div>
              </div>
            ))}
            {legacy.indexedDBs.length > 0 && (
              <p className="text-secondary">
                Bases IndexedDB détectées : {legacy.indexedDBs.join(', ')} (non lues automatiquement —
                la fusion ciblée se fera à la demande).
              </p>
            )}
          </div>
        )}
      </div>

      <div className="glass-ultra card">
        <SectionTitle>Sauvegardes automatiques ({backups.length}/30)</SectionTitle>
        <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginBottom: 8 }}>
          Un instantané quotidien est créé au démarrage, plus une sauvegarde avant chaque import ou
          migration. Une copie JSON est aussi écrite dans le dossier « backups » de l’application.
        </p>
        <div style={{ maxHeight: 180, overflowY: 'auto' }}>
          {backups.slice(0, 10).map((b) => (
            <div key={b.key} className="list-row" style={{ padding: '4px 4px' }}>
              <span style={{ flex: 1, fontSize: 'var(--text-sm)' }}>
                {new Date(b.createdAt).toLocaleString('fr-FR')} — {b.label}
              </span>
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  try {
                    const bundle = JSON.parse(b.data);
                    void import('@/services/storage/exportImport').then(async (m) => {
                      await m.importBundle(m.validateBundle(bundle));
                      toast('success', 'Sauvegarde restaurée', b.key);
                    });
                  } catch {
                    toast('error', 'Sauvegarde illisible');
                  }
                }}
              >
                Restaurer
              </GlassButton>
            </div>
          ))}
          {backups.length === 0 && (
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              Aucune sauvegarde encore — la première sera créée au prochain démarrage.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function labelOf(key: string): string {
  const map: Record<string, string> = {
    tasks: 'tâches',
    notes: 'notes',
    journal: 'entrées de journal',
    sessions: 'sessions Pomodoro',
    habits: 'habitudes',
    events: 'événements',
    flashcards: 'flashcards',
    tracks: 'pistes'
  };
  return map[key] ?? key;
}

/* ---------- À propos ---------- */

function AboutSection(): React.ReactNode {
  const [info, setInfo] = useState<AppInfoDto | null>(null);

  useEffect(() => {
    void window.cozydesk?.app.getInfo().then(setInfo);
  }, []);

  return (
    <div className="glass-ultra card">
      <SectionTitle icon={<Info size={15} />}>CozyDesk</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--text-sm)' }}>
        {info ? (
          <>
            <Row label="Version" value={info.version} />
            <Row label="Plateforme" value={info.platform} />
            <Row label="Electron" value={info.electron} />
            <Row label="Chromium" value={info.chrome} />
            <Row label="Node.js" value={info.node} />
            <Row label="Dossier de données" value={info.userData} />
            <Row label="Sauvegardes" value={info.backups} />
          </>
        ) : (
          <span className="text-muted">Informations disponibles dans l’application.</span>
        )}
      </div>
      <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 12 }}>
        Application 100% locale : aucune donnée ne quitte votre machine (hormis la météo
        optionnelle Open-Meteo). Icônes : Lucide (ISC). Packaging : electron-builder.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): React.ReactNode {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <span className="text-muted" style={{ width: 150 }}>{label}</span>
      <span style={{ fontWeight: 550, wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

/* ---------- Conversion couleurs ---------- */

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number): number => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number): string => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
