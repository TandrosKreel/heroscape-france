# Hébergement des images VF — étape d'import (23 octobre 2026)

## État

- 523 WebP HD et 523 miniatures vérifiés techniquement (1046 fichiers, aucune erreur de lecture).
- Taille totale des WebP HD : 286 886 846 octets.
- Taille totale des miniatures : 15 241 100 octets.
- 277 HD ont une largeur ≥ 1400 px ; 74 HD ont une largeur < 700 px.
- L'archive de transfert `Heroscape_France_Images_VF_Pour_GitHub.zip` a été préparée dans la conversation ChatGPT, **mais elle n'est pas encore hébergée dans le dépôt**.
- Ne pas modifier `data/cards.json`, les liens VO, l'interface HTML/CSS, ni Supabase pendant cet import.

## Import sur la branche de préparation uniquement

1. Télécharger l'archive `Heroscape_France_Images_VF_Pour_GitHub.zip` fournie dans la conversation.
2. Avec GitHub Desktop, cloner `TandrosKreel/heroscape-france` et sélectionner la branche existante `preparation-correspondances-cartes-20261022`.
3. Extraire l'archive dans la racine du dépôt local, en conservant les dossiers `assets/cartes/vf/` et `assets/cartes/miniatures/`. Les fichiers `inventaire_webp_523.csv`, `controle_images.json` et `LISEZ_MOI_IMPORT.txt` sont documentaires.
4. Vérifier que GitHub Desktop montre bien **1046 fichiers WebP ajoutés** et qu'aucun fichier existant n'a été modifié.
5. Faire un commit sur cette branche de préparation puis « Push origin ». **Ne pas fusionner vers `main` à cette étape.**

Les WebP sont déjà optimisés. Ne pas les redimensionner ni les recomprimer.

## Vérifications après l'import

- Contrôler quelques URL brutes `https://raw.githubusercontent.com/TandrosKreel/heroscape-france/preparation-correspondances-cartes-20261022/assets/cartes/vf/<image_id>.webp`.
- Confirmer que les 523 HD et les 523 miniatures sont accessibles.
- Résoudre les 21 images non associées et les 6 références ayant plusieurs images candidates.
- Valider les versions (V1/V2/AoA) et les caractéristiques avant toute substitution.
- Lors de la future mise en production, tenir compte des surcharges de `army_card_edits` dans Supabase, qui peuvent prévaloir sur `data/cards.json`. Ne pas écraser ces personnalisations à l'aveugle.

## Important

L'import des images **n'active pas** les nouveaux liens VF. La migration des liens sera une opération séparée, vérifiée et réversible, sans changement de mise en page ni des liens VO.

Un script de contrôle facultatif `preparation/cartes/import_webp_vf.py` est également disponible sur cette branche.
