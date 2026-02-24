import { MarketingNav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <MarketingNav />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-12">
        <aside className="hidden w-48 shrink-0 lg:block">
          <DocsSidebar />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
