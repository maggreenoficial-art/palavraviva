# Áudio privado (não público)

Esta pasta é o espelho local de `assets/audio` para o streaming autenticado.

```bash
npm run media:sync
```

Em produção, use S3/R2 (`npm run media:upload`) e as variáveis `MEDIA_S3_*`.
Os MP3 aqui não devem ser commitados.
