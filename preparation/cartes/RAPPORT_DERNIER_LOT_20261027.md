# Dernières cartes — audit des trois archives (27 octobre 2026)

## Bilan
- 80 fichiers images examinés dans 3 ZIP utilisateur.
- 11 unités absentes du catalogue de 533 cartes, à créer.
- 3 cartes déjà présentes sans image VF, à compléter.
- Nombre prévu après publication : 544 cartes, sans doublon.
- 18 images HD WebP + 18 miniatures préparées dans le ZIP livré à l'utilisateur : 8 VF, 10 VO.
- 6 nouvelles unités ne possèdent qu'une image anglaise ; ne pas inventer une VF.
- Le glyphe Bloodcursed Blade / Lame maudite n'est pas ajouté : l'utilisateur souhaite traiter les glyphes plus tard.

## 11 nouvelles cartes
| Nom | Général | Coût | Slug VF | Slug VO |
|---|---|---:|---|---|
| Champion of Scaeda | Jandar | 165 | champion-de-scaeda | champion-de-scaeda |
| Knights of Scaeda | Aquilla | 65 | chevaliers-de-scaeda | chevaliers-de-scaeda |
| Defletacron | Vydar | 25 | defletacron | — |
| Head Warden Lermek | Vydar | 65 | lermek-chef-de-la-garde | lermek-chef-de-la-garde |
| Mage of Scaeda | Utgar | 95 | mage-de-scaeda | mage-de-scaeda |
| Associates of Volarak | Volarak | 85 | — | associates-of-volarak |
| Dr. Valentina Lockhart | Vydar | 85 | — | dr-valentina-lockhart |
| Dr. Harlan Eisen | Vydar | 70 | — | dr-harlan-eisen |
| Seelie Courtiers | Ullar | 50 | — | seelie-courtiers |
| Taega the Kyrie Warrior | Volarak | 95 | — | taega-the-kyrie-warrior |
| Oberon | Ullar | 100 | — | oberon |

## 3 VF manquantes complétées
- Frizzt Galagan (Jandar, 35) : `frizzt-galagan.webp`
- Concan the Kyrie Warrior (2.0) (Jandar, 100) : `concan-le-guerrier-kyrie-v2.webp`
- Taelord the Kyrie Warrior (2.0) (Utgar, 120) : `taelord-le-guerrier-kyrie-v2.webp`

## Publication
La branche `preparation-correspondances-cartes-20261022` contient la version préparée de `data/cards.json` (544 cartes), **mais les fichiers WebP ne sont pas encore sur GitHub**. Ne pas fusionner sur `main` avant l'envoi des 36 fichiers WebP depuis le ZIP fourni.

Dossiers à alimenter : `assets/cartes/vf`, `assets/cartes/vo`, `assets/cartes/miniatures`, `assets/cartes/miniatures-vo`. Les anciens fichiers ne doivent pas être supprimés.

Après envoi : vérifier les 18 chemins HD, les 18 miniatures, les 544 noms uniques, les 3 mises à jour VF, et publier exclusivement les fichiers prévus sur `main`. Aucun changement du HTML/CSS/JS, des glyphes ou de Supabase.
