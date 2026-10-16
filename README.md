# ALYA Impression 3D

Site e‑commerce complet : React 19 + TypeScript + Vite, Three.js (rendu 2.5D « AutoDepth »), GSAP/ScrollTrigger,
paiement Stripe Checkout via Netlify Functions, administration Decap CMS protégée par Netlify Identity.

## Démarrer

```bash
npm install
npm run dev          # http://localhost:5173 (sans les fonctions de paiement)
npx netlify dev      # avec les fonctions /api/* (nécessite netlify-cli et un fichier .env)
npm run build        # typecheck + build de production dans dist/
```

## Déployer sur Netlify

1. Pousser ce dépôt sur GitHub, puis « Add new site → Import from Git » sur Netlify. `netlify.toml` configure tout (build, fonctions, redirections, en‑têtes de sécurité).
2. Variables d’environnement (Site settings → Environment variables), voir `.env.example` :
   - `STRIPE_SECRET_KEY` — clé secrète Stripe
   - `STRIPE_WEBHOOK_SECRET` — secret du webhook
   - `SITE_URL` — URL publique (facultatif, sinon l’URL Netlify)
   - `SHIPPING_COUNTRIES` — ex. `FR,BE,CH,LU`
3. Stripe → Développeurs → Webhooks : ajouter `https://<site>/api/stripe-webhook`, événement `checkout.session.completed`.
4. Administration : Netlify → Identity → Enable, *Registration: Invite only*, puis Services → **Git Gateway** → Enable. Inviter votre e‑mail. L’espace est sur `/admin`.

## Ce qui reste à connecter / renseigner

| Élément | Où | État |
|---|---|---|
| Clés Stripe + webhook | variables Netlify | **à configurer** — sans elles le bouton de paiement affiche « paiement non configuré » |
| Prix, dimensions, matériaux, couleurs | `content/products/*.json` ou `/admin` | **vides** : aucun prix n’a été inventé. Un produit sans prix s’affiche « Prix à venir » et n’est pas achetable |
| Photos produits réelles | `npm run assets:depth` (voir plus bas) | les visuels actuels sont des **illustrations provisoires** générées par `scripts/generate-placeholders.mjs` |
| Nom définitif, e‑mail, Instagram, livraison/retours | `content/settings.json` ou `/admin → Réglages` | nom provisoire « ALYA » |
| Mentions légales, confidentialité, CGV | `src/pages/Legal.tsx` | structure prête, champs marqués **À compléter** |
| Formulaire de contact | Netlify Forms | actif automatiquement après déploiement (Forms → activer les notifications e‑mail) |

## Données

Source unique : `content/settings.json` (marque, catégories) et un fichier JSON par produit dans `content/products/`.
Chaque produit : nom, descriptions courte/détaillée, prix en centimes (`null` = non vendable), catégorie, photos
(avec carte de profondeur), couleurs, dimensions, matériaux, disponibilité, stock, masquage, mise en avant, usages, produits associés.
Le serveur relit ces fichiers pour calculer le montant Stripe : **le prix envoyé par le navigateur n’est jamais utilisé**.

Commandes : consultables dans le Dashboard Stripe (Paiements). Le webhook vérifie la signature et journalise les commandes payées ;
c’est le point d’extension pour un e‑mail ou une base de données. La page de confirmation interroge Stripe : une commande
n’est jamais considérée comme payée parce qu’on a visité une URL.

## Pipeline AutoDepth (photo → relief 2.5D)

Préparation **hors ligne**, jamais dans le navigateur du client :

```bash
npm i -D @huggingface/transformers     # une fois
npm run assets:depth -- ./photos/lampe.jpg lampe-onde-1
```

1. détourage (RMBG‑1.4) → masque alpha, fond et textes autour de l’objet supprimés
2. estimation de profondeur (Depth Anything V2 small) → carte en niveaux de gris
3. profondeur masquée et adoucie sur les contours, WebP optimisés dans `public/products/`

« AutoDepth » désigne ici ce pipeline : je n’ai pas trouvé d’outil unique portant ce nom et utilisable en ligne de commande ;
Depth Anything V2 est la solution équivalente standard. Limites : la carte est une estimation relative depuis une seule photo,
elle donne du relief mais **ne reconstruit pas les faces cachées**. Un texte imprimé *sur* l’objet n’est pas effacé automatiquement.
La géométrie n’est jamais modifiée.

## Composant `DepthProduct`

