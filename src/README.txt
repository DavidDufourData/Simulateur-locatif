RENTA LOCATIVE V11 — RADAR INVESTISSEUR PREMIUM

FICHIERS À REMPLACER
- App.jsx
- styles.css

FICHIER À AJOUTER
- api/investor-radar.js

NOUVEAUTÉS
- Page Premium « Radar marché »
- Carte d’accès depuis le tableau de bord
- Navigation ordinateur
- Onglet Radar dans la barre mobile
- Actualités structurées : résumé, impact, action, source et statut
- Académie investisseur
- Impact sur les projets enregistrés
- Étude de cas
- Mode sombre et responsive

FIABILITÉ
- Aucun chiffre fiscal ou de marché n’est inventé.
- Sans source connectée, la page affiche clairement un mode de configuration.
- Les domaines autorisés sont limités aux sites publics officiels.
- Chaque contenu conserve sa source et sa date.
- Les textes en discussion doivent avoir le statut « discussion » ou « proposal ».

AUTOMATISATION
L’endpoint /api/investor-radar :
- interroge automatiquement les sources configurées ;
- garde les résultats en cache pendant 6 heures ;
- refuse les domaines non autorisés ;
- ne publie rien de non vérifié si une source échoue.

CONFIGURATION
1. Déployez le dossier api sur Vercel.
2. Copiez .env.example vers vos variables d’environnement.
3. Remplacez l’URL d’exemple par de véritables flux officiels disponibles.
4. Déployez de nouveau.

IMPORTANT
Les sites publics ne proposent pas tous un flux RSS stable. Il faut renseigner uniquement des adresses officielles réellement accessibles. Tant que ce n’est pas fait, le Radar reste volontairement en mode démonstration plutôt que d’afficher de fausses actualités.
