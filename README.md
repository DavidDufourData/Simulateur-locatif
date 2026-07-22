# Renta Locative V2

Version complète du simulateur React/Vite.

## Fonctionnalités

- calcul instantané de rentabilité brute et nette ;
- mensualité, assurance et cash-flow ;
- score investisseur sur 100 ;
- comparaison visuelle des flux ;
- analyse fiscale estimative micro-BIC / régime réel ;
- scénario prudent ;
- TRI approximatif et création de valeur à 5 ans ;
- recommandations automatiques ;
- sauvegarde et comparaison de plusieurs biens dans le navigateur ;
- mode sombre ;
- impression / export PDF ;
- paiement Stripe et vérification côté serveur Vercel.

## Installation

```bash
npm install
npm run dev
```

## Déploiement Vercel

1. Remplacez le contenu du dépôt GitHub par les fichiers de ce dossier.
2. Dans Vercel, ajoutez la variable d'environnement `STRIPE_SECRET_KEY`.
3. Dans `src/App.jsx`, remplacez `STRIPE_PAYMENT_LINK` par le Payment Link Stripe en mode Live lorsque le site est prêt.
4. Configurez l'URL de succès Stripe :

```
https://renta-locative.fr/?session_id={CHECKOUT_SESSION_ID}
```

5. Faites un commit puis un push. Vercel exécutera automatiquement `npm run build`.

## Important

Les calculs fiscaux, le TRI et la valeur patrimoniale sont des estimations simplifiées. Ils doivent être présentés comme des aides à la décision et non comme des conseils professionnels personnalisés.
