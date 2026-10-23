# Remplacement des liens VF — Heroscape France

Date : 23 octobre 2026

## État vérifié

- **531 références** conservées, dans le même ordre.
- **498 liens VF** pointent vers **498 fichiers WebP HD distincts** de notre bibliothèque.
- **523 cartes HD** et **523 miniatures** sont hébergées sur la branche de préparation.
- **25 images** non liées à une référence existante restent disponibles (notamment glyphes, variantes d'illustration et noms absents du catalogue).
- **33 références** ne sont pas liées à notre bibliothèque VF ; leur lien VF précédent ou leur absence de VF est conservé.
- Tous les **498 fichiers référencés existent** et ont leur miniature.
- **Aucun champ** autre que `fr` dans `data/cards.json` n'a changé : pas de changement des noms, coûts, généraux, VO, ordre, HTML, CSS ou JavaScript.
- Les variantes existantes **Guilty McCreech (2.0)**, **Isamu (2.0)** et **Sudema (2.0)** reçoivent chacune leur propre fichier distinct.

## Traçabilité

- `correspondances_498_publiees.csv` : index, référence, image, ancien et nouveau lien.
- `images_25_non_liees.csv` : fichiers disponibles non affectés ; ne pas les supprimer.

## Attention

Le chargement de la page combine le catalogue JSON avec des modifications enregistrées dans Supabase. Une ancienne URL VF dans une modification administrative peut masquer le nouveau lien JSON. Vérifier le cas **Kira Jax (C3V)** lors de la publication. Les 2 autres overrides identifiés (**The Kraken** et **Thormun**) ne possèdent pas de lien VF.

La publication du site sur `main` nécessite les **deux éléments ensemble** : `assets/cartes/` et `data/cards.json`. Ne pas publier les liens sans les fichiers WebP.
