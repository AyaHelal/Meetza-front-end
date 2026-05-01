import lottie from "lottie-web";

const MINIMAL_LOTTIE = {
  v: "5.5.7",
  fr: 60,
  ip: 0,
  op: 1,
  w: 64,
  h: 64,
  nm: "guard",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 1,
      nm: "solid",
      sr: 1,
      ks: {
        o: { a: 0, k: 100, ix: 11 },
        r: { a: 0, k: 0, ix: 10 },
        p: { a: 0, k: [32, 32, 0], ix: 2 },
        a: { a: 0, k: [32, 32, 0], ix: 1 },
        s: { a: 0, k: [100, 100, 100], ix: 6 },
      },
      ao: 0,
      sw: 64,
      sh: 64,
      sc: "#ffffff",
      ip: 0,
      op: 1,
      st: 0,
      bm: 0,
    },
  ],
};

if (typeof document === "undefined" || !document.body) {
  // No DOM (e.g. some test runners) — skip patch.
} else try {
  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;opacity:0;";
  document.body.appendChild(holder);
  const anim = lottie.loadAnimation({
    container: holder,
    renderer: "svg",
    loop: false,
    autoplay: false,
    animationData: MINIMAL_LOTTIE,
  });
  const proto = Object.getPrototypeOf(anim);
  if (proto && typeof proto.getMarkerData === "function") {
    proto.getMarkerData = function patchedGetMarkerData(markerName) {
      if (!this.markers || !this.markers.length) return null;
      for (let i = 0; i < this.markers.length; i += 1) {
        const marker = this.markers[i];
        if (marker && marker.payload && marker.payload.name === markerName) {
          return marker;
        }
      }
      return null;
    };
  }
  anim.destroy();
  document.body.removeChild(holder);
} catch (e) {
  // If minimal load fails, Lottie still works; only marker navigation could throw in edge cases.
}
