import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

async function bootstrap() {
  try {
    const res = await fetch("/api/config");
    const { publishableKey } = await res.json();
    createRoot(document.getElementById("root")!).render(
      <App publishableKey={publishableKey} />
    );
  } catch (e) {
    console.error("Failed to load config", e);
  }
}

bootstrap();
