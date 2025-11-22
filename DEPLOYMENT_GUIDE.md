# Come Pubblicare Alpha-Vision su Internet (Vercel)

Per aprire l'app da una pagina web vera (accessibile anche dal telefono), segui questi passi. È gratis.

## 1. Prepara i File
Assicurati di avere tutti i file salvati. Ho già creato il file `vercel.json` necessario.

## 2. Crea un Account GitHub (se non ce l'hai)
Vai su [github.com](https://github.com/) e registrati.

## 3. Carica il Codice su GitHub
1. Scarica [GitHub Desktop](https://desktop.github.com/) e installalo.
2. Apri GitHub Desktop e fai "File" > "Add Local Repository".
3. Seleziona la cartella `c:\Users\Drraf\Downloads\copy-of-copy-of-alpha-vision-app`.
4. Clicca "Publish repository" in alto a destra.
5. Dai un nome (es. `alpha-vision`) e clicca "Publish".

## 4. Pubblica su Vercel
1. Vai su [vercel.com](https://vercel.com/) e registrati con il tuo account GitHub.
2. Clicca "Add New..." > "Project".
3. Vedrai `alpha-vision` nella lista "Import Git Repository". Clicca "Import".
4. Clicca "Deploy".

## 5. Fatto! 🚀
Vercel ti darà un link (es. `alpha-vision.vercel.app`).
Puoi inviarti questo link su WhatsApp e aprirlo dal telefono. L'app funzionerà ovunque!

## ⚠️ RISOLUZIONE PROBLEMI (Errore 404)
Se vedi "404: NOT_FOUND", significa che Vercel non ha capito che è un progetto Vite.

1. Vai su Vercel > Settings > **General**.
2. Scorri fino a "Build & Development Settings".
3. Assicurati che **Framework Preset** sia impostato su **Vite**.
4. Assicurati che **Output Directory** sia impostato su `dist`.
5. Se cambi qualcosa, vai su "Deployments" e clicca "Redeploy" sull'ultimo commit.
