RENTA LOCATIVE V19 — DONNÉES FIABLES, AUCUNE VALEUR INVENTÉE

Cette version corrige le problème de confiance observé sur l’annonce de l’appartement de 72 m².

RÈGLE ABSOLUE
Une donnée absente de l’annonce reste absente.

L’application ne crée plus automatiquement :
- des charges de copropriété ;
- une taxe foncière ;
- un loyer ;
- un DPE ;
- un budget travaux ;
- un rendement ;
- un cash-flow ;
- un prix de négociation.

EXEMPLE DE L’ANNONCE TESTÉE
L’annonce indique :
- appartement ;
- 3 pièces ;
- 72 m² ;
- balcon ;
- parking ;
- copropriété ;
- ravalement réalisé en 2021 ;
- consommation énergétique de 86 kWh/m²/an.

Elle n’indique pas :
- le montant des charges ;
- la taxe foncière ;
- le loyer ;
- une lettre DPE complète ;
- un budget travaux.

La V19 affiche donc :
- Charges de copropriété : Non renseignées
- Taxe foncière : Non renseignée
- Loyer : Non renseigné
- DPE : Non renseigné
- Travaux : Aucun travail signalé
- Rendement : Non calculable
- Cash-flow : Non calculable
- Prix de négociation : Impossible à déterminer sérieusement
- Verdict : À COMPLÉTER

SÉPARATION DES INFORMATIONS
1. Données réellement détectées dans l’annonce
2. Calculs uniquement lorsque toutes les données essentielles sont présentes
3. Données manquantes clairement signalées

SÉCURITÉ CONTRE LES HALLUCINATIONS
Même si un service IA est ultérieurement branché, les valeurs factuelles importantes
(prix, surface, loyer, charges, taxe foncière et DPE) restent validées par le texte local.
L’IA ne peut pas transformer une estimation en donnée détectée.

FICHIERS À REMPLACER
- App.jsx
- styles.css
- api/investor-radar.js
