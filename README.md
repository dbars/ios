# IOSApp

Base d’application iOS en SwiftUI, sans dépendance externe.

## Prérequis

- macOS avec Xcode 15 ou ultérieur.
- iOS 17 ou ultérieur (appareil ou simulateur).

## Lancement

Ouvrir `IOSApp.xcodeproj`, sélectionner le schéma `IOSApp` et un simulateur iPhone, puis lancer avec **⌘R**.

Pour un appareil physique, sélectionner votre équipe dans **Signing & Capabilities** et adapter l’identifiant `com.dbars.ios` si nécessaire.

## Vérification sur macOS

```sh
xcodebuild -project IOSApp.xcodeproj -scheme IOSApp -sdk iphonesimulator -configuration Debug -derivedDataPath /tmp/IOSApp-DerivedData CODE_SIGNING_ALLOWED=NO build
```

Le dépôt ne contient pas encore de suite de tests. Vérifier au lancement que l’écran affiche « Bienvenue ».

## Environnement cloud

### Compilation automatique sur GitHub

Le workflow `.github/workflows/ios-build.yml` compile l’application sur un serveur
macOS de GitHub Actions à chaque push sur `main` et pour les pull requests vers
`main`. Aucun Xcode local ni certificat Apple n’est nécessaire pour cette compilation.

Après avoir envoyé ces fichiers sur GitHub :

1. Ouvrir l’onglet **Actions** du dépôt, puis **Build iOS**.
2. Pour lancer manuellement une compilation, cliquer sur **Run workflow**.
3. Après une exécution réussie, télécharger l’artefact **IOSApp-simulator-…**.

L’archive contient une application `.app` destinée au simulateur iOS sur macOS.
Elle ne s’installe pas sur un iPhone et ne constitue pas un `.ipa` signé. Les
diagnostics Xcode sont également disponibles comme artefact ; ce workflow compile
le projet mais n’exécute aucun test, car le dépôt n’en contient pas.

Pour obtenir un `.ipa` installable ou distribuer via TestFlight sans Xcode local,
il faut une étape de signature et d’export sur le serveur macOS, un abonnement
Apple Developer actif, un certificat de distribution et un profil de
provisionnement correspondant à `com.dbars.ios`. TestFlight nécessite aussi une
application App Store Connect et des identifiants d’envoi. Les secrets devront
être enregistrés dans les paramètres sécurisés de GitHub Actions, jamais dans le
dépôt. Cette étape de distribution n’est pas encore configurée.

Les exécutions macOS peuvent consommer le quota ou générer des frais GitHub
Actions selon le forfait et la visibilité du dépôt.

Le cloud Linux permet de modifier et de gérer les fichiers. La compilation, les aperçus SwiftUI et le simulateur iOS nécessitent macOS et Xcode ; ils ne sont pas disponibles dans cet environnement.
