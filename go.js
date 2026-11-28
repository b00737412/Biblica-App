// Liens de biblica-app.com : chaque visiteur part tout de suite vers sa boutique
// (iPhone, iPad -> App Store ; Android -> Google Play dès la sortie ; ordinateur ->
// accueil), et la visite est comptée avec sa source, sans cookie ni adresse IP.
//
// Utilisation : <script src="/go.js" data-source="instagram"></script> sur un lien
// court, <script src="/go.js" data-page="accueil"></script> sur l'accueil.
// Source : data-source, sinon ?s=..., sinon "direct".
(function () {
  "use strict";

  var APP_STORE_ID = "6773479188";
  // Identifiant fournisseur (pt) d'App Store Connect : sans lui, Apple ne compte
  // pas les campagnes (ct). App Store Connect > Analytics > Acquisition > Campaigns.
  var APPLE_PT = "128954682";
  // Le jour de la sortie Android : "com.biblica.app".
  var GOOGLE_PLAY_ID = "";
  var SUPABASE_URL = "https://dqntclfyjuxnivnuslps.supabase.co";
  // Clé publishable (publique par nature, la même que dans l'app) : elle ne permet
  // que d'ajouter une visite, pas de relire la table.
  var SUPABASE_KEY = "sb_publishable_DWBGGSDfycRVrO28dN_YMA_X6USiaHR";

  var script = document.currentScript;
  var page = (script && script.getAttribute("data-page")) || "lien";
  var params = new URLSearchParams(location.search);

  function clean(value, max) {
    var v = String(value || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, max);
    return v || null;
  }

  var source = clean(script && script.getAttribute("data-source"), 40) || clean(params.get("s"), 40) || "direct";

  var ua = navigator.userAgent || "";
  // iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile.
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var platform = isIOS ? "ios" : isAndroid ? "android" : "desktop";

  // Application qui a ouvert le lien (navigateur intégré).
  var inApp =
    /Instagram/i.test(ua) ? "instagram" :
    /musical_ly|BytedanceWebview|TikTok/i.test(ua) ? "tiktok" :
    /FBAN|FBAV|FB_IAB/i.test(ua) ? "facebook" :
    /Snapchat/i.test(ua) ? "snapchat" :
    /LinkedInApp/i.test(ua) ? "linkedin" :
    /Twitter/i.test(ua) ? "x" : null;

  var referrerHost = null;
  try { if (document.referrer) referrerHost = new URL(document.referrer).hostname.slice(0, 100); } catch (e) {}
  var internal = referrerHost === location.hostname;

  var appStoreUrl = "https://apps.apple.com/app/apple-store/id" + APP_STORE_ID + "?" +
    (APPLE_PT ? "pt=" + APPLE_PT + "&" : "") + "ct=" + source + "&mt=8";
  var playUrl = GOOGLE_PLAY_ID
    ? "https://play.google.com/store/apps/details?id=" + GOOGLE_PLAY_ID +
      "&referrer=" + encodeURIComponent("utm_source=" + source + "&utm_medium=lien")
    : "";
  var target = isIOS ? appStoreUrl : (isAndroid && playUrl) ? playUrl : null;
  var destination = isIOS ? "app_store" : target ? "google_play" : "site";

  window.BIBLICA = { source: source, platform: platform, appStoreUrl: appStoreUrl, playUrl: playUrl };

  function log() {
    try {
      return fetch(SUPABASE_URL + "/rest/v1/LINK_VISIT", {
        method: "POST",
        keepalive: true,
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          source: source,
          platform: platform,
          in_app: inApp,
          referrer_host: referrerHost,
          lang: (navigator.language || "").slice(0, 12) || null,
          destination: destination
        })
      }).catch(function () {});
    } catch (e) {
      return Promise.resolve();
    }
  }

  // Part dès que la visite est enregistrée, au plus tard après 700 ms.
  function go(url) {
    var gone = false;
    function leave() { if (!gone) { gone = true; location.replace(url); } }
    log().then(leave);
    setTimeout(leave, 700);
  }

  function tidyUrl() {
    if (params.has("s") && history.replaceState) history.replaceState(null, "", location.pathname);
  }

  if (target) {
    // Rien à afficher : le visiteur part vers sa boutique.
    document.documentElement.className += " going";
    go(target);
  } else if (page === "accueil") {
    // Arrivée depuis un lien court : déjà comptée là-bas.
    if (!internal) log();
    tidyUrl();
  } else {
    go("/?s=" + source);
  }
})();
