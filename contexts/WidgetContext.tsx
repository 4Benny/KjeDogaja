import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

// Expo Go does not include iOS widget native modules.
// Importing @bacons/apple-targets at top-level can crash/hang the app.
// This context is a no-op unless running on iOS AND the module is available.

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

function safeReloadWidget() {
  if (Platform.OS !== "ios") return;

  try {
    // Dynamic require to avoid crashing Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@bacons/apple-targets") as { ExtensionStorage?: any };
    if (mod?.ExtensionStorage?.reloadWidget) {
      mod.ExtensionStorage.reloadWidget();
    }
  } catch {
    // Module not available (Expo Go). Ignore.
  }
}

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    safeReloadWidget();
  }, []);

  const refreshWidget = useCallback(() => {
    safeReloadWidget();
  }, []);

  return <WidgetContext.Provider value={{ refreshWidget }}>{children}</WidgetContext.Provider>;
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};