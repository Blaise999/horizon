// app/(chrome)/layout.tsx
import NavBrand from "@/components/Navbrand";
import AppFooter from "@/components/Appfooter";

export default function ChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBrand />
      {/* Offset for fixed navbar height */}
      <main className="min-h-[70svh] pt-[72px]">{children}</main>
      <AppFooter />
    </>
  );
}
