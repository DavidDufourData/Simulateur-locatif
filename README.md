# Simulateur de rentabilité locative

## Démarrer en local
```
npm install
npm run dev
```
Ouvrez l'URL affichée (en général http://localhost:5173).

## Déployer

1. Créez un dépôt sur GitHub, puis depuis ce dossier :
```
git init
git add .
git commit -m "Premier commit"
git remote add origin https://github.com/VOTRE-COMPTE/simulateur-locatif.git
git branch -M main
git push -u origin main
```

2. Sur [vercel.com](https://vercel.com), "Add New Project" → sélectionnez ce dépôt → Deploy.
   Vercel détecte Vite automatiquement, aucune configuration nécessaire.

3. Pour publier une mise à jour :
```
git add .
git commit -m "description du changement"
git push
```
Vercel redéploie automatiquement à chaque push.

## Monétisation
- **Publicité** : compte Google AdSense, script inséré dans `index.html`.
- **Abonnement premium** : le bouton "Débloquer (démo)" dans `App.jsx` est un
  point de départ — à remplacer par une vraie vérification de paiement
  (Stripe Checkout + stockage de l'accès, ex. avec Supabase).
