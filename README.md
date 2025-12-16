# Audio Mixer API

Une API Node.js pour fusionner deux fichiers audio en un seul en utilisant FFmpeg.

## Fonctionnalités

- Télécharge deux fichiers audio à partir d'URLs.
- Mixe les fichiers simultanément (superposition).
- Ajuste la durée à la piste la plus courte.
- Retourne une URL publique pour télécharger le résultat.

## Installation et Démarrage

### Via Docker (Recommandé)

```bash
docker-compose up --build
```

Serveur accessible sur : `http://localhost:3000`

### En local (Node.js)

Prérequis : **FFmpeg** doit être installé sur votre système.

1. Installer les dépendances :
   ```bash
   npm install
   ```
2. Démarrer le serveur :
   ```bash
   npm start
   ```

## API Documentation

### POST /api/mix

Fusionne deux fichiers audio.

**Headers**
`Content-Type: application/json`

**Exemple de requête**

```json
{
  "audio1": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  "audio2": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
}
```

**Exemple de réponse**

Succcès :

```json
{
  "success": true,
  "result": "http://localhost:3000/output/1702738491234_mixed.mp3"
}
```

Erreur :

```json
{
  "error": "Audio processing failed",
  "details": "Message d'erreur technique..."
}
```
