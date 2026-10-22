# Rapprochement V2 — Heroscape France

Branche de préparation uniquement. Aucune modification de la page publique ni de Supabase.

- Références du catalogue actuel : 531
- Images VF : 523
- Correspondances candidates avant V2 : 263
- Nouvelles correspondances par dictionnaire français/anglais : 239
- Images désormais associées à une référence candidate : 502
- Images sans correspondance : 21
- Références du site couvertes par au moins une image candidate : 494
- Références du site sans image candidate : 37
- Références ayant plusieurs images candidates : 6
- Images concernées par ces collisions : 14

## Important

Une traduction plausible **n'est pas une vérification visuelle**. Aucune image n'est validée pour publication. Les caractéristiques, le coût, le général, la version (V1/V2/AoA) et le contenu de l'image doivent être comparés avant remplacement du lien VF.

Les collisions (plusieurs images pour une référence) peuvent être des variantes, des traductions alternatives ou des doublons : elles sont conservées et signalées, sans sélection automatique.

## Fichiers

- `correspondances_523_images_v2.csv` : 523 images et propositions de rattachement
- `couverture_531_cartes_site_v2.csv` : 531 références et couverture
- `non_associees_v2.csv` : images sans correspondance
- `aliases_traduction_v2.csv` : dictionnaire bilingue des propositions

## Exemples de rapprochements

- 12 fusiliers du Caucase → 12th Caucasus Rifles
- 53e snipers de Caroline du Nord → 53rd North Carolina Sharpshooters
- Arbalétriers Ashigaru → Ashigaru Harquebus
- Hydre des marais → Fen Hydra
- Raelin (RotV) → Raelin V1 ; Raelin (SotM) → Raelin V2

## Étape suivante

Examiner les 21 images restantes et arbitrer les 6 références avec plusieurs candidats. Après validation, préparer le stockage WebP et une substitution des liens VF dans `data/cards.json` sans toucher au HTML/CSS ni aux boutons VO.
