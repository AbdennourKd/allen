# LinkedIn Drip Plan — Project Tracker

8 posts étalés sur ~3-4 semaines. Mix teaser / storytelling / features / tuto / behind-the-scenes.

**Cadence suggérée :**
- Semaine -1 : Posts 1 et 2 (pre-launch, on chauffe)
- Semaine 0 (launch) : Post 3
- Semaine 1 : Posts 4 et 5
- Semaine 2 : Posts 6 et 7
- Semaine 3 : Post 8 (récap + appel à feedback)

**Règles d'or LinkedIn :**
- Première ligne = scroll stopper. Si elle ne donne pas envie de cliquer "voir plus", le post est mort.
- Sauts de ligne entre paragraphes (LinkedIn condense le texte sinon).
- Pas plus de 1-2 emojis par post.
- Toujours une CTA en bas (commente, DM, partage, suis-moi).
- Hashtags : 3-5 max, à la fin.

---

## Post 1 — Teaser (pre-launch, J-7)

**Format :** problème personnel + cliffhanger

> J'ai compté combien d'heures je passais à *gérer* mes projets UX au lieu de les faire.
>
> Toggl ouvert dans un onglet. Notion pour les phases. Un Excel pour facturer.
>
> Bilan : 4-5h par semaine de friction admin. Multipliée par 50 semaines = une semaine entière perdue chaque année.
>
> J'ai arrêté.
>
> J'ai construit l'outil que j'aurais voulu avoir depuis le début.
>
> Reveal vendredi.
>
> #UXDesign #Freelance #DesignTools

---

## Post 2 — Le problème (J-3)

**Format :** liste, ça performe bien

> 3 trucs que tout designer UX freelance subit en silence :
>
> 1. **Tu sous-estimes le temps de Research.**
> Tu factures 4h, t'en passes 9. Le client trouve déjà ton tarif élevé. Tu manges la différence.
>
> 2. **Tes phases (Research, Wireframe, Design, Handoff) ne sont pas trackées séparément.**
> Donc tu ne sais jamais où ça déborde. Tu refais la même erreur de chiffrage au projet d'après.
>
> 3. **Tu oublies de stopper le timer en allant déjeuner.**
> Et tu factures honnêtement, donc tu retires à la main. Encore du temps perdu.
>
> J'ai construit un outil qui résout ces 3 trucs. Reveal dans 2 jours.
>
> Si tu te reconnais dans un de ces points, dis-le en commentaire — je veux savoir lequel pique le plus.
>
> #UXDesign #Freelance #ProjectManagement

---

## Post 3 — Le reveal (jour J)

**Format :** annonce + démo (joins ton GIF/screenshot ici)

> C'est en ligne.
>
> **Project Tracker** — un plugin Figma que j'ai construit pour les designers UX qui veulent track leur temps **par phase**, sans quitter Figma.
>
> Ce qu'il fait :
> → Timer par projet × phase (Research, Ideation, Wireframe, Prototype, Design, Review, Handoff)
> → Auto-pause quand tu es inactif (5 min par défaut, configurable)
> → Rapports hebdo avec breakdown par phase et par jour
> → Export CSV / PDF prêt pour la facturation
> → Multi-langue : FR / EN / AR (avec support RTL)
> → Aucune inscription, aucun cloud — tout reste sur ta machine
>
> Disponible sur Figma Community ici : [LIEN]
>
> Premier feedback bienvenu. Vraiment.
>
> #FigmaPlugin #UXDesign #ProductivityTools

---

## Post 4 — Feature deep-dive : multi-langue (J+5)

**Format :** behind the scenes technique, ça inspire confiance

> "Pourquoi tu as ajouté l'arabe à un plugin Figma ?"
>
> Parce que la moitié de mes potes designers ne sont pas anglophones. Et que les outils qui leur sont adressés sont rares.
>
> Project Tracker parle 3 langues : Français, English, العربية.
>
> Et l'arabe n'est pas juste une traduction. L'interface entière passe en RTL (right-to-left). Les chevrons s'inversent. Le timer reste numérique mais l'ordre des éléments suit la langue.
>
> [SCREENSHOT EN MODE RTL]
>
> Ça m'a pris une après-midi à implémenter. Mais je sais que pour un designer marocain ou égyptien, voir un outil qui *parle leur langue de la bonne manière*, ça change la perception.
>
> Si tu builds quelque chose et que tu veux toucher au-delà des anglophones, l'i18n + RTL ce n'est pas un nice-to-have. C'est un signal.
>
> #i18n #UXDesign #Inclusive

---

## Post 5 — Feature deep-dive : phases (J+8)

**Format :** insight métier

