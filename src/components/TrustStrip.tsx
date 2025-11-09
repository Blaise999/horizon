export default function TrustStrip() {
  const items = [
    { label: "PCI-DSS" },
    { label: "FIDO2 / 2FA" },
    { label: "256-bit TLS" },
    { label: "SOC2" },
  ];
  return (
    <section id="help" className="container-x section-pad">
      <div className="hairline mb-6" />
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-[var(--c-text-2)]">
        {items.map(i => (
          <span key={i.label} className="card px-3 py-2 hover:text-white transition-colors">{i.label}</span>
        ))}
      </div>
    </section>
  );
}
