"use strict";

const admin = require("firebase-admin");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const eventSchedule = require("./data/events.seed.json");

admin.initializeApp({
  databaseURL: "https://tejas-3c29b-default-rtdb.firebaseio.com"
});
const database = admin.database();
const TEAM_IDS = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];
<<<<<<< HEAD
const ADMIN_EMAILS = [
  "apoorv.00ps@gmail.com",
  "porwalmadhav47@gmail.com",
  "2025btechaimldivyanshu20817@poornima.edu.in"
];
=======
const ADMIN_EMAILS = ["apoorv.00ps@gmail.com", "porwalmadhav47@gmail.com", "2025btechaimldivyanshu20817@poornima.edu.in"];
>>>>>>> a77666377864fc253468817d860b44e2f0bde98d

async function requireGoogleUser(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "Sign in with your Firebase account first.");
  }

  const signInProvider = request.auth.token.firebase && request.auth.token.firebase.sign_in_provider;
  if (signInProvider !== "google.com") {
    throw new HttpsError("permission-denied", "Use Google sign-in.");
  }

  const email = request.auth.token.email;
  if (typeof email !== "string" || !email || request.auth.token.email_verified !== true) {
    throw new HttpsError("permission-denied", "Sign in with a verified Google account.");
  }

  if (!ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
    throw new HttpsError("permission-denied", "This Google account is not authorized for admin access.");
  }
}

exports.initializeEventSchedule = onCall({ region: "us-central1", maxInstances: 2 }, async (request) => {
  await requireGoogleUser(request);
  try {
    const defaultScores = Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, 0]));
    const result = await database.ref("events").transaction((current) => {
      const existingEvents = current && typeof current === "object" ? current : {};
      const synchronizedEvents = { ...existingEvents };

      Object.entries(eventSchedule).forEach(([id, event]) => {
        const existing = existingEvents[id] && typeof existingEvents[id] === "object"
          ? existingEvents[id]
          : {};
        const scores = { ...defaultScores };
        TEAM_IDS.forEach((teamId) => {
          const score = existing.scores && existing.scores[teamId];
          if (typeof score === "number" && Number.isFinite(score)) scores[teamId] = score;
        });
        synchronizedEvents[id] = { ...existing, ...event, scores };
      });

      if (JSON.stringify(existingEvents) === JSON.stringify(synchronizedEvents)) return undefined;
      return synchronizedEvents;
    }, undefined, false);

    return {
      synchronized: true,
      changed: result.committed,
      eventCount: Object.keys(eventSchedule).length
    };
  } catch (error) {
    console.error("initializeEventSchedule failed while writing /events:", error);
    throw new HttpsError(
      "internal",
      "The schedule could not be written to Realtime Database. Check the function logs and confirm that the database URL and deployed project are correct."
    );
  }
});
