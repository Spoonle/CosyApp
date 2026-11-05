/**
 * Réglages de l'espace de travail (2.0) : horloge, widgets, dock, ambiance,
 * dispositions. Tout agit immédiatement et reste persisté localement.
 */
import { useState } from 'react';
import { Bookmark, Clock, LayoutGrid, PanelBottom, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
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
  DENSITY_MARGIN,
  useSettingsStore,
  type ClockSize,
  type ClockStyle,
  type DashboardDensity,
  type DockPosition,
  type MotionIntensity,
  type WidgetAppearance
} from '@/stores/settings';
import { PRESET_META, useDashboardStore } from '@/stores/dashboard';
import { MODULES } from '@/modules/registry';

export function WorkspaceSection(): React.ReactNode {
  const ws = useSettingsStore((s) => s.workspace);
  const setWorkspace = useSettingsStore((s) => s.setWorkspace);
  const resetWorkspace = useSettingsStore((s) => s.resetWorkspace);
  const dim = useSettingsStore((s) => s.wallpaper.dim);
  const setWallpaper = useSettingsStore((s) => s.setWallpaper);
  const setAppearanceAll = useDashboardStore((s) => s.setAppearanceAll);
  const applyPreset = useDashboardStore((s) => s.applyPreset);
  const saveLayout = useDashboardStore((s) => s.saveLayout);
  const savedLayouts = useDashboardStore((s) => s.savedLayouts);
  const applySavedLayout = useDashboardStore((s) => s.applySavedLayout);
  const deleteSavedLayout = useDashboardStore((s) => s.deleteSavedLayout);
  const [layoutName, setLayoutName] = useState('');

  const toggleShortcut = (id: string): void => {
    const has = ws.dock.shortcuts.includes(id);
    const next = has
      ? ws.dock.shortcuts.filter((x) => x !== id)
      : [...ws.dock.shortcuts, id];
    setWorkspace({ dock: { ...ws.dock, shortcuts: next } });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* ---------- Horloge ---------- */}
      <div className="glass-ultra card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionTitle icon={<Clock size={15} />}>Horloge</SectionTitle>

        <Field label="Taille">
          <Segmented<ClockSize>
            value={ws.clock.size}
            onChange={(size) => setWorkspace({ clock: { ...ws.clock, size } })}
            options={[
              { value: 'md', label: 'Moyenne' },
              { value: 'lg', label: 'Grande' },
              { value: 'xl', label: 'Très grande' }
            ]}
          />
        </Field>

        <Field label="Style d’affichage">
          <Segmented<ClockStyle>
            value={ws.clock.style}
            onChange={(style) => setWorkspace({ clock: { ...ws.clock, style } })}
            options={[
              { value: 'stacked', label: 'Empilé' },
              { value: 'inline', label: 'En ligne' },
              { value: 'minimal', label: 'Épuré' }
            ]}
          />
        </Field>

        <ToggleRow
          label="Secondes"
          hint="Affiche les secondes après les minutes."
          checked={ws.clock.seconds}
          onChange={(seconds) => setWorkspace({ clock: { ...ws.clock, seconds } })}
        />
        <ToggleRow
          label="Date complète"
          hint="Le jour et le mois sous l’heure."
          checked={ws.clock.date}
          onChange={(date) => setWorkspace({ clock: { ...ws.clock, date } })}
        />
        <ToggleRow
          label="Salut discret"
          hint="Bonjour, bonsoir… selon l’heure."
          checked={ws.clock.greeting}
          onChange={(greeting) => setWorkspace({ clock: { ...ws.clock, greeting } })}
        />
        <Field label="Prénom du salut (facultatif)">
          <Input
            value={ws.clock.name}
            placeholder="Votre prénom"
            maxLength={24}
            onChange={(e) => setWorkspace({ clock: { ...ws.clock, name: e.target.value } })}
          />
        </Field>
      </div>

      {/* ---------- Widgets ---------- */}
      <div className="glass-ultra card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionTitle icon={<LayoutGrid size={15} />}>Widgets</SectionTitle>

        <Field label="Apparence par défaut">
          <Segmented<WidgetAppearance>
            value={ws.widgets.appearance}
            onChange={(appearance) => setWorkspace({ widgets: { ...ws.widgets, appearance } })}
            options={[
              { value: 'transparent', label: 'Transparent' },
              { value: 'subtle', label: 'Subtil' },
              { value: 'glass', label: 'Verre' }
            ]}
          />
          <div style={{ marginTop: 8 }}>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => setAppearanceAll(ws.widgets.appearance)}
            >
              <Sparkles size={12} /> Appliquer à tous les widgets
            </GlassButton>
          </div>
        </Field>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Espacement des widgets</span>
            <span className="tabular text-muted">{Math.round(ws.widgets.spacing * 100)}%</span>
          </div>
          <Slider
            value={ws.widgets.spacing}
            min={0.4}
            max={2}
            step={0.05}
            onChange={(spacing) => setWorkspace({ widgets: { ...ws.widgets, spacing } })}
            ariaLabel="Espacement des widgets"
          />
        </div>

        <Field label="Marges du bureau">
          <Segmented<DashboardDensity>
            value={ws.dashboard.density}
            onChange={(density) => setWorkspace({ dashboard: { ...ws.dashboard, density } })}
            options={[
              { value: 'tight', label: 'Compactes' },
              { value: 'comfortable', label: 'Confortables' },
              { value: 'airy', label: 'Aérées' }
            ]}
          />
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Marge latérale appliquée : {DENSITY_MARGIN[ws.dashboard.density]} px.
          </div>
        </Field>
      </div>

      {/* ---------- Dock ---------- */}
      <div className="glass-ultra card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionTitle icon={<PanelBottom size={15} />}>Dock</SectionTitle>

        <ToggleRow
          label="Afficher le dock"
          hint="Les modules restent accessibles par Ctrl+K."
          checked={ws.dock.visible}
          onChange={(visible) => setWorkspace({ dock: { ...ws.dock, visible } })}
        />
        <ToggleRow
          label="Masquer automatiquement"
          hint="Le dock réapparaît au survol du bord de l’écran."
          checked={ws.dock.autoHide}
          onChange={(autoHide) => setWorkspace({ dock: { ...ws.dock, autoHide } })}
        />

        <Field label="Position">
          <Segmented<DockPosition>
            value={ws.dock.position}
            onChange={(position) => setWorkspace({ dock: { ...ws.dock, position } })}
            options={[
              { value: 'bottom', label: 'Bas' },
              { value: 'left', label: 'Gauche' },
              { value: 'right', label: 'Droite' }
            ]}
          />
        </Field>

        <Field label="Raccourcis visibles">
          <div className="shortcut-grid">
            {MODULES.map((m) => {
              const on = ws.dock.shortcuts.includes(m.id);
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  className="shortcut-toggle"
                  data-on={on}
                  aria-pressed={on}
                  onClick={() => toggleShortcut(m.id)}
                >
                  <Icon size={13} />
                  <span>{m.title}</span>
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      {/* ---------- Ambiance ---------- */}
      <div className="glass-ultra card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionTitle icon={<Sparkles size={15} />}>Ambiance</SectionTitle>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Voile sur le fond d’écran</span>
            <span className="tabular text-muted">{Math.round(dim * 100)}%</span>
          </div>
          <Slider
            value={dim}
            min={0}
            max={0.6}
            step={0.02}
            onChange={(v) => setWallpaper({ dim: v })}
            ariaLabel="Assombrissement du fond d’écran"
          />
        </div>

        <Field label="Intensité des animations">
          <Segmented<MotionIntensity>
            value={ws.motion}
            onChange={(motion) => setWorkspace({ motion })}
            options={[
              { value: 'full', label: 'Complète' },
              { value: 'reduced', label: 'Réduite' },
              { value: 'none', label: 'Aucune' }
            ]}
          />
        </Field>
      </div>

      {/* ---------- Dispositions ---------- */}
      <div className="glass-ultra card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionTitle icon={<LayoutGrid size={15} />}>Disposition par défaut</SectionTitle>

        <div className="preset-row">
          {PRESET_META.map((p) => (
            <button key={p.id} className="preset-card" onClick={() => applyPreset(p.id)}>
              <span>{p.label}</span>
              <small>{p.hint}</small>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input
            value={layoutName}
            placeholder="Nom de la disposition actuelle…"
            aria-label="Nom de la disposition"
            onChange={(e) => setLayoutName(e.target.value)}
          />
          <GlassButton
            size="sm"
            variant="ghost"
            disabled={layoutName.trim().length === 0}
            onClick={() => {
              saveLayout(layoutName);
              setLayoutName('');
            }}
          >
            <Bookmark size={13} /> Sauvegarder
          </GlassButton>
        </div>

        {savedLayouts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {savedLayouts.map((l) => (
              <div key={l.id} className="saved-layout-row">
                <button className="saved-layout-apply" onClick={() => applySavedLayout(l.id)}>
                  {l.name}
                  <small className="text-muted">
                    {new Date(l.savedAt).toLocaleDateString('fr-FR')}
                  </small>
                </button>
                <button
                  className="saved-layout-delete"
                  aria-label={`Supprimer ${l.name}`}
                  onClick={() => deleteSavedLayout(l.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <GlassButton size="sm" variant="ghost" onClick={() => resetWorkspace()}>
            <RotateCcw size={13} /> Réinitialiser l’espace de travail
          </GlassButton>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): React.ReactNode {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Toggle checked={checked} onChange={onChange} label={label} />
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
          {hint}
        </div>
      </div>
    </div>
  );
}
