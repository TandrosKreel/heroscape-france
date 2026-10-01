HEROSCAPE FRANCE — VERSION SIMPLIFIÉE
========================================

Contenu :
- index.html : page principale du forum
- categorie.html : une catégorie cliquable du forum
- sujet.html : consultation/réponse à un sujet
- cartes-armee.html : catalogue consultable des cartes d'armée
- regles.html : page de consultation des règles
- data/cards.json : données du catalogue
- css/style.css : apparence
- js/forum.js : fonctionnement du forum local

UTILISATION
1. Décompresser le ZIP.
2. Ouvrir index.html dans un navigateur.
3. Cliquer sur une catégorie.
4. Créer des sujets : ils sont stockés dans localStorage du navigateur.

IMPORTANT
Le forum local n'est pas encore multi-utilisateur : deux visiteurs n'ont pas la même base de discussions.
Pour un vrai forum public, il faudra remplacer localStorage par une API + base de données.

CARTES D'ARMÉE
Le catalogue fourni sert de base de navigation. Il ne contient pas les scans des cartes.
Pour créer une archive complète, placer les fichiers autorisés dans documents/cartes-armee/ et les référencer depuis les fiches.

RÈGLES
La page fournit une structure consultable. Les PDF historiques doivent être ajoutés avec les droits/permissions appropriés.
