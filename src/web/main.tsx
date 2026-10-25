import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ConfirmProvider } from "./components/common";
import { ThemeProvider } from "./theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <ConfirmProvider>
          <App />
          <Toaster position="top-center" richColors />
        </ConfirmProvider>
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
