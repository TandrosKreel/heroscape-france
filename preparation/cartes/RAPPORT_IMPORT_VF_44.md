# Migration VF — premier lot de 44 cartes

- Date : 23 octobre 2026
- Branche : `preparation-correspondances-cartes-20261022`
- Catalogue : 531 entrées conservées
- Liens VF remplacés dans `data/cards.json` : **44**
- Autres propriétés des cartes (noms, généraux, points, liens VO, ordre) : **inchangées**
- Images WebP HD présentes dans `assets/cartes/vf` : **523/523**
- Miniatures présentes dans `assets/cartes/miniatures` : **523/523**
- Vérification du premier lot : `lecture_visuelle=OUI`, général et coût concordants avec le catalogue, image présente, référence unique sans collision
- Collision volontairement exclue : `assassin-drow` (plusieurs images candidates pour Drow Chainfighter)
- Modifications Supabase : **aucune**
- Overrides Supabase constatés (lecture seule) : 3, sur Kira Jax (C3V), The Kraken et Thormun ; aucune des 44 cartes du lot n'est concernée
- Site public (`main`) : **inchangé**

**Attention** : les URL de production `https://tandroskreel.github.io/heroscape-france/assets/cartes/vf/...` ne seront accessibles qu'après publication des images sur la branche servie par GitHub Pages. Les modifications ne sont pour l'instant que sur la branche de préparation.

Le fichier `lot_44_liens_vf.csv` permet d'auditer les liens précédents et futurs.

La validation restante concerne 479 images non incluses dans ce lot, dont plusieurs variantes, collisions ou traductions à confirmer.
