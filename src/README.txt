RENTA LOCATIVE V12 — RADAR BRANCHÉ

Le Radar est maintenant préconfiguré et fonctionne sans ajouter de variable d’environnement.

SOURCES INTÉGRÉES
1. Service Public
   Flux RSS officiel des actualités pour les particuliers.
2. Insee
   Page officielle des publications statistiques.
3. Banque de France
   Page officielle des publications statistiques.

FICHIERS À REMPLACER
- App.jsx
- styles.css
- api/investor-radar.js

FONCTIONNEMENT
- interrogation automatique des sources ;
- filtrage immobilier, crédit, location, DPE et fiscalité ;
- cache de six heures ;
- suppression des doublons ;
- conservation du lien officiel ;
- aucune invention lorsqu’une source ne répond pas ;
- diagnostic technique renvoyé par l’API.

DÉPLOIEMENT
1. Remplacez les trois fichiers.
2. Déployez sur Vercel.
3. Ouvrez /api/investor-radar pour vérifier la réponse JSON.
4. Ouvrez ensuite la page Radar dans l’application.

La variable RADAR_SOURCES_JSON est désormais facultative. Elle sert seulement à ajouter d’autres flux officiels.
