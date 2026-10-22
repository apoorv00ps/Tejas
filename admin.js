(function () {
  "use strict";

  var TEAMS = [
    { id: "t1", name: "The Hellfire", short: "THF" },
    { id: "t2", name: "The Demogorgons", short: "TDG" },
    { id: "t3", name: "The Mindflayers", short: "TMF" },
    { id: "t4", name: "The Vecna", short: "TV" },
    { id: "t5", name: "The Upsider", short: "TUP" },
    { id: "t6", name: "The Gatekeepers", short: "TGK" },
    { id: "t7", name: "The Shadow Realms", short: "TSR" },
    { id: "t8", name: "The Guardians", short: "TGU" }
  ];
  var ADMIN_EMAILS = ["apoorv.00ps@gmail.com", "porwalmadhav47@gmail.com"];
  var MIN_SCORE = -999, MAX_SCORE = 9999;
  var $ = function (id) { return document.getElementById(id); };
  var status = $("admin-status"), initialized = false, db, auth, functions, unsubscribe = null;
  var scheduleSynchronizationStarted = false;
  var events = new Map(), bundledEvents = new Map(), liveEventData = {}, drafts = new Map();
  var scheduleLoadPromise = Promise.resolve(false);

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state || "";
  }

  function initFirebase() {
    if (window.location.protocol === "file:") {
      $("setup-notice").textContent = "Please open the admin page from the official website.";
      $("setup-notice").hidden = false;
      $("google-sign-in").disabled = true;
      setStatus("Admin access is unavailable from this page.", "error");
      return;
    }

    var config = window.TEJAS_FIREBASE_CONFIG;
    if (!config || !config.projectId || !window.firebase || !firebase.apps) {
      $("google-sign-in").disabled = true;
      setStatus("Admin access is temporarily unavailable. Please contact the organizer.", "error");
      return;
    }
    try {
      var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      auth = app.auth();
      db = app.database();
      db.ref(".info/connected").on("value", function (snapshot) {
        if (!snapshot.val()) setStatus("Connecting to live scores…");
      });
      functions = app.functions("us-central1");
      initialized = true;
      $("setup-notice").hidden = true;
      setStatus("Admin access is ready.", "ready");
      scheduleLoadPromise = loadBundledSchedule();
    } catch (err) {
      console.error("Admin access initialization failed.", err);
      setStatus("Admin access is temporarily unavailable. Please contact the organizer.", "error");
    }
  }

  function loadBundledSchedule() {
    return fetch("./events.seed.json", { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("Could not fetch events.seed.json (HTTP " + response.status + ").");
      return response.json();
    }).then(function (schedule) {
      var ids = Object.keys(schedule || {});
      if (ids.length !== 96) throw new Error("Expected 96 itinerary events, received " + ids.length + ".");
      var loaded = new Map();
      ids.forEach(function (id) {
        var data = schedule[id];
        if (!data || [1, 2, 3, 4].indexOf(Number(data.day)) === -1 ||
            ["sports", "edufun", "cultural"].indexOf(data.section) === -1 ||
            !data.name || typeof data.name !== "string") {
          throw new Error("The itinerary contains an invalid event: " + id + ".");
        }
        loaded.set(id, {
          id: id,
          day: Number(data.day),
          section: data.section,
          name: data.name,
          time: String(data.time || ""),
          venue: String(data.venue || ""),
          order: Number(data.order) || 0,
          scores: data.scores && typeof data.scores === "object" ? data.scores : {}
        });
      });
      bundledEvents = loaded;
      mergeEvents();
      return true;
    }).catch(function (err) {
      console.error("Could not load the published event list.", err);
      setStatus("Could not load the event list. Please refresh or contact the organizer.", "error");
      return false;
    });
  }

  function mergeEvents() {
    var merged = new Map();
    bundledEvents.forEach(function (event, id) {
      var remote = liveEventData[id];
      var scores = Object.assign({}, event.scores);
      if (remote && remote.scores && typeof remote.scores === "object") {
        TEAMS.forEach(function (team) {
          var score = remote.scores[team.id];
          if (typeof score === "number" && Number.isFinite(score)) scores[team.id] = score;
        });
      }
      merged.set(id, Object.assign({}, event, { scores: scores }));
    });
    events = merged;
    renderEvents();
    renderScoreOverview();
  }

  function authorizeAdmin(credential) {
    var user = credential.user;
    var isGoogleUser = user.providerData.some(function (provider) {
      return provider.providerId === "google.com";
    });
    if (!isGoogleUser || !user.email || !user.emailVerified ||
        ADMIN_EMAILS.indexOf(user.email.trim().toLowerCase()) === -1) {
      var error = new Error("You are not an admin.");
      error.code = "admin/not-authorized";
      throw error;
    }

    $("login-card").hidden = true;
    $("editor").hidden = false;
    $("signed-in-as").textContent = user.email;
    setStatus("Signed in. Scores are ready to edit.", "ready");
    subscribeEvents();
    return Promise.resolve(credential);
  }

  function rejectAdminSignIn(err) {
    var message = err.code === "admin/not-authorized"
      ? "You are not an admin."
      : "Sign-in failed. Please try again.";
    return auth.signOut().then(function () {
      $("login-card").hidden = false;
      $("editor").hidden = true;
      setStatus(message, "error");
    }, function () {
      $("login-card").hidden = false;
      $("editor").hidden = true;
      setStatus(message, "error");
    });
  }

  function signInWithGoogle() {
    if (!initialized) return;
    var button = $("google-sign-in");
    button.disabled = true;
    setStatus("Opening Google sign-in…");
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    auth.signInWithPopup(provider)
      .then(authorizeAdmin)
      .catch(function (err) {
        if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
          setStatus("Google sign-in was cancelled.");
          return;
        }
        return rejectAdminSignIn(err);
      })
      .finally(function () {
        button.disabled = false;
      });
  }

  function subscribeEvents() {
    if (unsubscribe) unsubscribe();
    var eventsRef = db.ref("events");
    function onError(err) {
      console.error("Could not load live scores.", err);
      setStatus("Could not load live scores. Please refresh or contact the organizer.", "error");
    }
    scheduleLoadPromise.then(function () {
      function onValue(snapshot) {
        liveEventData = snapshot.val() || {};
        $("import-schedule").hidden = true;
        mergeEvents();
        if (Object.keys(liveEventData).length > 0) {
          setStatus("Scores are ready. Choose a day and committee to edit.", "ready");
        } else {
          setStatus("The event list is ready. Loading the latest scores…", "ready");
        }
        synchronizeScheduleAutomatically();
      }
      eventsRef.on("value", onValue, onError);
      unsubscribe = function () {
        eventsRef.off("value", onValue);
      };
    });
  }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderEvents() {
    var day = Number($("day-select").value), section = $("committee-select").value;
    var tableHost = $("event-table"), active = document.activeElement;
    var activeCell = active && active.dataset ? active.dataset.cell : null;
    tableHost.replaceChildren();
    var matchingEvents = Array.from(events.values()).filter(function (e) {
      return e.day === day && e.section === section;
    }).sort(function (a, b) { return a.order - b.order || a.name.localeCompare(b.name); });
    var eventSelect = $("event-select"), selectedEvent = eventSelect.value;
    eventSelect.replaceChildren(make("option", "", "Select an event (" + matchingEvents.length + " available)"));
    eventSelect.options[0].value = "";
    matchingEvents.forEach(function (event) {
      var details = [event.venue, event.time].filter(Boolean).join(" · ");
      var option = make("option", "", event.name + (details ? " — " + details : ""));
      option.value = event.id;
      eventSelect.append(option);
    });
    if (matchingEvents.some(function (event) { return event.id === selectedEvent; })) {
      eventSelect.value = selectedEvent;
    } else {
      eventSelect.value = "";
    }
    var teamSelect = $("team-select"), selectedTeam = teamSelect.value;
    teamSelect.replaceChildren(make("option", "", "Select a team"));
    teamSelect.options[0].value = "";
    TEAMS.forEach(function (team) {
      var option = make("option", "", team.name);
      option.value = team.id;
      teamSelect.append(option);
    });
    if (TEAMS.some(function (team) { return team.id === selectedTeam; })) {
      teamSelect.value = selectedTeam;
    } else {
      teamSelect.value = "";
    }

    var selectedEventData = events.get(eventSelect.value);
    var selectedTeamData = TEAMS.filter(function (team) {
      return team.id === teamSelect.value;
    })[0];
    if (!selectedEventData || !selectedTeamData) {
      tableHost.append(make("p", "admin-empty", events.size
        ? "Choose an event and a team to edit that score."
        : "The itinerary schedule is being loaded. If this continues, use Retry schedule sync."));
      $("save-scores").disabled = drafts.size === 0;
      return;
    }

    var table = make("table", "admin-table"), head = make("thead"), headRow = make("tr");
    headRow.append(make("th", "", "Event"), make("th", "", "Team"), make("th", "", "Score"));
    head.append(headRow);
    var body = make("tbody");
    var row = make("tr"), label = make("th", "", selectedEventData.name);
    label.scope = "row";
    if (selectedEventData.time || selectedEventData.venue) {
      label.append(make("span", "admin-event-meta", [selectedEventData.time, selectedEventData.venue].filter(Boolean).join(" · ")));
    }
    row.append(label, make("td", "", selectedTeamData.name));
    var key = selectedEventData.id + "|" + selectedTeamData.id;
    var value = drafts.has(key) ? drafts.get(key) : selectedEventData.scores[selectedTeamData.id];
    var input = make("input");
    input.type = "number";
    input.step = "any";
    input.inputMode = "decimal";
    input.min = String(MIN_SCORE);
    input.max = String(MAX_SCORE);
    input.placeholder = "0";
    input.value = value === null || value === undefined || value === "" ? "0" : String(value);
    input.dataset.cell = key;
    input.setAttribute("aria-label", selectedEventData.name + ", " + selectedTeamData.name + " score");
    input.addEventListener("input", function () {
      drafts.set(key, input.value);
      $("save-scores").disabled = drafts.size === 0;
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        try { saveScores(); }
        catch (err) { setStatus("Could not save score: " + err.message, "error"); }
      }
    });
    var cell = make("td");
    cell.append(input);
    row.append(cell);
    body.append(row);
    table.append(head, body);
    var wrap = make("div", "admin-table-wrap");
    wrap.append(table);
    tableHost.append(wrap);
    $("save-scores").disabled = drafts.size === 0;
    if (activeCell) {
      var restore = Array.from(tableHost.querySelectorAll("[data-cell]")).filter(function (node) {
        return node.dataset.cell === activeCell;
      })[0];
      if (restore) restore.focus();
    }
  }

  function renderScoreOverview() {
    var host = $("score-overview-table");
    if (!host) return;
    host.replaceChildren();

    var day = $("overview-day").value;
    var section = $("overview-committee").value;
    var matchingEvents = Array.from(events.values()).filter(function (event) {
      return (day === "all" || event.day === Number(day)) &&
        (section === "all" || event.section === section);
    }).sort(function (a, b) {
      return a.day - b.day || a.order - b.order || a.name.localeCompare(b.name);
    });

    $("score-overview-count").textContent = matchingEvents.length + " events";
    if (!matchingEvents.length) {
      host.append(make("p", "admin-empty", "No events match these filters."));
      return;
    }

    var table = make("table", "admin-table score-overview-table");
    var head = make("thead"), headRow = make("tr");
    ["Day", "Committee", "Event"].forEach(function (label) {
      var th = make("th", "", label);
      th.scope = "col";
      headRow.append(th);
    });
    TEAMS.forEach(function (team) {
      var th = make("th", "", team.name);
      th.scope = "col";
      th.title = team.name;
      headRow.append(th);
    });
    head.append(headRow);

    var body = make("tbody");
    matchingEvents.forEach(function (event) {
      var row = make("tr");
      row.append(make("td", "", "Day " + event.day));
      row.append(make("td", "", event.section === "edufun" ? "Edufun" :
        event.section.charAt(0).toUpperCase() + event.section.slice(1)));
      var eventCell = make("th", "score-overview-event", event.name);
      eventCell.scope = "row";
      var details = [event.time, event.venue].filter(Boolean).join(" · ");
      if (details) eventCell.append(make("span", "admin-event-meta", details));
      row.append(eventCell);
      TEAMS.forEach(function (team) {
        var score = event.scores[team.id];
        row.append(make("td", "score-overview-value",
          typeof score === "number" && Number.isFinite(score) ? String(score) : "0"));
      });
      body.append(row);
    });

    table.append(head, body);
    var wrap = make("div", "admin-table-wrap score-overview-wrap");
    wrap.append(table);
    host.append(wrap);
  }

  function saveScores() {
    if (!initialized || !drafts.size) return;
    var updates = [];
    drafts.forEach(function (raw, key) {
      var split = key.lastIndexOf("|"), id = key.slice(0, split), team = key.slice(split + 1);
      if (!events.has(id)) throw new Error("An event changed or was removed. Refresh the event list before saving.");
      var value = raw.trim() === "" ? 0 : Number(raw);
      if (!Number.isFinite(value) || value < MIN_SCORE || value > MAX_SCORE) {
        throw new Error("Enter a score from " + MIN_SCORE + " to " + MAX_SCORE + ".");
      }
      updates.push({ eventId: id, teamId: team, score: value });
    });
    var button = $("save-scores");
    button.disabled = true;
    setStatus("Saving score changes…");
    var eventUpdates = new Map();
    updates.forEach(function (update) {
      var eventUpdate = eventUpdates.get(update.eventId);
      if (!eventUpdate) {
        var event = bundledEvents.get(update.eventId);
        if (!event) throw new Error("The selected event is not in the bundled itinerary.");
        var remote = liveEventData[update.eventId] || {};
        eventUpdate = Object.assign({}, event, {
          scores: Object.assign({}, event.scores, remote.scores || {})
        });
        eventUpdates.set(update.eventId, eventUpdate);
      }
      eventUpdate.scores[update.teamId] = update.score;
    });
    var firebaseUpdates = {};
    eventUpdates.forEach(function (event, eventId) {
      firebaseUpdates["events/" + eventId] = event;
    });

    db.ref().update(firebaseUpdates).then(function () {
      updates.forEach(function (update) {
        var event = liveEventData[update.eventId] || bundledEvents.get(update.eventId);
        var scores = Object.assign({}, event.scores || {});
        scores[update.teamId] = update.score;
        liveEventData[update.eventId] = Object.assign({}, event, { scores: scores });
      });
      drafts.clear();
      mergeEvents();
      setStatus("Score changes saved and synchronized.", "ready");
    }).catch(function (err) {
      console.error("Could not save score changes.", err);
      setStatus("Could not save score changes. Please try again or contact the organizer.", "error");
      button.disabled = false;
    });
  }

  function synchronizeScheduleAutomatically() {
    if (scheduleSynchronizationStarted) return;
    scheduleSynchronizationStarted = true;
    synchronizeItinerarySchedule();
  }

  function synchronizeItinerarySchedule() {
    var button = $("import-schedule");
    button.disabled = true;
    button.hidden = true;
    setStatus(events.size ? "Checking the itinerary schedule…" : "Loading the itinerary schedule…");
    functions.httpsCallable("initializeEventSchedule")({}).then(function (result) {
      if (!result.data || result.data.synchronized !== true ||
          !Number.isInteger(result.data.eventCount)) {
        throw new Error("Firebase returned an invalid itinerary sync result.");
      }
      return result;
    }).catch(function (err) {
      console.error("Could not refresh the published event list.", err);
      setStatus("Could not refresh event details. You can still use the published event list; try again later.", "error");
      button.hidden = false;
    }).then(function (result) {
      if (result) {
        setStatus("Event details are up to date. Scores were kept.", "ready");
      }
    }).finally(function () {
      button.disabled = false;
    });
  }

  function signOut() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    auth.signOut().then(function () {
      events.clear();
      drafts.clear();
      $("editor").hidden = true;
      $("login-card").hidden = false;
      renderEvents();
      setStatus("Signed out.", "ready");
    }).catch(function (err) {
      console.error("Could not sign out.", err);
      setStatus("Could not sign out. Please try again.", "error");
    });
  }

  $("google-sign-in").addEventListener("click", signInWithGoogle);
  $("day-select").addEventListener("change", renderEvents);
  $("committee-select").addEventListener("change", renderEvents);
  $("overview-day").addEventListener("change", renderScoreOverview);
  $("overview-committee").addEventListener("change", renderScoreOverview);
  $("event-select").addEventListener("change", renderEvents);
  $("team-select").addEventListener("change", renderEvents);
  $("save-scores").addEventListener("click", function () {
    try { saveScores(); }
    catch (err) { setStatus("Could not save score changes: " + err.message, "error"); }
  });
  $("import-schedule").addEventListener("click", synchronizeItinerarySchedule);
  $("sign-out").addEventListener("click", signOut);
  initFirebase();
})();
