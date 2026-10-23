# Contrôle des liens VF — lot 2

Date : 23 octobre 2026  
Branche : `preparation-correspondances-cartes-20261022`

## Résultat

- Bibliothèque GitHub : **523 cartes HD** et **523 miniatures**.
- Deuxième lot : **34 liens VF** ajoutés dans `data/cards.json` après lecture visuelle de la carte et vérification du nom, du général et des points contre la référence du site.
- Premier lot précédent : **44 liens VF**.
- Total préparé : **78 liens VF sur 531 références**.
- Comparaison avec `main` : **78 différences uniquement dans le champ `fr`**, aucune autre propriété modifiée.
- Les **78 chemins d'images** pointent vers des fichiers effectivement présents dans `assets/cartes/vf/`.
- **Aucun changement** à Supabase, HTML, CSS ou aux liens VO.
- **Aucun changement sur `main`** ; les URL de production ne sont pas actives tant que les images ne sont pas publiées par GitHub Pages.

## Variantes

- `guilty-mc-creech.webp` : **30 points**, reliée à **Guilty McCreech** (30 points). `guilty-mccreech.webp` (50 points) est **conservée et non associée automatiquement** à cette référence.
- `sudema-2.webp` : **140 points**, reliée à **Sudema** (140 points). `sudema.webp` (110 points) est **conservée séparément**.
- Les deux variantes `isamu.webp` et `isamu-2.webp` ont chacune 10 points : association **en attente** pour éviter un choix arbitraire.
- `ana-karithon.webp` : général lu **Einar** contre **Jandar** sur le site : association **en attente**.
- `araignees-fyorlag.webp` et `arktos.webp` : libellé **Aquila** sur l'image, **Aquilla** dans le catalogue ; correspondance admise comme variante orthographique.

## Suite

Poursuivre la vérification visuelle des 437 images encore non lues. 21 images n'ont pas de référence candidate dans le catalogue. Ne pas fusionner la branche tant que les associations litigieuses et la publication GitHub Pages ne sont pas traitées.

Voir `lot_34_liens_vf.csv` pour la liste exacte du deuxième lot.
