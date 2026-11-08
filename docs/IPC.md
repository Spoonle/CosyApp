# IPC et sécurité

Le rendu n'a **aucun** accès à Node.js. Tout passe par `window.cozydesk`, exposé
par `src/preload/index.ts` au moyen de `contextBridge`, et par des canaux
`ipcMain.handle` validés dans `src/main/ipc/index.ts`.

## 1. Réglages de sécurité (fenêtre principale)

| Réglage | Valeur | Fichier |
|---|---|---|
| `contextIsolation` | `true` | `src/main/windows/main-window.ts` |
| `sandbox` | `true` | idem |
| `nodeIntegration` | `false` | idem |
| `webSecurity` | `true` | idem |
| `preload` | `dist-electron/preload.cjs` (chemin absolu) | idem |
| Permissions | notifications uniquement | idem |
| Navigation | toute URL hors `file://` et serveur de dev est bloquée | idem |
| `window.open` | refusé ; les liens `https:` partent dans le navigateur système | idem |
| CSP | stricte dans `index.html`, assouplie uniquement en développement | `index.html`, `vite.config.ts` |

## 2. Surface exposée

| Namespace | Méthodes | Effet |
|---|---|---|
| `app` | `getInfo`, `quit` | métadonnées, fermeture |
| `win` | `minimize`, `toggleMaximize`, `close`, `isMaximized`, `onMaximizedChange` | contrôles de la fenêtre native |
| `dialogs` | `openFiles(kind, multiple)`, `saveJson(defaultName)` | sélecteurs système |
| `files` | `grant`, `readText`, `writeText`, `backup` | fichiers autorisés |
| `shell` | `openExternal(url)` | liens `https:` uniquement |

Rien d'autre n'est exposé : pas de `ipcRenderer`, pas de `require`, pas de canal
générique de type `invoke(channel, …)`.

## 3. Règles de validation

Toute charge utile est vérifiée avant usage (`src/main/ipc/validate.ts`) :

- `isPlainObject` — un objet, pas un tableau ;
- `isNonEmptyString(value, max)` — chaînes bornées ;
- `isStringArray(value, max)` — 500 chemins maximum ;
- `isFileKind` — `audio | image | video | json` ;
- `isSafeAbsolutePath` — chemin absolu, sans octet nul, ≤ 4096 caractères.

Une charge utile invalide lève une erreur : le rendu reçoit un rejet de promesse,
jamais un silence.

## 4. Politique fichiers

```text
dialogue (openFiles)  ──► chemin choisi par l'utilisateur ──► liste blanche lecture
dialogue (saveJson)   ──► chemin choisi par l'utilisateur ──► liste blanche écriture
files:grant           ──► ré-autorise un chemin DÉJÀ persisté (audio/image/vidéo)
```

- **Lecture** : `files:readText` n'accepte que des chemins de la liste blanche et
  uniquement pour le type `json`.
- **Écriture** : `files:writeText` n'accepte que des chemins issus d'une boîte
  d'enregistrement, 100 Mo maximum.
- **Sauvegardes** : `files:backup` écrit dans `userData/backups`, nom filtré
  (`^[A-Za-z0-9._-]+\.json$`), 30 fichiers conservés.
- **JSON exclu de `files:grant`** : un import de sauvegarde doit toujours passer
  par un dialogue, sinon le rendu pourrait lire n'importe quel `.json` du disque.

### Diffusion des médias

Le rendu ne reçoit jamais de `file://`. Les fichiers autorisés sont servis par le
schéma privilégié `cozydesk-file://local/<chemin encodé>` :

- schéma déclaré `standard`, `secure`, `supportFetchAPI`, `stream` ;
- toute requête dont le chemin n'est pas dans la liste blanche renvoie **403** ;
- fichier absent → **404** ; requêtes `Range` transmises (lecture vidéo/audio) ;
- `bypassCSP: false` : la CSP de la page s'applique aussi aux médias.

## 5. Liens externes

`shell:openExternal` analyse l'URL et n'accepte que `https:`. Les autres schémas
(`file:`, `javascript:`, `smb:`…) sont rejetés avant d'atteindre le système.

## 6. Ce qui est volontairement impossible

- écrire hors d'un chemin choisi dans une boîte de dialogue ;
- lire un fichier qui n'a pas été accordé ;
- ouvrir une fenêtre vers un site distant ;
- charger un script distant (CSP `script-src 'self'`) ;
- accéder à l'API Node depuis la console du rendu.

## 7. Vérifier soi-même

```bash
# Aucune API Node dans le rendu
grep -rn "require(\|process\.\|ipcRenderer" src/renderer | grep -v "window.cozydesk"

# Aucun canal IPC non validé
grep -rn "ipcMain.handle" src/main/ipc/index.ts | wc -l

# Réglages de sécurité de la fenêtre
sed -n 1,40p src/main/windows/main-window.ts
```
