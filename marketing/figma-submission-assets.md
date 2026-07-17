# Figma Community Submission: Assets Brief

Tout ce qu'il faut préparer dans Figma avant de cliquer "Publish".

---

## 1. Icône, 128 × 128 px (PNG). FAIT

`marketing/assets/icon-128.png` : anneau segmenté (un segment par phase, mêmes couleurs que `PHASE_COLORS` dans le plugin) avec un bouton play bleu au centre. Construit directement dans Figma pour rester cohérent avec le design system du plugin.

**Reste à vérifier avant submit :**
- [ ] Zoom à 32px (taille réelle d'affichage dans les résultats de recherche). Les segments doivent rester distincts, pas juste une tache de couleur.
- [ ] Contrôle visuel sur fond blanc ET noir (le fond de l'icône est transparent, donc Figma composite dessus). Vérifier qu'aucun segment ne se fond dans l'un des deux.

---

## 2. Cover image, 1920 × 960 px (PNG). FAIT

`marketing/Banner_2.png` (version finale validée) : logo + "Allen" + "Track your UX time. By phase. Without leaving Figma." / "Free. No signup. Custom phases, flexible reports, EN / FR / AR." à gauche, mockup réel du Timer à droite, dégradé violet-indigo (#4D45FC → #6D5DF5 → #4C8DFF). `Banner.png` est une version antérieure abandonnée (texte générique, bouton "Start timer" inventé qui n'existe pas dans le vrai produit).

**Ce que c'est :**
La grande image qui s'affiche en haut de la page Community. C'est le truc qui te fait scroller ou pas.

**Composition recommandée :**
- Côté gauche (40-50%) : le pitch en gros texte
  - Headline : "Track your UX time. By phase. Without leaving Figma."
  - Sub : "Free. No signup. Custom phases, flexible reports, EN / FR / AR."
- Côté droit (50-60%) : un mockup de l'UI réelle dans un browser frame ou floating window
- Background : dégradé bleu sombre type `#0a0e1a` vers `#1a1f3a`, ou solid `#1e1e1e` (la couleur du plugin)
- Typo : Inter ou la même que ton plugin

**Safe zone, important :** Figma recadre différemment la cover selon l'endroit où elle s'affiche (bannière large en haut de la fiche vs vignette carrée dans les résultats de recherche/grille). Garde tout élément textuel ou visuel important dans le **tiers central** de l'image ; les 15-20% de chaque bord peuvent être coupés en vignette. Ne mets jamais de texte critique près des bords gauche/droit.

**Évite :**
- Trop de stock images (trop "AI generated")
- Plus de 2 captures d'écran sur la cover (encombré)
- Du texte plus petit que 36px sur cover (illisible en thumbnail)

---

## 3. Screenshots, 3 à 5 (1920 × 1080 ou 1280 × 720, PNG). FAIT

`marketing/Visuel 1.png` à `Visuel 4.png` : timer en action, phases personnalisées, rapports flexibles, sélecteur de langue. Fenêtre flottante sur fond dégradé violet-indigo, captures réelles non retouchées (juste recadrage de la barre de titre Figma).

Chaque screenshot doit raconter UN bénéfice. L'utilisateur va swiper, donc clarté > exhaustivité. **Le premier screenshot compte double** : c'est souvent lui qui sert de vignette dans les résultats de recherche, avant même que quelqu'un clique sur la fiche.

### Screenshot 1 : Le héros, timer en action
**Show :** Timer view avec un timer running, projet sélectionné, phase "Design", breakdown du jour visible en bas (avec la barre "objectif du jour" si elle a une valeur non-nulle, ça se voit bien).
**Caption (overlay top) :** "Track time per phase. Pause it your way."
**État à capturer :** timer actif (couleur bleue), 2-3 phases déjà dans le breakdown Today, barre d'objectif à ~40-60% (ni vide ni pleine, plus crédible).

### Screenshot 2 : Phases personnalisées
**Show :** Le sélecteur de phase ouvert avec le bouton "+", 1-2 phases custom déjà créées (ex: "QA Perso", "Client Review") à côté des phases par défaut.
**Caption :** "Built-in phases, or make your own."
**Pourquoi ce screenshot :** c'est une feature que peu de concurrents ont, ça vaut la peine d'un visuel dédié plutôt que de la noyer dans une liste de bullet points.

### Screenshot 3 : Rapports flexibles
**Show :** Report view avec les onglets jour/semaine/mois/année visibles en haut, un des onglets actif (mois ou année marche bien pour montrer que ce n'est "pas juste une semaine"), breakdown par phase + par projet + 3-4 sessions listées.
**Caption :** "Day, week, month, year. Your call."
**État :** données réalistes (pas "Lorem"), au moins 2 projets représentés pour que le breakdown "par projet" apparaisse.

### Screenshot 4 : Multi-langue + RTL
**Show :** Side-by-side : la même vue Settings en français à gauche, en arabe (RTL) à droite.
**Caption :** "EN / FR / AR. Right-to-left supported."
**Astuce :** ce visuel te différencie immédiatement de tous les concurrents.

### Screenshot 5 (optionnel) : Projects view
**Show :** Liste de 4-5 projets avec couleurs distinctes, totaux de temps, la pastille de rythme moyen ("~3h/sem") visible sur au moins un projet, un en "Active".
**Caption :** "Color-code projects. See your pace."

---

## 4. Tagline, 1 ligne (max 80 caractères). FAIT

**Choisie :** "Track your UX time, phase by phase. Without leaving Figma." (66 c)

Cohérente avec l'accroche du cover ("Track your UX time. By phase.").

---

## 5. Description, long form

À copier dans le champ Description sur Figma Community.

```
Allen is a time tracker built for UX designers, by a UX designer.

Most time trackers give you one timer and one project. A real design project is Research, Ideation, Wireframes, Prototyping, Design, Review, Handoff. They overlap constantly unless you track them separately. This plugin tracks project × phase, so you know exactly where your hours go.

Features:
- Timer with project + custom phases (add your own on top of the defaults)
- Manual pause, plus auto-pause when you're idle (threshold configurable)
- Auto-detects the right project when you reopen a Figma file
- Reports by day, week, month, or year, with phase breakdown and session log
- CSV and PDF export
- English, French, العربية, with full RTL support
- Project archiving, color tagging, optional notes per session
- Works on shared files: each session records who tracked it

No account, no cloud sync, no telemetry. Everything stays on your device, stored locally by Figma.

How it works: create a project, pick a phase, hit start. The timer pauses itself if you walk away, or you can pause it yourself. Stop, optionally add a note. Open Report to see the breakdown for any period, export to CSV or PDF.

Feedback: abdennourkd2001@gmail.com
```

---

## 6. Tags (max 5)

Recommandation :
- `productivity`
- `time-tracking`
- `ux-design`
- `freelance`
- `reporting`

---

## 7. Bonnes pratiques générales avant de publier

**Cohérence visuelle entre tous les assets.** Icône, cover et screenshots doivent se sentir comme un seul objet : même bleu accent (`#0D99FF`), même thème sombre, même typo (Inter). Un icône coloré à côté d'une cover dans une palette différente donne une impression amateur avant même que le contenu soit lu.

**Le premier visuel fait le travail.** Que ce soit la cover ou le screenshot 1, en pratique 80% des gens décident de cliquer ou scroller sur ce seul élément. Priorise ton temps de design là-dessus plutôt que de vouloir un polish uniforme sur les 5 screenshots.

**Données réalistes partout, sans exception.** Pas de "Project 1", "Lorem ipsum", ou des durées rondes suspectes (2h00m00s). Utilise de vrais noms de projets fictifs mais crédibles (agence, client type) et des durées avec des minutes/secondes non-rondes. Ça se voit à l'œil quand une capture est mise en scène avec des données trop propres.

**Ne promets rien que le produit ne fait pas.** Le tagline et la description doivent décrire exactement les features livrées, pas de "coming soon" pour l'extension Chrome ou un mode équipe qui n'existe pas. Un utilisateur déçu à l'installation laisse un avis négatif, ce qui coûte plus cher en découvrabilité que ne pas mentionner la feature du tout.

**Catégorie et tags orientent la découvrabilité autant que le texte.** Choisis la catégorie Figma la plus proche (Productivity ou Utilities selon ce qui est disponible). Les utilisateurs browsent aussi par catégorie, pas seulement par recherche texte.

**Le tagline doit se lire naturellement à voix haute.** Pas de bourrage de mots-clés ("time tracker time tracking UX design productivity tool"). Une phrase qui sonne comme une vraie phrase humaine convertit mieux et ne fait pas fuir.

**Support email fonctionnel avant publication.** `abdennourkd2001@gmail.com` doit pouvoir recevoir et être surveillé. Les premiers jours après publication sont ceux où le feedback (et les bugs) arrivent le plus.

---

## Checklist finale avant submit

- [x] Icône 128×128 testée sur fond blanc ET noir (112px et 32px, lisible dans les deux cas)
- [x] Cover 1920×960 (`marketing/Banner.png`)
- [x] 4 screenshots (`marketing/Visuel 1-4.png`)
- [x] Tagline < 80 caractères
- [ ] Description sans typo, sans placeholder
- [ ] Email de support valide dans le formulaire
- [x] Plugin testé une dernière fois en local : démarrer, pause/reprendre, stopper, export CSV/PDF (contenu vérifié), switch langue — RAS, aucune erreur console
- [x] manifest.json vérifié — `name`/`id`/`api` OK ; `reasoning` du networkAccess corrigé (mentionnait encore localStorage seul, plus exact depuis le fix clientStorage)

Une fois tout coché : Figma Desktop, Plugins, Manage plugins, Allen, Publish.
