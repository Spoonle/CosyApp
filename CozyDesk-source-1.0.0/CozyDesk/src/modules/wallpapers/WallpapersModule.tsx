/** Module Fonds d'écran — dégradés intégrés, images et vidéos locales. */
import { Film, ImageIcon, Palette, Trash2, Upload } from 'lucide-react';
import { GlassButton, SectionTitle, Slider, Toggle } from '@/components/glass';
import { useSettingsStore } from '@/stores/settings';
import { WALLPAPER_PRESETS } from '@/components/common/WallpaperLayer';
import { toast, confirmAction } from '@/stores/toast';
import { db, nowTs, uid } from '@/services/storage/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { ID } from '@/types/domain';

interface WallpaperItem {
  id: ID;
  kind: 'image' | 'video';
  path: string;
  url: string;
  name: string;
  addedAt: number;
}

export default function WallpapersModule(): React.ReactNode {
  const wallpaper = useSettingsStore((s) => s.wallpaper);
  const setWallpaper = useSettingsStore((s) => s.setWallpaper);
  const profile = useSettingsStore((s) => s.graphicsProfile);

  const wallpapersMeta = useLiveQuery(() => db.meta.get('wallpapers'), [], undefined);
  const items: WallpaperItem[] =
    wallpapersMeta !== undefined && Array.isArray(wallpapersMeta.value)
      ? (wallpapersMeta.value as WallpaperItem[])
      : [];

  const importMedia = async (kind: 'image' | 'video'): Promise<void> => {
    const api = window.cozydesk;
    if (!api) {
      toast('error', 'Import indisponible', 'Fonction disponible dans l’application CozyDesk.');
      return;
    }
    try {
      const grants = await api.dialogs.openFiles(kind, false);
      if (grants.length === 0) return;
      const grant = grants[0];
      const ts = nowTs();
      const item: WallpaperItem = {
        id: uid(),
        kind,
        path: grant.path,
        url: grant.url,
        name: grant.name,
        addedAt: ts
      };
      // Table dédiée légère : on réutilise meta pour la persistance des fonds importés.
      const existing = (await db.meta.get('wallpapers')) as
        | { key: string; value: WallpaperItem[] }
        | undefined;
      const list = [...(existing?.value ?? []), item];
      await db.meta.put({ key: 'wallpapers', value: list });
      toast('success', 'Fond d’écran importé', grant.name);
    } catch (err) {
      toast('error', 'Import impossible', err instanceof Error ? err.message : undefined);
    }
  };

  const removeItem = async (id: ID): Promise<void> => {
    const ok = await confirmAction({
      title: 'Retirer ce fond d’écran ?',
      message: 'Il disparaîtra de la galerie CozyDesk (le fichier sur disque n’est pas touché).',
      confirmLabel: 'Retirer',
      danger: true
    });
    if (!ok) return;
    const existing = (await db.meta.get('wallpapers')) as
      | { key: string; value: WallpaperItem[] }
      | undefined;
    const list = (existing?.value ?? []).filter((w) => w.id !== id);
    await db.meta.put({ key: 'wallpapers', value: list });
    if (wallpaper.path !== undefined) {
      const removed = (existing?.value ?? []).find((w) => w.id === id);
      if (removed && removed.path === wallpaper.path) {
        setWallpaper({ kind: 'gradient', presetId: wallpaper.presetId, path: undefined, url: undefined });
      }
    }
  };

  const applyItem = (item: WallpaperItem): void => {
    setWallpaper({ kind: item.kind, path: item.path, url: item.url });
    // Ré-accorde le fichier auprès du processus principal (sécurité).
    void window.cozydesk?.files.grant([item.path], item.kind === 'video' ? 'video' : 'image');
  };

  return (
    <div className="module-root">
      <div className="module-header">
        <h2>Fonds d’écran</h2>
        <span className="spacer" />
        <GlassButton size="sm" variant="ghost" onClick={() => void importMedia('image')}>
          <ImageIcon size={14} /> Image
        </GlassButton>
        <GlassButton size="sm" variant="ghost" onClick={() => void importMedia('video')}>
          <Film size={14} /> Vidéo
        </GlassButton>
      </div>

      <div className="module-body">
        <SectionTitle icon={<Palette size={15} />}>Dégradés intégrés</SectionTitle>
        <div className="card-grid" style={{ marginBottom: 20 }}>
          {WALLPAPER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setWallpaper({ kind: 'gradient', presetId: preset.id })}
              style={{
                position: 'relative',
                height: 110,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border:
                  wallpaper.kind === 'gradient' && wallpaper.presetId === preset.id
                    ? '2px solid hsl(var(--accent-h) var(--accent-s) var(--accent-l))'
                    : '1px solid rgb(var(--stroke-rgb) / 0.2)',
                background: preset.cssDark
              }}
              aria-label={`Appliquer ${preset.label}`}
            >
              <span
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '5px 8px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: '#fff',
                  background: 'rgb(0 0 0 / 0.45)',
                  textAlign: 'left'
                }}
              >
                {preset.label}
              </span>
            </button>
          ))}
        </div>

        <SectionTitle icon={<Upload size={15} />}>Galerie locale ({items.length})</SectionTitle>
        {items.length === 0 && (
          <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginBottom: 20 }}>
            Importez des images ou vidéos locales avec les boutons en haut du module. Les vidéos
            peuvent être mises en pause pour économiser les ressources.
          </p>
        )}
        <div className="card-grid" style={{ marginBottom: 20 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                position: 'relative',
                height: 110,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border:
                  wallpaper.path === item.path
                    ? '2px solid hsl(var(--accent-h) var(--accent-s) var(--accent-l))'
                    : '1px solid rgb(var(--stroke-rgb) / 0.2)'
              }}
            >
              {item.kind === 'image' ? (
                <img src={item.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <video src={item.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', background: 'rgb(0 0 0 / 0.5)', padding: 4, gap: 4 }}>
                <button
                  style={{ flex: 1, color: '#fff', fontSize: 'var(--text-2xs)', fontWeight: 600, textAlign: 'left', padding: '2px 4px' }}
                  onClick={() => applyItem(item)}
                >
                  {item.kind === 'video' ? 'Vidéo · ' : ''}
                  {item.name}
                </button>
                <button
                  aria-label="Retirer"
                  style={{ color: '#fff', display: 'flex', padding: 2 }}
                  onClick={() => void removeItem(item.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle>Lisibilité & vidéos</SectionTitle>
        <div className="glass-ultra card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>Voile d’assombrissement</span>
              <span className="tabular text-muted">{Math.round(wallpaper.dim * 100)}%</span>
            </div>
            <Slider
              value={wallpaper.dim}
              min={0}
              max={0.6}
              step={0.01}
              onChange={(v) => setWallpaper({ dim: v })}
              ariaLabel="Voile d’assombrissement"
            />
            <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              Améliore la lisibilité des widgets sur les fonds très chargés.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle
              checked={wallpaper.videoEnabled}
              onChange={(v) => setWallpaper({ videoEnabled: v })}
              label="Lecture des fonds vidéo"
            />
            <div>
              <div style={{ fontWeight: 600 }}>Fonds vidéo animés</div>
              <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                {profile === 'performance'
                  ? 'Désactivés automatiquement par le profil Performance (économie de ressources).'
                  : 'Les vidéos se mettent en pause automatiquement quand la fenêtre est masquée.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
