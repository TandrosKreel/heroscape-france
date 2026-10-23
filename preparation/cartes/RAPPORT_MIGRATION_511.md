# Migration publiée : 511 liens VF Heroscape France

Date : 23 octobre 2026

- **511 / 531 références** ouvrent désormais des images WebP françaises sur notre hébergement GitHub Pages.
- **500 images HD distinctes** sont utilisées (11 références supplémentaires sont des alias/duplicatas de cartes identiques et partagent leur image).
- **523 images HD** et **523 miniatures** sont conservées dans le dépôt public.
- **23 images non associées** restent disponibles, sans suppression.
- **20 références** conservent leur ancien lien VF ou n'ont pas de VF disponible ; parmi elles les 10 cartes Marvel.
- Différences du catalogue par rapport à la version avant migration : **511 modifications du champ `fr` uniquement**. Noms, coûts, généraux, liens VO, ordre et nombre de références inchangés.
- **Drow Chainfighter** est relié à `combattant-a-chaine-drow.webp`. L'**Assassin Drow** est une carte distincte, conservée non associée.
- Les images `legionnaires.webp` et `phalange.webp` ont été lues et associées respectivement à **Oathbound Legionnaires (50, Revna)** et **Oathbound Phalanx (80, Revna)**.
- **Kira Jax (C3V)** : l'override VF Supabase a été aligné sur `kira-jax.webp`. Les autres modifications administrateur sont inchangées.
- Publication GitHub Pages : le déploiement initial de la bibliothèque a réussi ; la correction des 13 références supplémentaires a déclenché un nouveau déploiement.

## Traçabilité et restauration

- Avant migration, `main` pointait vers le commit `b72246211c09414500b054a32e57a5faea3140cc`.
- Publication initiale : `8288416f8f2f9d6bb30a44d3f5ac3eba1214d667`.
- Correction de liens supplémentaires : `3fc2339f3d0c9e141fe78eaec33fb6c2814dd881`.
- `correspondances_511_publiees.csv` : tous les liens remplacés, avant/après.
- `images_23_non_liees.csv` : images encore à classer.

Les fichiers `assets/cartes` sont conservés même si une correction de lien est nécessaire. Aucun changement HTML, CSS ou JS.
