/** Module Ambiance — mélangeur de sons synthétisés, volumes par canal. */
import { AudioWaveform, CloudRain, Coffee, Flame, Trees, Volume2, Waves, Wind, X } from 'lucide-react';
import { GlassButton, SectionTitle, Slider, Toggle } from '@/components/glass';
import { AMBIENT_CHANNELS, useAmbientStore, type AmbientChannelId } from '@/stores/ambient';
import { useSettingsStore } from '@/stores/settings';
import type { LucideIcon } from 'lucide-react';

const CHANNEL_ICONS: Record<AmbientChannelId, LucideIcon> = {
  rain: CloudRain,
  forest: Trees,
  wind: Wind,
  fire: Flame,
  ocean: Waves,
  cafe: Coffee,
  white: AudioWaveform
};

const CHANNEL_HINTS: Record<AmbientChannelId, string> = {
  rain: 'Bruits filtrés et gouttes aléatoires',
  forest: 'Vent dans les feuilles et chants d’oiseaux',
  wind: 'Souffle grave et lent',
  fire: 'Ronflement chaud et crépitements',
  ocean: 'Vagues lentes superposées',
  cafe: 'Bourdonnement de voix et tasses',
  white: 'Bruit blanc pur'
};

export default function AmbientModule(): React.ReactNode {
  const volumes = useAmbientStore((s) => s.volumes);
  const active = useAmbientStore((s) => s.active);
  const master = useAmbientStore((s) => s.master);
  const toggle = useAmbientStore((s) => s.toggle);
  const setVolume = useAmbientStore((s) => s.setVolume);
  const setMaster = useAmbientStore((s) => s.setMaster);
  const stopAll = useAmbientStore((s) => s.stopAll);
  const ambientResume = useSettingsStore((s) => s.ambientResume);
  const setSettings = useSettingsStore((s) => s.setSettings);

  return (
    <div className="module-root">
      <div className="module-header">
        <h2>Ambiance sonore</h2>
        <span className="spacer" />
        {active.length > 0 && (
          <GlassButton size="sm" variant="ghost" onClick={stopAll}>
            <X size={13} /> Tout couper
          </GlassButton>
        )}
      </div>

      <div className="module-body">
        <p className="text-secondary" style={{ marginBottom: 14, fontSize: 'var(--text-sm)' }}>
          Chaque son est synthétisé en temps réel sur votre machine (WebAudio) : aucun fichier, aucun
          flux réseau. Mélangez plusieurs ambiances et réglez chaque volume indépendamment.
        </p>

        <div className="card-grid">
          {AMBIENT_CHANNELS.map((channel) => {
            const Icon = CHANNEL_ICONS[channel.id];
            const isOn = active.includes(channel.id);
            return (
              <div
                key={channel.id}
                className="glass"
                style={{
                  padding: 14,
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  borderColor: isOn
                    ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.5)'
                    : undefined,
                  boxShadow: isOn
                    ? '0 0 0 1px hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.3), var(--shadow-md)'
                    : undefined
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: isOn
                        ? 'hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.2)'
                        : 'rgb(var(--glass-deep-rgb) / 0.6)',
                      color: isOn
                        ? 'hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) + 8%))'
                        : 'rgb(var(--text-secondary-rgb))'
                    }}
                  >
                    <Icon size={19} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 600 }}>{channel.label}</span>
                    <span className="text-muted" style={{ fontSize: 'var(--text-2xs)' }}>
                      {CHANNEL_HINTS[channel.id]}
                    </span>
                  </span>
                  <Toggle
                    checked={isOn}
                    onChange={() => toggle(channel.id)}
                    label={`Activer ${channel.label}`}
                  />
                </div>
                <Slider
                  value={volumes[channel.id]}
                  onChange={(v) => setVolume(channel.id, v)}
                  ariaLabel={`Volume ${channel.label}`}
                />
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionTitle icon={<Volume2 size={15} />}>Volume général</SectionTitle>
          <Slider value={master} onChange={(v) => setMaster(v)} ariaLabel="Volume général" />
        </div>

        <div style={{ marginTop: 18 }} className="glass-ultra card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle
              checked={ambientResume}
              onChange={(v) => setSettings({ ambientResume: v })}
              label="Reprendre les sons au démarrage"
            />
            <div>
              <div style={{ fontWeight: 600 }}>Reprendre au démarrage</div>
              <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                Relance automatiquement les ambiances actives à l’ouverture de CozyDesk.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
