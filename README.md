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

Le cloud Linux permet de modifier et de gérer les fichiers. La compilation, les aperçus SwiftUI et le simulateur iOS nécessitent macOS et Xcode ; ils ne sont pas disponibles dans cet environnement.
