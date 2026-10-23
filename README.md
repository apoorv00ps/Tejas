# TEJAS scoreboard setup

## Repository layout

Firebase Hosting serves the `public/` directory, and that directory is self-contained. Everything the browser loads — markup, styles, scripts, the Firebase config, the event seed, and the audio assets — lives under `public/`.

```
public/
  index.html                 student scoreboard
  admin.html                 admin score editor
  assets/css/                stylesheets
  assets/js/config/          firebase-config.js (Firebase web config)
  assets/js/student/         student modules (ES modules)
  assets/js/admin/           admin modules (ES modules)
  assets/data/               events.seed.json (92 events, Days 1-3)
  audio/                     tejas-theme.mp3, tejas-winner.mp3
functions/                   Cloud Functions (schedule initializer)
scripts/dev-server.js        zero-dependency local preview server
```

The root-level `index.html`, `admin.html`, `style.css`, `admin.css`, `script.js`, `admin.js`, and `firebase-config.js` were legacy duplicates from before the restructure. They were removed because they were never deployed, nothing in `public/` referenced them, and they had drifted — they still pointed at a deleted `style.css`, embedded the outdated pre-restructure schedule, and included a selector for a day that the canonical itinerary does not contain. Everything they provided now lives under `public/`, and the canonical schedule lives in `public/assets/data/events.seed.json`.

To preview locally, run `node scripts/dev-server.js` and open `http://localhost:8080/`. The server serves `public/` with the correct MIME types so the ES modules load without a build step.

## Access model

The student page (`index.html`) is a read-only live scoreboard by design: `main.js` pins the session to viewer mode on boot, and it has no sign-in. All organizer editing lives on `admin.html`, which is the only page with Google sign-in; approved accounts are enforced by the admin allowlist, the schedule initializer, and the Realtime Database rules.

The **Reveal the winner** button on the student page is a display feature for the closing ceremony, so it remains visible on the public page; it stays disabled until real scores exist in the database. The student modules also retain some dormant organizer scaffolding (score inputs, add-event form, starter schedule loader) that is gated behind the same viewer-mode flag and therefore never renders; it is kept because `buildTable`'s live grid and the admin's write path share that code.

## Firebase setup checklist

`public/assets/js/config/firebase-config.js` contains the Firebase web-app configuration. Firebase web API keys identify the project; Realtime Database rules and Authentication are the access controls.

Complete these steps in the Firebase Console for project `tejas-3c29b`:

1. **Realtime Database:** create a database using the URL in `public/assets/js/config/firebase-config.js` if it does not exist.
2. **Authentication:** enable **Google** under Sign-in providers. Only approved, verified Google accounts can access the admin page and edit scores. Email/password sign-in is not available.
3. **Billing:** Cloud Functions deployment may require upgrading the project to the Firebase Blaze plan.

## Deploy the site and secure backend

The Firebase CLI is not installed in every development environment. Install Node.js 20 or newer, then open PowerShell in this folder and run:

```powershell
npm install -g firebase-tools
firebase login
firebase deploy --project tejas-3c29b
```

Deploy publishes Realtime Database rules, the Cloud Function that synchronizes itinerary event data, and the static site to Firebase Hosting. There is no shared admin gate password. If Firebase CLI prompts to delete the old `verifyAdminAccess` or `verifyAdminGate` function, confirm the deletion.

Only approved, verified Google accounts can access the editor. The client, schedule initializer, and Realtime Database rules all enforce this restriction; rejected accounts receive a generic access-denied message. Event names and schedule fields cannot be edited in the admin page. Deploy from a trusted machine; never commit Firebase service-account credentials.

After deploy, open the Hosting URL printed by Firebase CLI. If sign-in reports an unauthorized domain, add that exact Hosting domain under Authentication → Settings → Authorized domains.

## Load and edit the published schedule

At the Hosting URL, open `admin.html` and select **Continue with Google** using an approved account. The admin loads the 92-event `assets/data/events.seed.json` itinerary for its event selectors, then overlays saved Firebase scores when available. It also synchronizes the published itinerary through the Cloud Function on sign-in, even when `/events` already contains data. This updates event names, times, venues, and ordering while preserving saved scores; missing scores display as `0`. If synchronization fails, all seed events remain selectable. Choose a day, committee, event, and team, enter an integer or floating-point score, then press **Save score** or Enter. The admin writes the selected event metadata and updated scores directly to Realtime Database under rules restricted to verified admin accounts; the student scorecard and standings receive changes through the same live data feed.

If schedule setup reports `functions/internal`, deploy the latest function and inspect **Firebase Console → Functions → Logs** for `initializeEventSchedule failed while writing /events`. Score saving no longer depends on that callable. If saving a score reports `PERMISSION_DENIED`, deploy the updated database rules and confirm the admin is signed in with an approved, verified Google account.

The student fallback and Firebase schedule include the scored Sports, Edufun, and Cultural itinerary entries: 92 events in total — 33 on Day 1, 35 on Day 2, and 24 on Day 3. Each entry includes its day, committee, event name, venue, time, and itinerary order. Students’ Council ceremonies and meals are not scored competitions and are not included in the scoreboard.

Use the deployed Hosting HTTPS URL rather than opening HTML files with `file://`; Google sign-in and score editing require a secure web origin. The admin page disables sign-in when opened as a local file.
