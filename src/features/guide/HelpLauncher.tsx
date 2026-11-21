import React, { useEffect, useMemo, useState } from "react";
import { Search, X, CircleHelp, Check } from "lucide-react";
import { useGuide } from "./useGuide";
import { grandTour, taskFlows } from "./guideConfig";

export default function HelpLauncher() {
  const guide = useGuide();
  const [search, setSearch] = useState("");
  const [localOpen, setLocalOpen] = useState(false);

  useEffect(() => {
    const open = () => setLocalOpen(true);
    window.addEventListener("lumo-guide-open-menu", open);
    return () => window.removeEventListener("lumo-guide-open-menu", open);
  }, []);

  const open = guide.openMenu || localOpen;
  const setOpen = (value: boolean) => {
    setLocalOpen(value);
    guide.setOpenMenu(value);
  };

  const items = useMemo(() => [
    grandTour,
    ...taskFlows,
  ].filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase())),
  [search]);

  return (
    <>
      <button
        type="button"
        data-guide="help-launcher"
        onClick={() => setOpen(true)}
        className="lumo-help-launcher"
        aria-label="Open tour and tips"
        title="Tour and tips"
      >
        <CircleHelp className="h-5 w-5" />
      </button>

      {open && (
        <aside className="lumo-help-menu" role="dialog" aria-label="Tour and tips">
          <header>
            <div>
              <strong>Tour and tips</strong>
              <span>Guided help</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close help menu">
              <X className="h-4 w-4" />
            </button>
          </header>
          <label className="lumo-help-search">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" />
          </label>
          <nav>
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => item.id === "grand-tour" ? guide.startTour() : guide.startTask(item.id)}
              >
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                {item.id !== "grand-tour" && guide.taskCompleted(item.id) && <Check className="h-4 w-4 text-emerald-600" aria-label="Completed" />}
              </button>
            ))}
          </nav>
          <label className="lumo-help-toggle">
            <input type="checkbox" checked={guide.nudgesDisabled} onChange={(event) => guide.setNudgesDisabled(event.target.checked)} />
            <span>Don't show tips</span>
          </label>
        </aside>
      )}
    </>
  );
}
