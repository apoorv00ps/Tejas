# TEJAS scoreboard setup

## Firebase setup checklist

`firebase-config.js` contains the Firebase web-app configuration. Firebase web API keys identify the project; Realtime Database rules and Authentication are the access controls.

Complete these steps in the Firebase Console for project `tejas-3c29b`:

1. **Realtime Database:** create a database using the URL in `firebase-config.js` if it does not exist.
2. **Authentication:** enable **Google** under Sign-in providers. Only the verified Google account `vampire.v.2.v@gmail.com` can access the admin page and edit scores. Email/password sign-in is not available.
3. **Billing:** Cloud Functions deployment may require upgrading the project to the Firebase Blaze plan.

## Deploy the site and secure backend

The Firebase CLI is not installed in every development environment. Install Node.js 20 or newer, then open PowerShell in this folder and run:

```powershell
npm install -g firebase-tools
firebase login
firebase deploy --project tejas-3c29b
```

Deploy publishes Realtime Database rules, the Cloud Function that synchronizes itinerary event data, and the static site to Firebase Hosting. There is no shared admin gate password. If Firebase CLI prompts to delete the old `verifyAdminAccess` or `verifyAdminGate` function, confirm the deletion.

Only the verified Google account `vampire.v.2.v@gmail.com` can access the editor. The client, schedule initializer, and Realtime Database rules all enforce this restriction; event names and schedule fields cannot be edited in the admin page. Deploy from a trusted machine; never commit Firebase service-account credentials.

After deploy, open the Hosting URL printed by Firebase CLI. If sign-in reports an unauthorized domain, add that exact Hosting domain under Authentication → Settings → Authorized domains.

## Load and edit the published schedule

At the Hosting URL, open `admin.html` and select **Continue with Google** using `vampire.v.2.v@gmail.com`. The admin loads the 96-event `events.seed.json` itinerary for its event selectors, then overlays saved Firebase scores when available. It also synchronizes the published itinerary through the Cloud Function on sign-in, even when `/events` already contains data. This updates event names, times, venues, and ordering while preserving saved scores; missing scores display as `0`. If synchronization fails, all seed events remain selectable. Choose a day, committee, event, and team, enter an integer or floating-point score, then press **Save score** or Enter. The admin writes the selected event metadata and updated scores directly to Realtime Database under rules restricted to the verified admin account; the student scorecard and standings receive changes through the same live data feed.

If schedule setup reports `functions/internal`, deploy the latest function and inspect **Firebase Console → Functions → Logs** for `initializeEventSchedule failed while writing /events`. Score saving no longer depends on that callable. If saving a score reports `PERMISSION_DENIED`, deploy the updated database rules and confirm the admin is signed in with the verified Google account `vampire.v.2.v@gmail.com`.

The student fallback and Firebase schedule include the scored Sports, Edufun, and Cultural itinerary entries: 33 events on Day 1, 37 on Day 2, 13 on Day 3, and 13 on Day 4. Each entry includes its day, committee, event name, venue, time, and itinerary order. Students’ Council ceremonies and meals are not scored competitions and are not included in the scoreboard.

Use the deployed Hosting HTTPS URL rather than opening HTML files with `file://`; Google sign-in and score editing require a secure web origin. The admin page disables sign-in when opened as a local file.
