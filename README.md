# Collections

Application iOS SwiftUI pour classer par thème et consulter les liens de vos
publications Instagram enregistrées. Une version web fonctionnelle permet de
l’utiliser et de la vérifier dans un navigateur, sans Xcode local.

## Fonctionnalités

- Import JSON des contenus enregistrés Instagram ; nouveaux contenus dans « À classer ».
- Ajout manuel d’un lien Instagram, titre et note personnelle.
- Thèmes proposés ou personnalisés, recherche et filtres.
- Modification, suppression locale et ouverture des publications sur Instagram.
- Sauvegarde locale sur l’appareil iOS ou dans le navigateur web.
- Export et réimport de sauvegarde dans la version web.

Il n’y a pas de connexion automatique au compte Instagram, de synchronisation,
ni de téléchargement des photos ou vidéos. Aucun mot de passe Instagram n’est
nécessaire. Les publications sont consultées en ouvrant leurs liens ; les contenus
privés ou supprimés restent soumis aux règles d’accès d’Instagram. Le classement
par thème est manuel. Les bibliothèques iOS et web sont indépendantes.

## Obtenir et importer l’export Instagram

1. Dans Instagram : **Profil → ☰ → Espace Comptes**.
2. Ouvrir **Vos informations et autorisations → Exporter vos informations**
   (ou **Télécharger vos informations**, selon la version).
3. Choisir le compte, l’export vers un appareil et uniquement les
   **Contenus enregistrés / Enregistrements**.
4. Choisir **JSON**, la période **Depuis le début**, puis demander l’export.
5. Quand il est prêt, télécharger et décompresser le ZIP. Chercher le JSON des
   publications enregistrées, souvent nommé `saved_posts.json`.
6. Dans Collections, sélectionner **Importer mon export** ou **Importer un fichier JSON**.

Les libellés et formats Meta peuvent varier. L’import prend en charge les listes
`saved_saved_media`, `saved_posts` et les tableaux d’entrées, avec les liens dans
`string_map_data["Saved on"].href` ou `string_list_data[0].href`. Un export sans
liens exploitables affiche une erreur ; il n’est pas considéré comme importé.
Les doublons sont ignorés, sans effacer les thèmes et notes déjà saisis. Les titres
proviennent de l’export et peuvent être des noms de comptes plutôt que des légendes.

Importer le fichier JSON, pas l’archive ZIP complète. La version web lit le fichier
localement (limite de 20 Mo) et ne l’envoie pas à un serveur. Elle peut aussi
réimporter les sauvegardes `collections-v1` générées par **Sauvegarder**.

## Version web

Depuis la racine du dépôt :

```sh
python3 -m http.server 8080 --bind 0.0.0.0 --directory web-preview
```

Dans un environnement qui expose ce port, ouvrir l’adresse fournie par cet
hébergement. Sur son propre ordinateur, ouvrir `http://localhost:8080`.
On peut également ouvrir `web-preview/index.html` directement dans un navigateur ;
la persistance des pages locales dépend du navigateur. Les fichiers HTML, CSS et
JavaScript doivent rester ensemble dans le dossier `web-preview`.

Aucune dépendance web à installer. Les données sont enregistrées dans le stockage
local du navigateur : effacer ses données, changer d’adresse d’hébergement ou
utiliser la navigation privée peut les faire disparaître. Utiliser **Sauvegarder**
pour conserver un fichier réimportable. En cas de stockage illisible, il est
préservé et une alerte invite à sauvegarder les nouvelles modifications.

Vérifications de la logique web (Node.js 20+) :

```sh
node --check web-preview/app.js
node --test tests/library.test.cjs
```

Les tests utilisent des données synthétiques. Ils couvrent l’import, les doublons,
les URL autorisées, la recherche et les sauvegardes. Ils sont aussi exécutés par
GitHub Actions avant le build iOS.

## Application iOS

Prérequis : **macOS avec Xcode 15+**, appareil ou simulateur **iOS 17+**.
Ouvrir `IOSApp.xcodeproj`, sélectionner le schéma `IOSApp` et un simulateur iPhone,
puis lancer avec **⌘R**. Importer un JSON d’exemple ou son propre export, modifier
un thème, rechercher un contenu et vérifier son ouverture sur Instagram.

Compilation sans signature sur macOS :

```sh
xcodebuild -project IOSApp.xcodeproj -scheme IOSApp -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -configuration Debug -derivedDataPath /tmp/IOSApp-DerivedData CODE_SIGNING_ALLOWED=NO build
```

La bibliothèque iOS est conservée localement dans `UserDefaults`. Elle n’est pas
liée aux enregistrements Instagram : supprimer un lien dans Collections ne supprime
pas son enregistrement sur Instagram. Le dépôt n’a pas de suite de tests iOS ;
une compilation réussie ne remplace pas la vérification des parcours sur simulateur.

## Compilation automatique sur GitHub

Le workflow `.github/workflows/ios-build.yml` compile l’application sur un serveur
macOS de GitHub Actions à chaque push sur `main`, pour les pull requests vers
`main`, ou via **Actions → Build iOS → Run workflow**. Il exécute également les
tests de la bibliothèque web. Aucun Xcode local ni certificat Apple n’est nécessaire.

Après une exécution réussie, télécharger l’artefact **IOSApp-simulator-…**.
Il contient une application `.app` pour le simulateur iOS sur macOS, pas un `.ipa`
installable sur iPhone. Les diagnostics Xcode sont également disponibles.
L’artefact **Collections-web-preview** contient la version web : décompresser
l’archive et ouvrir `index.html` en conservant tous les fichiers dans le même dossier.

La distribution sur iPhone ou via TestFlight exige un abonnement Apple Developer,
un certificat de distribution et un profil de provisionnement correspondant à
`com.dbars.ios`. TestFlight exige aussi une application App Store Connect et des
identifiants d’envoi. Cette étape n’est pas configurée ; les secrets devront être
stockés dans les paramètres sécurisés GitHub, jamais dans le dépôt.

Les exécutions macOS peuvent consommer le quota ou générer des frais GitHub Actions
selon le forfait et la visibilité du dépôt. Le cloud Linux permet l’édition et la
version web ; SwiftUI, les SDK Apple et le simulateur natif restent réservés à macOS.
