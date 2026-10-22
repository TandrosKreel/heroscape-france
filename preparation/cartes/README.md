# Correspondances Heroscape France — 22 octobre 2026

Travail préparatoire sur une branche GitHub isolée. Aucun changement de la page en production ni de Supabase.

## Périmètre
- 523 fichiers WebP VF de l'atelier V6
- 531 entrées dans `data/cards.json` du site au moment du contrôle
- 263 images ayant une référence candidate
- 260 images sans référence candidate suffisamment solide
- 30 correspondances candidates avec général et points cohérents
- 6 images en conflit sur une même entrée
- 271 références du site sans image candidate

## Interprétation
Les correspondances sont **des propositions**, pas des validations définitives. Les champs général et coût proviennent du catalogue V6 ; seules 56 images avaient fait l'objet d'une lecture visuelle dans cet atelier. Les noms anglais/français sont rapprochés par identité, petit lexique de traduction, puis similarité textuelle contrôlée par les statistiques. Aucune correspondance n'est créée sur la seule égalité du général et des points.

## Utilisation
- `correspondances_523_images.csv` : une ligne par image, chemin HD et miniature, référence candidate du site, liens existants, justification et statut.
- `couverture_531_cartes_site.csv` : une ligne par entrée du site, indiquant la ou les images candidates.
- Vérifier les lignes `conflit_plusieurs_images`, `candidate_a_verifier` et `non_associee` avant la migration.
- Harmoniser les noms des versions (V1, V2...) sans fusionner des caractéristiques différentes.
- Conserver l'interface de `cartes-armee.html` inchangée. Le futur changement consistera essentiellement à renseigner le champ `fr` avec l'URL de la carte WebP hébergée.

Aucune image n'est téléversée à ce stade et aucune URL VF du site n'est remplacée.
