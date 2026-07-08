import { SiteHeader } from "@/components/SiteHeader";
import { TransitStationPricingSkeleton } from "@/components/TransitStationDetail";

export default function ApiTransitDetailLoading() {
  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#2d3435]">
      <div className="sticky top-0 z-40 border-b border-[#dfe4e5] bg-[#f9f9f9]/95 backdrop-blur-[18px]">
        <SiteHeader activeSection="transit" />
      </div>

      <main className="mx-auto max-w-[1500px] px-4 py-6 pb-20 sm:px-5 sm:py-7">
        <div className="mb-5 h-5 w-32 rounded-full bg-[#dde4e5]" />
        <section className="rounded-lg border border-[#dfe4e5] bg-white p-5 shadow-[0_20px_55px_rgba(45,52,53,0.045)]">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <div>
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-[#f2f4f4]" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="h-8 w-48 max-w-full rounded-full bg-[#f2f4f4]" />
                  <div className="h-4 w-24 rounded-full bg-[#e4e9ea]" />
                </div>
              </div>
              <div className="mt-4 h-16 rounded-lg bg-[#f2f4f4]" />
              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-24 rounded-lg border border-[#dfe4e5] bg-white" />
                ))}
              </div>
            </div>
            <div className="h-44 rounded-lg bg-[#f7f9f9] ring-1 ring-[#adb3b4]/15" />
          </div>
        </section>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <TransitStationPricingSkeleton />
          <aside className="hidden space-y-5 lg:block">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-40 rounded-lg border border-[#dfe4e5] bg-white shadow-[0_20px_55px_rgba(45,52,53,0.045)]"
              />
            ))}
          </aside>
        </div>
      </main>
    </div>
  );
}
