/** Fond d'écran : dégradés intégrés (variantes sombre ET claire), images et vidéos locales. */
import { useEffect, useRef } from 'react';
import { useSettingsStore, resolvedMode } from '@/stores/settings';
import { useDocumentVisible } from '@/hooks';

/** Dégradés intégrés — générés en CSS, aucun fichier requis, adaptés au mode clair/sombre. */
export interface WallpaperPreset {
  id: string;
  label: string;
  cssDark: string;
  cssLight: string;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'aurora-nuit',
    label: 'Aurora Nuit',
    cssDark:
      'radial-gradient(1200px 800px at 15% -5%, #232a5c 0%, transparent 55%), radial-gradient(1000px 700px at 95% 20%, #173a4d 0%, transparent 50%), radial-gradient(900px 900px at 50% 115%, #2b1e52 0%, transparent 55%), #0a0c1a',
    cssLight:
      'radial-gradient(1200px 800px at 15% -5%, #dfe4fb 0%, transparent 55%), radial-gradient(1000px 700px at 95% 20%, #d9edf1 0%, transparent 50%), radial-gradient(900px 900px at 50% 115%, #e6def7 0%, transparent 55%), #f2f4fc'
  },
  {
    id: 'crepuscule',
    label: 'Crépuscule',
    cssDark:
      'radial-gradient(1100px 750px at 80% -10%, #5b2a6e 0%, transparent 55%), radial-gradient(900px 650px at 10% 30%, #35306e 0%, transparent 50%), radial-gradient(1000px 900px at 45% 110%, #7a3b5e 0%, transparent 55%), #12101f',
    cssLight:
      'radial-gradient(1100px 750px at 80% -10%, #e7d5f0 0%, transparent 55%), radial-gradient(900px 650px at 10% 30%, #dde0f5 0%, transparent 50%), radial-gradient(1000px 900px at 45% 110%, #f2dce8 0%, transparent 55%), #f6f3fa'
  },
  {
    id: 'profond',
    label: 'Abysse',
    cssDark:
      'radial-gradient(1300px 900px at 20% 0%, #0e2f4a 0%, transparent 55%), radial-gradient(1000px 800px at 90% 60%, #0a2038 0%, transparent 55%), #050d18',
    cssLight:
      'radial-gradient(1300px 900px at 20% 0%, #d8e8f6 0%, transparent 55%), radial-gradient(1000px 800px at 90% 60%, #e2edf5 0%, transparent 55%), #f0f5fa'
  },
  {
    id: 'foret',
    label: 'Brume de Forêt',
    cssDark:
      'radial-gradient(1100px 800px at 15% 10%, #17402f 0%, transparent 55%), radial-gradient(900px 700px at 85% 40%, #0f2d26 0%, transparent 50%), radial-gradient(1000px 900px at 50% 110%, #1d4a38 0%, transparent 55%), #080f0d',
    cssLight:
      'radial-gradient(1100px 800px at 15% 10%, #ddefe2 0%, transparent 55%), radial-gradient(900px 700px at 85% 40%, #e0efe8 0%, transparent 50%), radial-gradient(1000px 900px at 50% 110%, #d9efe4 0%, transparent 55%), #eef5f0'
  },
  {
    id: 'sable',
    label: 'Sable Chaud',
    cssDark:
      'radial-gradient(1100px 800px at 20% 0%, #5c4526 0%, transparent 55%), radial-gradient(900px 700px at 90% 50%, #4a3b52 0%, transparent 50%), #171018',
    cssLight:
      'radial-gradient(1100px 800px at 20% 0%, #f0e2c8 0%, transparent 55%), radial-gradient(900px 700px at 90% 50%, #ece4f0 0%, transparent 50%), #f8f4ec'
  },
  {
    id: 'nuit-pure',
    label: 'Nuit Pure',
    cssDark:
      'radial-gradient(1400px 900px at 50% -20%, #151830 0%, transparent 60%), #05060c',
    cssLight:
      'radial-gradient(1400px 900px at 50% -20%, #e8eaf5 0%, transparent 60%), #f7f8fc'
  }
];

export function WallpaperLayer(): React.ReactNode {
  const wallpaper = useSettingsStore((s) => s.wallpaper);
  const profile = useSettingsStore((s) => s.graphicsProfile);
  const mode = useSettingsStore((s) => s.mode);
  const visible = useDocumentVisible();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const preset =
    WALLPAPER_PRESETS.find((p) => p.id === wallpaper.presetId) ?? WALLPAPER_PRESETS[0];
  const resolved = resolvedMode(mode);

  // Les vidéos se mettent en pause quand masquées ou en profil Performance.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const allowed = wallpaper.videoEnabled && profile !== 'performance';
    if (visible && allowed) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [visible, wallpaper.videoEnabled, profile, wallpaper.kind]);

  return (
    <div className="wallpaper-layer" aria-hidden="true">
      {wallpaper.kind === 'gradient' && (
        <>
          <div className="ambient-bg">
            <div className="ambient-blob b1" />
            <div className="ambient-blob b2" />
            <div className="ambient-blob b3" />
          </div>
          <div
            className="wallpaper-preset"
            style={{ background: resolved === 'light' ? preset.cssLight : preset.cssDark }}
          />
        </>
      )}
      {wallpaper.kind === 'image' && wallpaper.url && (
        <img className="wallpaper-media" src={wallpaper.url} alt="" draggable={false} />
      )}
      {wallpaper.kind === 'video' && wallpaper.url && (
        <video
          ref={videoRef}
          className="wallpaper-media"
          src={wallpaper.url}
          loop
          muted
          playsInline
          autoPlay
        />
      )}
      {/* Voile pour la lisibilité (mode clair : voile clair) */}
      <div
        className="wallpaper-dim"
        style={{
          background:
            resolved === 'light'
              ? `rgb(250 250 255 / ${wallpaper.dim * 0.85})`
              : `rgb(4 6 14 / ${wallpaper.dim})`
        }}
      />
    </div>
  );
}
