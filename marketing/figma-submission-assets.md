# Figma Community Submission — Assets Brief

Tout ce qu'il faut préparer dans Figma avant de cliquer "Publish".

---

## 1. Icône — 128 × 128 px (PNG)

**Specs Figma :**
- Format : PNG
- Dimensions : 128×128 (Figma upscale automatiquement)
- Background : doit être visible sur fond blanc ET noir (Figma teste les deux)

**Direction créative suggérée :**
- Un chrono / timer stylisé. Ex. cercle de progression incomplet (3/4) avec un point central.
- Couleur primaire : `#0D99FF` (Figma blue) ou un gradient subtle bleu→violet
- Ne PAS reprendre l'icône `timer` de Material Symbols telle quelle (générique)
- Un peu de personnalité : par ex. un chrono dont le secteur est divisé en couleurs (les phases UX)
- Évite le texte dans l'icône (pas lisible à 32px)

**Trois directions à explorer en 30 minutes :**
1. Cercle segmenté multi-couleur (chaque segment = une phase) avec aiguille
2. Chiffre "00:00" stylisé en lettrage custom
3. Stopwatch bouton "play" intégré, monochrome

Pick the one that pops on les deux backgrounds.

---

## 2. Cover image — 1920 × 960 px (PNG)

**Ce que c'est :**
La grande image qui s'affiche en haut de la page Community. C'est le truc qui te fait scroller ou pas.

**Composition recommandée :**
- Côté gauche (40-50%) : le pitch en gros texte
  - Headline : "Track your UX time. By phase. Without leaving Figma."
  - Sub : "Free. No signup. EN / FR / AR."
- Côté droit (50-60%) : un mockup de l'UI réelle dans un browser frame ou floating window
- Background : dégradé bleu sombre type `#0a0e1a → #1a1f3a` ou solid `#1e1e1e` (la couleur du plugin)
- Typo : Inter ou la même que ton plugin

**Évite :**
- Trop de stock images (trop "AI generated")
- Plus de 2 captures d'écran sur la cover (encombré)
- Du texte plus petit que 36px sur cover (illisible en thumbnail)

---

## 3. Screenshots — 3 à 5 (1920 × 1080 ou 1280 × 720, PNG)

Chaque screenshot doit raconter UN bénéfice. L'utilisateur va swiper, donc clarté > exhaustivité.

### Screenshot 1 — Le héros : Timer en action
**Show :** Timer view avec un timer running, projet sélectionné, phase "Design", breakdown du jour visible en bas.
**Caption (overlay top) :** "Track time per UX phase. One click."
**État à capturer :** timer actif (couleur bleue), 1-2 phases déjà breakdown visibles dans Today.

### Screenshot 2 — Rapport hebdo
**Show :** Report view avec breakdown par phase + breakdown par jour + 3-4 sessions listées.
**Caption :** "Weekly reports. Phase × Day. Ready to invoice."
**État :** données réalistes (pas "Lorem"), 5+ sessions sur 4 jours.

### Screenshot 3 — Multi-langue + RTL
**Show :** Side-by-side : la même vue Settings en français à gauche, en arabe (RTL) à droite.
**Caption :** "EN / FR / AR. Right-to-left supported."
**Astuce :** ce visuel te différencie immédiatement de tous les concurrents.

### Screenshot 4 — Idle detection
**Show :** Le banner "Idle detected" jaune visible avec le bouton "Resume".
**Caption :** "Auto-pause when you walk away. Honest billing, automatic."

### Screenshot 5 (optionnel) — Projects view
**Show :** Liste de 5-6 projets avec couleurs distinctes, totaux de temps, un en "Active".
**Caption :** "Color-code projects. See your portfolio at a glance."

---

## 4. Tagline — 1 ligne (max 80 caractères)

**Options :**
1. "Track your UX time, phase by phase. Without leaving Figma." (66 c)
2. "Time tracker for UX designers. Phases, reports, multi-language." (64 c)
3. "Honest UX time tracking. No signup. No cloud. Yours forever." (60 c)

→ Pick 1, le plus accrocheur. Recommandation : option 1.

---

## 5. Description — long form

À copier dans le champ Description sur Figma Community.

```
Project Tracker is a time tracking plugin built for UX designers, by a UX designer.

Most time trackers don't understand UX work. They give you one timer and one project. Reality: a project is Research, Ideation, Wireframes, Prototyping, Design, Review, and Handoff — and they all bleed into each other unless you track them separately.

This plugin tracks time per project × phase. So you finally know where your hours actually go.

What's inside

→ Timer with project + phase selection (Research, Ideation, Wireframe, Prototype, Design, Review, Handoff)
→ Auto-pause when you're idle (configurable threshold, default 5 min)
→ Weekly reports: phase breakdown, day breakdown, full session log
→ CSV and PDF export, ready for invoicing
→ Multi-language interface: English, French, العربية (with full RTL support)
→ Project archiving + color tagging
→ Optional notes per session

What's NOT inside

→ No account. No login.
→ No cloud sync. All data stays in your browser's localStorage.
→ No telemetry. No analytics. No external service is ever called with your data.
→ No premium tier. No paywall.

How it works

1. Create your projects with a color and name
2. Pick a project + phase, click ▶
3. Work in Figma. The timer auto-pauses when you walk away.
4. Stop. Optionally add a note.
5. Open the Report tab to see this week's breakdown. Export to CSV or PDF.

Built for freelancers, agency designers, and anyone who needs to know where their hours go without selling their data to a SaaS.

Feedback welcome at [your email].
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

## Checklist finale avant submit

- [ ] Icône 128×128 testée sur fond blanc ET noir
- [ ] Cover 1920×960 lisible en thumbnail (zoom out à 25% pour vérifier)
- [ ] 3-5 screenshots avec données *réalistes* (pas de Lorem, pas de "Project 1")
- [ ] Tagline < 80 caractères
- [ ] Description sans typo, sans placeholder
- [ ] Email de support valide dans le formulaire
- [ ] Plugin testé une dernière fois en local : démarrer, stopper, exporter, switch langue
- [ ] manifest.json a la version finale (vérifier le `name` et le `reasoning` du networkAccess)

Si tout est coché → Figma Desktop → Plugins → Manage plugins → Project Tracker → Publish.
