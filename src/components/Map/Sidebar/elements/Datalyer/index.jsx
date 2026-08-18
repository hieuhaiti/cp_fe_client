import { SearchEngine } from "./SearchEngine";
import { StyleChange } from "./StyleChange";
import { LayerSelection } from "./LayerSelection";
import FloodScenarioPanel from "./FloodScenarioPanel";

export function DataLayers() {
  return (
    <div className="flex min-w-0 flex-col gap-4 py-1 sm:gap-5 sm:px-1 lg:gap-6">
      {/* Search Section
      <section className="min-w-0 shrink-0">
        <SearchEngine />
      </section>

      <hr className="border-border/80" /> */}

      {/* Kịch bản ngập — độc lập, không chịu sự điều khiển của LayerSelection */}
      <section className="min-w-0 shrink-0">
        <FloodScenarioPanel />
      </section>

      <hr className="border-border/80" />

      {/* Data Layer Section */}
      <section className="min-w-0">
        <LayerSelection />
      </section>

      <hr className="border-border/80" />

      {/* Style Change Section */}
      <section className="min-w-0 pb-1">
        <StyleChange />
      </section>
    </div>
  );
}
