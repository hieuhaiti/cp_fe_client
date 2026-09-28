import { lazy, Suspense } from "react";
import LoadingInline from "@/components/common/LoadingInline";
import Header from "@/components/layout/Header";
import SideBar from "@/components/Map/Sidebar/SideBar";
import IconTrack from "@/components/Map/Sidebar/IconTrack";
import FloatButton from "@/components/common/FloatButton";
import UnSupported from "@/components/common/UnSupported";
import { useIsMobileOrTablet } from "@/hooks/useIsMobileOrTablet";

const MapComponent = lazy(() => import("@/components/Map/MapComponent"));

function MapLayout() {
  const isMobileOrTablet = useIsMobileOrTablet();

  if (isMobileOrTablet) {
    return <UnSupported />;
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <Header />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="relative flex">
          <SideBar />
        </div>

        <div className="relative min-w-0 flex-1">
          <Suspense fallback={<LoadingInline position="center" />}>
            <MapComponent />
          </Suspense>
          <IconTrack />
          <FloatButton />
        </div>
      </div>
    </div>
  );
}

export default MapLayout;