`src/components/DepthProduct.tsx` + `src/three/DepthScene.ts` : plan subdivisé déplacé par la carte de profondeur (shader),
éclairage dérivé du gradient de profondeur, relief atténué près de la silhouette pour éviter l’étirement des contours.

Props : `image`, `depthMap`, `mask`, `depthIntensity`, `parallax`, `scale`, `position`, `light`, `animation`
(`float`, `drift`, `follow: pointer|drag|none`), `motion` (pilotage externe par GSAP : `x`, `y`, `push`), `bleed` (débordement du cadre).

Performance et repli : three.js est chargé à la demande, scène créée à l’approche du viewport, rendu suspendu hors écran,
maillage allégé et parallaxe réduite sur tactile, `prefers-reduced-motion` respecté (image fixe), la photo reste affichée si
WebGL ou la carte de profondeur manquent. Sur le catalogue, un seul contexte WebGL est monté au survol.

## Direction artistique : l’atelier orbital

Bleu marine presque noir et surfaces bleu sombre en profondeur. Le violet n’existe que comme lumière physique sur les objets
(contre-jour dans les rendus et le shader), jamais comme décor d’interface. Les couleurs vives sont réservées aux produits.
Typographie : Archivo (titres, casse normale), Hanken Grotesk (texte). Pas de libellés en capitales, pas de numérotation décorative.

Parcours de la page d’accueil, piloté par GSAP ScrollTrigger (`src/pages/Home.tsx`, `@gsap/react` pour le nettoyage) :
1. **Introduction** (`PrinterIntro.tsx`) : l’imprimante imprime le logo seule (~4 s, buse et matière synchronisées par construction).
   Section épinglée : au défilement, la caméra avance vers le logo et l’imprimante sort du cadre.
2. **Atelier** : piste horizontale épinglée (Lampes, Supports, « Et aussi »), aimantation sur chaque panneau.
   Avec `containerAnimation`, chaque objet avance vers le visiteur en passant au centre puis s’éloigne ; le texte glisse
   moins vite que l’objet (deux plans). Sur mobile, panneaux empilés.
3. **Showroom** (`Showroom.tsx`) : entrée en profondeur au défilement, puis flèches / ← → / glisser, variantes, panier.
4. **Fabrication** (`Process.tsx`) : section épinglée, une timeline à 4 repères (Dessin, Préparation, Impression, Finition)
   avec aimantation `labelsDirectional` ; pendant l’impression, la buse et le remplissage suivent la même progression.
5. **Personnalisation** (`Customization.tsx`) : les 4 types arrivent en cascade (`ScrollTrigger.batch`).

Tout passe par `gsap.matchMedia` : variantes desktop / mobile, et aucune animation au défilement si le système demande
de réduire les animations.

Note : le code de la version précédente du site n’était pas disponible ; cette version reconstruit son concept à partir de sa description.

## Visuels provisoires

`npm run assets:render` modélise la lampe et le support en 3D (Three.js, rendu dans Chromium via playwright-core) :
matière PLA avec lignes de couche, éclairage physique, ombre de contact, contre-jour violet discret.
Chaque couleur a son rendu ; la carte de profondeur est exacte (issue du rendu) et retombe à zéro près des contours.
Ce sont des visuels provisoires, pas des photographies. Pour une vraie photo :
`npm run assets:depth -- photo.jpg lampe-onde-ambre`, puis la référencer dans `images` du produit avec `"color": "Ambre"`.

Rendu 2.5D (`src/three/DepthScene.ts`) : maillage très légèrement déformé pour la perspective, plus un décalage par pixel
guidé par la profondeur pour le relief interne. Les contours restent nets quand l'objet pivote. Angles volontairement limités.

## Arborescence

```
content/            données produits et réglages (éditables via /admin)
netlify/functions/  create-checkout, checkout-status, stripe-webhook
public/admin/       Decap CMS
public/products/    photos et cartes de profondeur
scripts/            génération des visuels provisoires, pipeline AutoDepth
src/components/     Layout, DepthProduct, ProductCard, Seo
src/pages/          Accueil, Boutique, Fiche produit, Panier, Confirmation, Fabrication, Contact, pages légales, 404
src/three/          moteur de rendu 2.5D
```

## Pour aller plus loin

Le site est une SPA : le contenu est rendu en JS (Google l’indexe, mais un pré‑rendu améliorerait les aperçus de partage).
Option recommandée si le référencement devient prioritaire : pré‑rendu statique des routes produits.
