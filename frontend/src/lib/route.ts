import { useEffect, useState } from "react";

export type Route =
  | { page: "dashboard" }
  | { page: "meter"; id: number }
  | { page: "tariffs"; id: number }
  | { page: "billing"; id: number };

function parse(hash: string): Route {
  const m = /^#\/meters\/(\d+)(?:\/(tariffs|billing))?$/.exec(hash);
  if (!m) return { page: "dashboard" };
  const id = Number(m[1]);
  if (m[2] === "tariffs") return { page: "tariffs", id };
  if (m[2] === "billing") return { page: "billing", id };
  return { page: "meter", id };
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function useRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const update = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}
