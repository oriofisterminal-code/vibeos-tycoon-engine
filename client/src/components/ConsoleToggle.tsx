/**
 * Console Toggle Button
 * 
 * Floating button to open/close the dev console
 * Shows unread error count when console is closed
 */

import { useEffect, useState } from "react";
import { devConsole, type ConsoleState } from "@/lib/devConsole";
import { Button } from "@/components/ui/button";
import { Terminal } from "lucide-react";

export function ConsoleToggle() {
  const [state, setState] = useState<ConsoleState>(devConsole.getState());
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const unsubscribe = devConsole.subscribe(newState => {
      setState(newState);

      // Count unread errors when console is closed
      if (!newState.isOpen) {
        const stats = devConsole.getStats();
        setErrorCount(stats.byLevel.error);
      } else {
        setErrorCount(0);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <Button
      onClick={() => devConsole.toggle()}
      className="fixed bottom-4 right-4 rounded-full w-12 h-12 p-0 z-40 shadow-lg hover:shadow-xl transition"
      title={state.isOpen ? "Close console" : "Open console"}
      variant={state.isOpen ? "default" : "outline"}
    >
      <Terminal className="w-5 h-5" />
      {errorCount > 0 && !state.isOpen && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {errorCount > 9 ? "9+" : errorCount}
        </span>
      )}
    </Button>
  );
}

export default ConsoleToggle;
