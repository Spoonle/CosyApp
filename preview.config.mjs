/**
 * Configuration réservée à la prévisualisation navigateur du build de production
 * (`npm run preview:web`). Elle ne modifie pas la configuration applicative :
 * elle sert `dist/` sur toutes les interfaces et accepte les domaines de
 * prévisualisation hébergés (le reste du contrôle d'hôte Vite reste en place).
 *
 * L'application réelle reste Electron ; en navigateur, les fonctions qui
 * dépendent du processus principal (contrôles de fenêtre, sélecteurs de
 * fichiers locaux, lecture de médias locaux) sont simplement inactives.
 */
import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1']
  },
  build: {
    outDir: 'dist'
  }
});
