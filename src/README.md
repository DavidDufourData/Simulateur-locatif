# Renta Locative — IA sécurisée

Ce paquet corrige les mentions trompeuses et prépare une activation prudente de l’IA.

## Installation

- Remplacer `App.jsx` par le fichier fourni.
- Placer `api/analyze-listing.js` dans le projet.
- Ne jamais enregistrer la clé OpenAI dans GitHub ou dans le code React.

## Déploiement sans aucun coût OpenAI

Laisser `AI_ENABLED=false` dans Vercel. Le moteur local fonctionne et l’interface indique clairement qu’aucune IA n’a été utilisée.

## Activation ultérieure dans Vercel

Créer les variables :

- `AI_ENABLED=true`
- `OPENAI_API_KEY=...`
- `ALLOWED_ORIGIN=https://www.renta-locative.fr`
- `AI_DAILY_LIMIT_PER_IP=5`
- `OPENAI_MODEL=gpt-4o-mini`

Puis redéployer.

## Protections incluses

- clé exclusivement côté serveur ;
- IA désactivée par défaut ;
- origine contrôlée ;
- 6 000 caractères maximum ;
- délai maximal de 12 secondes ;
- validation stricte de la réponse ;
- 5 analyses par IP et par jour en protection de base ;
- aucune erreur sensible envoyée au navigateur.

## À savoir

La limitation en mémoire est une première barrière, mais elle n’est pas un plafond absolu sur une architecture serverless. Avant un lancement public important, ajouter une limitation persistante avec Vercel KV ou Upstash Redis et une authentification utilisateur.
