RENTA LOCATIVE V20 — ESTIMATION DU LOYER PAR LE SECTEUR

OBJECTIF
Permettre une estimation locative sans transformer une hypothèse en donnée détectée.

PRINCIPE
L’utilisateur renseigne une référence locale récente en €/m²/mois, issue :
- d’annonces comparables ;
- d’une étude locale ;
- d’un observatoire ;
- d’un professionnel immobilier.

Renta Locative applique ensuite des ajustements transparents selon :
- appartement ou maison ;
- surface et effet de volume ;
- état rénové ou travaux ;
- parking ou garage ;
- balcon, terrasse, jardin ou terrain ;
- DPE lorsqu’il est réellement indiqué.

RÉSULTAT
L’application affiche :
- un loyer central estimé ;
- une fourchette prudente de ±6 % ;
- le détail des ajustements ;
- un niveau de confiance ;
- un avertissement clair indiquant qu’il s’agit d’une estimation.

RÈGLE DE CONFIANCE CONSERVÉE
- Les données de l’annonce restent séparées.
- Les charges, la taxe foncière et le loyer ne sont jamais inventés.
- Le prix moyen du secteur n’est pas créé automatiquement.
- Sans référence sectorielle, l’application affiche « Référence sectorielle nécessaire ».

EXEMPLE
Référence locale : 18 €/m²/mois
Surface : 72 m²
Surface familiale : -4,5 %
Balcon : +4 %
Parking : +4 %
DPE favorable : +2,5 %

Le moteur calcule une estimation argumentée et non une fausse donnée factuelle.

FICHIERS À REMPLACER
- App.jsx
- styles.css
- api/investor-radar.js
