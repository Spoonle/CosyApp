/**
 * Export / import complet des données (JSON).
 * L'import valide chaque enregistrement, crée une sauvegarde préalable
 * et fusionne (upsert) sans jamais supprimer l'existant.
 */
import { DB_SCHEMA_VERSION, db } from './db';
import { writeBackup } from './backup';
import type { BaseRec } from '@/types/domain';

export interface ExportBundle {
  app: 'CozyDesk';
  kind: 'export';
  schemaVersion: number;
  exportedAt: number;
  data: Record<string, unknown[]>;
}

const TABLE_NAMES = [
  'tasks',
  'categories',
  'notes',
  'journal',
  'pomodoroSessions',
  'habits',
  'habitLogs',
  'events',
  'subjects',
  'chapters',
  'flashcards',
  'studySessions',
  'tracks',
  'playlists'
] as const;

function isBaseRecord(v: unknown): v is BaseRec {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.createdAt === 'number' && typeof r.updatedAt === 'number';
}

/** Valide la structure d'un lot exporté. Lève une erreur explicite si invalide. */
export function validateBundle(raw: unknown): ExportBundle {
  if (typeof raw !== 'object' || raw === null) throw new Error('Fichier illisible.');
  const b = raw as Record<string, unknown>;
  if (b.app !== 'CozyDesk') throw new Error('Ce fichier n’est pas une sauvegarde CozyDesk.');
  if (typeof b.schemaVersion !== 'number' || b.schemaVersion > DB_SCHEMA_VERSION) {
    throw new Error('Version de sauvegarde non prise en charge.');
  }
  if (typeof b.data !== 'object' || b.data === null) throw new Error('Données absentes du fichier.');
  return { ...(b as unknown as ExportBundle), kind: 'export' };
}

export async function buildExportBundle(): Promise<ExportBundle> {
  const data: Record<string, unknown[]> = {};
  for (const name of TABLE_NAMES) {
    const rows = await db.table(name).toArray();
    data[name] = rows.map((r) =>
      name === 'tracks' ? { ...(r as object), picture: undefined } : r
    );
  }
  return {
    app: 'CozyDesk',
    kind: 'export',
    schemaVersion: DB_SCHEMA_VERSION,
    exportedAt: Date.now(),
    data
  };
}

export interface ImportReport {
  inserted: Record<string, number>;
  rejected: Record<string, number>;
  backupKey: string;
}

/** Importe un lot validé : sauvegarde préalable puis fusion (upsert). */
export async function importBundle(bundle: ExportBundle): Promise<ImportReport> {
  const backup = await writeBackup('pré-import');
  const inserted: Record<string, number> = {};
  const rejected: Record<string, number> = {};

  for (const name of TABLE_NAMES) {
    const rows = bundle.data[name];
    if (!Array.isArray(rows)) continue;
    let ok = 0;
    let ko = 0;
    const valid: BaseRec[] = [];
    for (const row of rows) {
      if (isBaseRecord(row)) {
        if (name === 'tracks') {
          const t = row as unknown as Record<string, unknown>;
          if (typeof t.addedAt !== 'number') {
            t.addedAt = typeof t.createdAt === 'number' ? t.createdAt : Date.now();
          }
        }
        valid.push(row as BaseRec);
        ok++;
      } else {
        ko++;
      }
    }
    if (valid.length > 0) {
      await db.table(name).bulkPut(valid);
    }
    if (ok > 0) inserted[name] = ok;
    if (ko > 0) rejected[name] = ko;
  }
  return { inserted, rejected, backupKey: backup.key };
}

/* ---------- Fichiers (via IPC Electron) ---------- */

export async function exportToFile(): Promise<string> {
  const api = window.cozydesk;
  if (!api) throw new Error('Fonction disponible uniquement dans l’application CozyDesk.');
  const d = new Date();
  const defaultName = `cozydesk-export-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}.json`;
  const path = await api.dialogs.saveJson(defaultName);
  if (!path) return '';
  const bundle = await buildExportBundle();
  await api.files.writeText(path, JSON.stringify(bundle, null, 2));
  return path;
}

export async function importFromFile(): Promise<ImportReport> {
  const api = window.cozydesk;
  if (!api) throw new Error('Fonction disponible uniquement dans l’application CozyDesk.');
  const grants = await api.dialogs.openFiles('json', false);
  if (grants.length === 0) throw new Error('Aucun fichier sélectionné.');
  const text = await api.files.readText(grants[0].path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Le fichier sélectionné n’est pas un JSON valide.');
  }
  const bundle = validateBundle(parsed);
  return importBundle(bundle);
}
