import { useEffect, useState } from "react";

export type Route = { page: "dashboard" } | { page: "meter"; id: number };

function parse(hash: string): Route {
  const m = /^#\/meters\/(\d+)$/.exec(hash);
  return m ? { page: "meter", id: Number(m[1]) } : { page: "dashboard" };
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
