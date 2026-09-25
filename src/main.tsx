import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { AppShell } from "./ui/AppShell";
import { AppContext } from "./ui/hooks";
import "./ui/theme.css";

const app = new App();

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <AppContext value={app}>
      <AppShell />
    </AppContext>
  </StrictMode>,
);