> Pourquoi tracker le temps "par projet" ne suffit pas.
>
> Sur un projet de 40h, ça donne juste : "j'ai passé 40h." Bravo. Et ?
>
> Mais si tu décomposes :
>
> - Research : 12h (planifié 6h)
> - Wireframe : 5h (planifié 8h)
> - Design : 18h (planifié 20h)
> - Review : 5h (planifié 6h)
>
> Là tu vois où tu *overshoot*. Tu vois que tu sous-estimes systématiquement la Research. Tu ajustes ton chiffrage. Tu deviens plus rentable au projet d'après.
>
> C'est pour ça que Project Tracker oblige à choisir une phase à chaque démarrage de timer. Pas optionnel. Parce que sans ça, c'est juste un chronomètre.
>
> Ton temps n'est pas une masse uniforme. Tracker comme tel.
>
> #UXDesign #Freelance #PricingStrategy

---

## Post 6 — Feature deep-dive : idle detection (J+12)

**Format :** anecdote courte

> J'ai déjà facturé un client pour 3h "de design" pendant lesquelles j'étais en réunion sur un AUTRE projet.
>
> J'avais oublié d'arrêter le timer en switchant.
>
> Maintenant le plugin le fait pour moi.
>
> Après 5 min d'inactivité (souris, clavier), il met le timer en pause automatiquement. Je reprends quand je touche à nouveau Figma.
>
> Honnêteté préservée. Sans y penser.
>
> Détail tech au passage : la détection est throttled à 250ms côté souris. Donc même quand tu bouges la souris vite, ça ne pèse pas sur les perfs du plugin.
>
> #UXDesign #Productivity #Freelance

---

## Post 7 — Mini tutorial (J+16)

**Format :** étape par étape, ultra-actionnable

> Comment passer de 0 à un rapport hebdo détaillé en 3 minutes.
>
> 1. **Installe Project Tracker** depuis Figma Community : [LIEN]
> 2. **Ouvre n'importe quel fichier**, lance le plugin
> 3. **Crée tes projets** dans l'onglet "Projets" (un click, pick une couleur)
> 4. **Onglet Timer** → choisis projet + phase → ▶ Start
> 5. **Travaille**. Le timer tourne. Si tu pars en pause, il s'auto-pause.
> 6. **Stop** quand tu finis. Une note optionnelle apparaît si tu veux contextualiser la session.
> 7. **Onglet Rapport** → vue par phase, par jour, total. Export CSV ou PDF en un click.
>
> Tu factures, ou tu rebriefes le client, ou tu ajustes ton planning. Tout est là.
>
> Pas d'inscription. Pas de cloud. Pas de version premium qui débloque les features. Juste ton temps, tracké propre.
>
> #FigmaPlugin #Tutorial #UXTools

---

## Post 8 — Récap + appel à feedback (J+21)

**Format :** community/build in public

> 3 semaines depuis le launch de Project Tracker.
>
> Ce que j'ai appris :
>
> → Les utilisateurs veulent les exports avant TOUTE autre feature. J'ai bossé 2 jours sur la détection d'idle, personne n'en a parlé. Le PDF a été demandé 12 fois en 1 semaine.
>
> → Le RTL m'a ramené 4 utilisateurs du monde arabophone qui m'ont dit "personne ne fait ça pour nous". Validation immédiate.
>
> → Les phases UX scindées (vs un timer simple) sont le différenciateur que le marché reconnaît.
>
> Ce qui arrive :
>
> → Une extension Chrome (pour tracker quand tu n'es pas dans Figma)
> → Un mode équipe (workspace partagé)
> → Plus de langues si la demande monte
>
> Question : qu'est-ce qui te manque le plus aujourd'hui dans ton stack de gestion de temps ? Réponds en commentaire — je note tout.
>
> #UXDesign #BuildInPublic #FigmaPlugin

---

## Notes générales

**Visuels à préparer :**
- Post 3 : GIF démo (15s) — création projet → start timer → vue rapport
- Post 4 : screenshot side-by-side FR / AR (RTL visible)
- Post 5 : screenshot du breakdown par phase
- Post 6 : screenshot du badge "idle" qui s'affiche
- Post 7 : carrousel 7 slides (1 étape par slide) — ce format performe TRÈS bien sur LinkedIn

**Pour le reach :**
- Poste les mardi/mercredi/jeudi entre 8h et 11h (pic d'engagement LinkedIn)
- Réponds à TOUS les commentaires dans la première heure (boost l'algo)
- Engage avec des posts d'autres designers UX dans la journée qui précède ton post (warm up le réseau)
- Ne mets pas de lien externe dans le corps du post — mets-le en premier commentaire (LinkedIn pénalise les liens sortants dans le post lui-même)

**Variantes anglais :**
Si tu veux dupliquer en anglais pour toucher l'international, tu peux poster les versions EN sur un cycle décalé d'1 jour (mais sur ton compte LinkedIn principal — pas un compte séparé).
