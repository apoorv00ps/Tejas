/* Data store for scores. `makeDbStore` wraps a Firebase Realtime Database
 * reference with per-event write queues and a live subscription. */

/* Queue writes per event id so rapid edits never race each other. */
export function makeDbStore(database) {
  var eventsRef = database.ref("events"), chains = new Map();
  function run(id, fn) {
    var p = (chains.get(id) || Promise.resolve()).catch(function () {}).then(fn);
    chains.set(id, p);
    return p;
  }
  return {
    mode: "live",
    subscribe: function (cb, err) {
      function onValue(snapshot) {
        var m = new Map();
        var value = snapshot.val() || {};
        Object.keys(value).forEach(function (id) { m.set(id, value[id]); });
        cb(m);
      }
      eventsRef.on("value", onValue, err);
      return function () { eventsRef.off("value", onValue); };
    },
    setEvent: function (id, d) { return run(id, function () { return eventsRef.child(id).set(d); }); },
    setScore: function (id, t, v) {
      return run(id, function () { return eventsRef.child(id).child("scores").child(t).set(v); });
    },
    setScores: function (id, obj) { return run(id, function () { return eventsRef.child(id).child("scores").set(obj); }); },
    remove: function (id) { return run(id, function () { return eventsRef.child(id).remove(); }); }
  };
}
