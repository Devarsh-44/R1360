import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useIndex } from "./lib/data";
import { useRoute } from "./lib/router";
import { Home } from "./pages/Home";
import { Lab } from "./pages/Lab";
import { Method } from "./pages/Method";
import { RacePage } from "./pages/Race";
import { Races } from "./pages/Races";
import { Seasons } from "./pages/Seasons";
import "./styles/tokens.css";
import "./styles/app.css";
import { ErrorNote, Footer, Header, Loading } from "./ui";

const TITLES: Record<string, string> = {
  "": "RI360 | Race intelligence from 96,223 F1 laps",
  races: "Races | RI360",
  race: "Race analysis | RI360",
  lab: "Strategy lab | RI360",
  seasons: "Seasons | RI360",
  method: "Method | RI360",
};

function App() {
  const { path, query } = useRoute();
  const { data: index, error } = useIndex();
  const section = path[0] ?? "";
  const key = path.join("/");

  useEffect(() => {
    document.title = TITLES[section] ?? TITLES[""];
  }, [section]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  const int = (v: string | null | undefined) => (v && /^\d+$/.test(v) ? Number(v) : null);

  let page = null;
  if (error) page = <ErrorNote message={error} />;
  else if (!index) page = <Loading />;
  else if (section === "races") page = <Races index={index} year={int(query.get("y"))} />;
  else if (section === "race" && int(path[1]) != null) page = <RacePage index={index} id={int(path[1])!} a={query.get("a")} b={query.get("b")} />;
  else if (section === "lab") page = <Lab index={index} raceId={int(query.get("race"))} driver={query.get("driver")} />;
  else if (section === "seasons") page = <Seasons index={index} year={int(query.get("y"))} />;
  else if (section === "method") page = <Method index={index} />;
  else if (section === "") page = <Home index={index} />;
  else
    page = (
      <div className="wrap empty">
        <div className="display-l">Off track</div>
        <p style={{ marginTop: 12 }}>That page doesn't exist. <a className="link" href="#/">Back to the overview</a></p>
      </div>
    );

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>Skip to content</a>
      <Header section={section === "race" ? "races" : section} />
      <main id="main" tabIndex={-1} style={{ outline: "none" }}>{page}</main>
      <Footer generated={index?.generated} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
