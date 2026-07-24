RENTA LOCATIVE V21 — ESTIMATION DU LOYER AVEC SOURCE OFFICIELLE

SOURCE PRINCIPALE
Carte des loyers 2025 publiée par l’ANIL et le ministère du Logement sur data.gouv.fr.

Mention obligatoire de la source :
« Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin »

DONNÉES UTILISÉES
- indicateur communal de loyer d’annonce ;
- charges comprises ;
- logement non meublé ;
- biens types mis en location au 3e trimestre 2025 ;
- référence différente selon :
  - appartement T1-T2 ;
  - appartement T3 et plus ;
  - appartement toutes typologies ;
  - maison.

FONCTIONNEMENT
1. L’application détecte la commune et le type de bien.
2. Elle appelle /api/rent-reference.
3. L’API télécharge la ressource CSV officielle correspondant à la typologie.
4. Elle recherche la commune.
5. Elle renvoie le loyer officiel en €/m²/mois et les indicateurs de qualité disponibles.
6. Le moteur applique ensuite des ajustements transparents liés au bien.

TRANSPARENCE
L’écran affiche :
- la valeur communale officielle ;
- l’année ;
- la typologie retenue ;
- la source exacte ;
- un lien vers data.gouv.fr ;
- le loyer central estimé ;
- la fourchette ;
- chaque ajustement appliqué.

SÉCURITÉ
- Aucun chiffre sectoriel n’est inventé.
- Si la commune n’est pas trouvée ou si la source est indisponible, aucun loyer automatique n’est affiché.
- Une saisie manuelle reste possible comme solution de secours.
- La commune peut être corrigée si elle n’est pas présente dans l’annonce.

PRÉCAUTIONS
La donnée officielle est un indicateur communal de loyer d’annonce charges comprises.
Elle ne constitue pas un loyer garanti, un loyer réellement signé ou un comparable exact.
Les indicateurs doivent être interprétés avec prudence lorsque le nombre d’observations ou le R² est faible.

NOUVEAU FICHIER
- api/rent-reference.js

FICHIERS À REMPLACER
- App.jsx
- styles.css
- api/investor-radar.js

FICHIER À AJOUTER
- api/rent-reference.js

RESSOURCES DATA.GOUV UTILISÉES
- Appartement toutes typologies :
  55b34088-0964-415f-9df7-d87dd98a09be
- Appartement T1-T2 :
  14a1fe11-b2d1-49b3-9f6b-83d12df9482c
- Appartement T3 et plus :
  5e3b28a4-cf56-43a3-ae79-43cceeb27f8c
- Maison :
  129f764d-b613-44e4-952c-5ff50a8c9b73
