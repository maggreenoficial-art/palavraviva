# Palavra Viva

App cristão de áudios para ansiedade, oração e paz.  
Slogan: *A Palavra de Cristo, viva em você.*

Funciona como **app nativo** (Expo / Play Store) e como **web app** (link no navegador).

## Rodar em desenvolvimento

```bash
npm install
npm start
# web: pressione `w` ou use
npm run web
```

## Build web (produção)

```bash
npm run build:web
npm run serve:web
```

Abra `http://localhost:8081`. A pasta `dist/` é o site estático para hospedar (Vercel, Netlify, EAS Hosting, etc.).

## Scripts úteis

| Comando | Uso |
|---------|-----|
| `npm run typecheck` | Checagem TypeScript |
| `npm run validate:bible` | Valida catálogo bíblico |
| `npm run build:web` | Export estático web |

## Privacidade

Não versionamos `.env`. Use `.env.example` como modelo (chaves ElevenLabs só para geração de áudio).
