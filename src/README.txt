RENTA LOCATIVE V22 — ANALYSE ÉVOLUTIVE

NOUVEAU PARCOURS

1. Analyse de l’annonce
L’application extrait uniquement les informations réellement présentes.

2. Estimation du loyer
La référence sectorielle officielle est récupérée via l’API ANIL/data.gouv.fr.
L’utilisateur peut utiliser le loyer proposé ou saisir son propre montant.

3. Validation du loyer
Le bouton « Utiliser ce loyer » enregistre l’estimation comme hypothèse financière.

4. Recalcul instantané
Toute modification met immédiatement à jour :
- rendement brut ;
- rendement net ;
- cash-flow ;
- mensualité de crédit ;
- score ;
- verdict ;
- prix de négociation conseillé.

DONNÉES MODIFIABLES
- loyer retenu ;
- charges mensuelles ;
- taxe foncière annuelle ;
- apport en pourcentage ;
- taux du crédit ;
- durée du crédit.

PROGRESSION
Un bandeau indique :
- annonce analysée ;
- loyer estimé ;
- loyer validé ;
- charges renseignées ;
- taxe foncière renseignée ;
- analyse finale disponible.

RÈGLE DE CONFIANCE
Aucun résultat financier n’est affiché tant que les données indispensables ne sont pas présentes.
L’utilisateur voit clairement quelles valeurs viennent de l’annonce, d’une source sectorielle ou d’une saisie manuelle.

FICHIERS MODIFIÉS
- App.jsx
- styles.css

FICHIER API CONSERVÉ
- api/rent-reference.js
