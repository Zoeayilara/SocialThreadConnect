import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Default to dark mode to mimic Threads UI
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);
