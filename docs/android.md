# Android-App

Die Android-App ist die Web-Version in einer Capacitor-Hülle (`android/`, `capacitor.config.ts`).
Spiellogik und Grafik kommen unverändert aus dem Vite-Build.

## Debug-APK

Jeder Push auf `main` startet den Workflow **Android**. Die fertige APK liegt im Lauf unter
*Artifacts → planetforge-debug-apk* (ZIP mit `app-debug.apk`). Auf dem Handy "Installation aus
unbekannten Quellen" erlauben und die APK öffnen.

Lokal (braucht Android SDK + JDK 21):

```sh
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
```

Icons und Splash werden aus `art/src/brand` erzeugt: `npm --prefix scripts/assets run assets:android`.

## Signierte Version für den Play Store

1. Google-Play-Entwicklerkonto anlegen (einmalig 25 $).
2. Keystore erzeugen und **gut sichern** (ohne ihn keine Updates mehr):
   `keytool -genkeypair -v -keystore planetforge.jks -alias planetforge -keyalg RSA -keysize 2048 -validity 10000`
3. In GitHub unter *Settings → Secrets and variables → Actions* anlegen:
   - `ANDROID_KEYSTORE_BASE64` = Ausgabe von `base64 -w0 planetforge.jks`
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`planetforge`), `ANDROID_KEY_PASSWORD`
4. Danach baut jeder Push auf `main` zusätzlich `planetforge-release-aab` (signiertes App Bundle),
   das in der Play Console hochgeladen wird. Die Versionsnummer zählt automatisch mit der Laufnummer hoch.
