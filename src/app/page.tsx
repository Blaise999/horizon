"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Fingerprint,
  Globe2,
  Layers3,
  LockKeyhole,
  Menu,
  Plus,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import "./horizon-home.css";

type PreviewTab = "overview" | "transfers" | "activity";

const navLinks = [
  { label: "The platform", href: "#platform" },
  { label: "Why Horizon", href: "#why-horizon" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQs", href: "#faqs" },
];

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`hz-wordmark${light ? " hz-wordmark-light" : ""}`} aria-label="Horizon home">
      <span className="hz-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none" focusable="false">
          <circle cx="20" cy="20" r="18.75" stroke="currentColor" strokeWidth="1.5" opacity=".37" />
          <path d="M8 24.5a12 12 0 0 1 24 0" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M7.5 25.5h25" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="20" cy="17.25" r="3.75" fill="currentColor" />
        </svg>
      </span>
      <span>horizon<span className="hz-wordmark-dot">.</span></span>
    </Link>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="hz-header">
      <div className="hz-container hz-header-inner">
        <Wordmark />
        <nav className="hz-desktop-nav" aria-label="Main navigation">
          {navLinks.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
        <div className="hz-header-actions">
          <Link href="/dashboard/loginpage" className="hz-login">Log in</Link>
          <Link href="/create-account" className="hz-nav-cta">Get started <ArrowUpRight size={16} strokeWidth={2.3} /></Link>
        </div>
        <button
          type="button"
          className="hz-menu-toggle"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-controls="hz-mobile-menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
      {open && <div className="hz-mobile-menu" id="hz-mobile-menu">
        <nav aria-label="Mobile navigation" className="hz-container">
          {navLinks.map((item) => <a href={item.href} onClick={() => setOpen(false)} key={item.href}>{item.label}<ArrowUpRight size={17} /></a>)}
          <div className="hz-mobile-actions">
            <Link href="/dashboard/loginpage" onClick={() => setOpen(false)}>Log in</Link>
            <Link href="/create-account" onClick={() => setOpen(false)}>Create account <ArrowRight size={17}/></Link>
          </div>
        </nav>
      </div>}
    </header>
  );
}

function FlowChart({ light = false }: { light?: boolean }) {
  return (
    <svg className={`hz-chart${light ? " hz-chart-light" : ""}`} viewBox="0 0 470 150" role="img" aria-label="Illustrative balance trend chart">
      <defs>
        <linearGradient id={light ? "hzAreaLight" : "hzArea"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light ? "#3abbaa" : "#8af5dc"} stopOpacity={light ? ".19" : ".28"}/>
          <stop offset="100%" stopColor={light ? "#3abbaa" : "#8af5dc"} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[25, 65, 105, 145].map((y) => <path key={y} d={`M0 ${y}H470`} className="hz-chart-grid" />)}
      <path d="M0 123 C24 126 35 112 58 116 S100 139 125 105 S166 106 191 96 S228 105 250 76 S290 95 318 67 S352 74 380 50 S430 45 470 17 L470 150 L0 150Z" fill={`url(#${light ? "hzAreaLight" : "hzArea"})`} />
      <path d="M0 123 C24 126 35 112 58 116 S100 139 125 105 S166 106 191 96 S228 105 250 76 S290 95 318 67 S352 74 380 50 S430 45 470 17" className="hz-chart-line" fill="none" />
      <circle cx="470" cy="17" r="5" className="hz-chart-point" />
    </svg>
  );
}

function MiniLogo() {
  return <span className="hz-mini-logo" aria-hidden="true"><span /></span>;
}

function HeroProduct() {
  return (
    <div className="hz-hero-visual" aria-label="Illustrative preview of the Horizon dashboard">
      <div className="hz-orbit hz-orbit-one" aria-hidden="true" />
      <div className="hz-orbit hz-orbit-two" aria-hidden="true" />
      <div className="hz-app-window">
        <div className="hz-window-top"><div className="hz-window-title"><MiniLogo /> <span>Overview</span></div><span className="hz-window-top-right"><span className="hz-status-dot"/> Your workspace</span></div>
        <div className="hz-window-body">
          <div className="hz-window-greeting"><span>Good morning, Alex <span aria-hidden="true">✳</span></span><span className="hz-window-date">Account preview</span></div>
          <div className="hz-window-grid">
            <div className="hz-balance-panel">
              <div className="hz-balance-head"><span>Combined account balance</span><span className="hz-balance-mark"><WalletCards size={16}/></span></div>
              <div className="hz-balance-number">$24,680<span>.50</span></div>
              <div className="hz-balance-sub"><span className="hz-positive"><ArrowUpRight size={13} /> Sample view</span><span>USD accounts</span></div>
              <div className="hz-balance-chart"><FlowChart /></div>
              <div className="hz-chart-dates"><span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span></div>
            </div>
            <div className="hz-window-side">
              <div className="hz-quick-tile"><span className="hz-quick-icon"><ArrowUpRight size={18}/></span><span>Transfer request</span><strong>Start new <ArrowRight size={15}/></strong></div>
              <div className="hz-small-account"><span>Savings</span><div>$8,420<span>.00</span></div><span className="hz-account-sub">Illustrative balance</span><div className="hz-account-decor" /></div>
            </div>
          </div>
          <div className="hz-window-list-head"><span>Recent activity</span><span>View all <ArrowUpRight size={13}/></span></div>
          <div className="hz-activity-line"><span className="hz-activity-icon hz-activity-in"><ArrowDownLeft size={17}/></span><span className="hz-activity-label"><strong>Balance adjustment</strong><small>Example entry · Today</small></span><strong className="hz-activity-amount">+$1,250.00</strong></div>
          <div className="hz-activity-line"><span className="hz-activity-icon hz-activity-out"><ArrowUpRight size={17}/></span><span className="hz-activity-label"><strong>Transfer request</strong><small>Example · Awaiting review</small></span><strong className="hz-activity-amount">−$320.00</strong></div>
        </div>
      </div>
      <div className="hz-floating-card" aria-hidden="true">
        <span className="hz-floating-card-top"><MiniLogo/><span>HORIZON</span></span>
        <div className="hz-floating-sun" />
        <span className="hz-floating-card-bottom">A new perspective<br/>on your finances.</span>
      </div>
      <div className="hz-floating-note"><span className="hz-floating-note-icon"><Check size={15}/></span><span><strong>More clarity.</strong><small>Less financial noise.</small></span></div>
      <div className="hz-visual-disclaimer">Product illustration · sample data</div>
    </div>
  );
}

function SectionEyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className={`hz-eyebrow${light ? " hz-eyebrow-light" : ""}`}><span className="hz-eyebrow-square" />{children}</div>;
}

function OverviewBento() {
  return <div className="hz-bento-preview hz-bento-overview-preview" aria-hidden="true">
    <div className="hz-bento-bar"><MiniLogo/><span>My accounts</span><span className="hz-bento-bar-dots"><i/><i/><i/></span></div>
    <div className="hz-bento-account-row"><span><small>Checking</small><strong>$16,260.50</strong></span><span className="hz-account-icon"><WalletCards size={20}/></span></div>
    <div className="hz-bento-account-row"><span><small>Savings</small><strong>$8,420.00</strong></span><span className="hz-account-icon hz-account-icon-green"><Layers3 size={20}/></span></div>
    <div className="hz-bento-bottom-line"><span>All your accounts, at a glance</span><span>USD <ChevronDown size={13}/></span></div>
  </div>;
}

function RequestBento() {
  return <div className="hz-request-stack" aria-hidden="true">
    <div className="hz-request-ring hz-ring-one"/><div className="hz-request-ring hz-ring-two"/>
    <div className="hz-request-card"><div className="hz-request-card-icon"><ArrowUpRight size={23}/></div><span>Transfer request</span><strong>$1,280.00</strong><div className="hz-request-divider"/><span className="hz-request-pill"><Clock3 size={12}/> Pending review</span></div>
  </div>;
}

function FeatureBento() {
  return (
    <section id="platform" className="hz-platform">
      <div className="hz-container">
        <div className="hz-section-heading hz-platform-heading">
          <div><SectionEyebrow>THE PLATFORM</SectionEyebrow><h2>Money moves.<br/><em>Stay in control.</em></h2></div>
          <p>Beautifully organized tools to see what you have, understand what happened, and decide what comes next.</p>
        </div>
        <div className="hz-bento-grid">
          <article className="hz-bento hz-bento-accounts"><div className="hz-bento-copy"><span className="hz-feature-index">01 / OVERVIEW</span><h3>The whole picture.<br/>One simple view.</h3><p>Checking, savings and the details that matter, in one place that makes sense.</p><Link href="/dashboard/dashboard">Explore your dashboard <ArrowUpRight size={17}/></Link></div><OverviewBento /></article>
          <article className="hz-bento hz-bento-transfers"><div className="hz-bento-copy"><span className="hz-feature-index">02 / TRANSFERS</span><h3>Make your next move with clarity.</h3><p>Submit a transfer request and follow its review status without the guesswork.</p><Link href="/dashboard/transfers">Explore transfer requests <ArrowUpRight size={17}/></Link></div><RequestBento /></article>
          <article className="hz-bento hz-bento-activity"><span className="hz-feature-index">03 / ACTIVITY</span><div className="hz-bento-icon hz-bento-icon-blue"><Activity size={27}/></div><h3>Every detail, accounted for.</h3><p>Understand your ledger activity and separate requests from posted entries.</p><div className="hz-bento-mini-table" aria-hidden="true"><span><i className="hz-list-circle one"/>Account activity</span><span className="hz-bento-line"/><span><i className="hz-list-circle two"/>Review history</span></div></article>
          <article className="hz-bento hz-bento-security"><span className="hz-feature-index">04 / SECURITY</span><div className="hz-bento-icon hz-bento-icon-purple"><Fingerprint size={28}/></div><h3>Built with boundaries.</h3><p>Account access and sensitive financial changes are protected by Supabase authentication and database rules.</p><div className="hz-security-lattice" aria-hidden="true"><ShieldCheck size={56} strokeWidth={1.25}/></div></article>
          <article className="hz-bento hz-bento-flow"><span className="hz-feature-index">05 / EXPERIENCE</span><div className="hz-bento-icon hz-bento-icon-green"><Sparkles size={27}/></div><h3>Less clutter.<br/>More headspace.</h3><p>Thoughtful design that gives the important things more room to breathe.</p><div className="hz-flow-swoosh" aria-hidden="true"><span/><span/><span/></div></article>
        </div>
      </div>
    </section>
  );
}

function ShowcaseContent({ tab }: { tab: PreviewTab }) {
  if (tab === "transfers") return <div className="hz-demo-body">
    <div className="hz-demo-panel-heading"><div><small>Transfers</small><h4>Send with intention.</h4></div><span className="hz-demo-pill"><Clock3 size={13}/> Request workflow</span></div>
    <div className="hz-demo-transfer"><div className="hz-demo-field"><small>Destination</small><strong>Recipient or destination</strong><span>Choose a payment method <ChevronDown size={15}/></span></div><div className="hz-demo-field hz-demo-field-amount"><small>Amount</small><strong>$ 1,280.00</strong><span>USD · Example</span></div></div>
    <div className="hz-demo-process"><span className="hz-done"><CheckCircle2 size={16}/> Submitted</span><span className="hz-process-bar"/><span className="hz-active"><Clock3 size={16}/> Under review</span><span className="hz-process-bar faded"/><span>Decision</span></div>
    <div className="hz-demo-info"><ShieldCheck size={18}/><span>Requests are reviewed before internal ledger updates. This preview does not send real funds.</span></div>
  </div>;
  if (tab === "activity") return <div className="hz-demo-body">
    <div className="hz-demo-panel-heading"><div><small>Activity</small><h4>Know what happened.</h4></div><span className="hz-demo-pill">Example records</span></div>
    <div className="hz-demo-activity-head"><span>ACTIVITY</span><span>STATUS</span><span>AMOUNT</span></div>
    {[
      {name:"Account adjustment", date:"Sample · Today", up:true, status:"Posted", amount:"+$1,250.00"},
      {name:"Transfer request", date:"Sample · Yesterday", up:false, status:"Pending", amount:"−$320.00"},
      {name:"Account adjustment", date:"Sample · Monday", up:true, status:"Posted", amount:"+$840.00"},
    ].map((t, i) => <div className="hz-demo-activity-row" key={i}><div><span className={`hz-demo-tx-icon ${t.up ? "up" : "down"}`}>{t.up ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}</span><span><strong>{t.name}</strong><small>{t.date}</small></span></div><span className={`hz-demo-status ${t.status === "Posted" ? "posted" : "pending"}`}>{t.status}</span><strong>{t.amount}</strong></div>)}
  </div>;
  return <div className="hz-demo-body">
    <div className="hz-demo-panel-heading"><div><small>Overview</small><h4>It all adds up.</h4></div><span className="hz-demo-pill"><span className="hz-status-dot"/> Illustrative view</span></div>
    <div className="hz-demo-overview-cards"><div><span>Total balance</span><strong>$24,680<span>.50</span></strong><small>Checking + savings</small></div><div><span>Account types</span><strong>02</strong><small>In one view</small></div></div>
    <div className="hz-demo-graph"><div><strong>Account overview</strong><span>JAN — JUN</span></div><FlowChart light/></div>
  </div>;
}

const showcaseCopy: Record<PreviewTab, {title: string; description: string; note: string}> = {
  overview: {title: "Everything in view.", description: "Your most important numbers, a cleaner snapshot, and less digging through menus.", note: "A single home for your accounts"},
  transfers: {title: "No more guessing.", description: "Create a request, see where it stands, and follow each step of the review process.", note: "Transparent request statuses"},
  activity: {title: "The details are right there.", description: "Searchable account activity and clear status labels help you keep your records straight.", note: "An organized history, always"},
};

function LivePreview() {
  const [tab, setTab] = useState<PreviewTab>("overview");
  return <section className="hz-interactive" id="experience">
    <div className="hz-container hz-interactive-wrap">
      <div className="hz-interactive-header"><SectionEyebrow light>GET A FEEL FOR IT</SectionEyebrow><h2>See the difference<br/><em>for yourself.</em></h2><p>Switch between the views below for a glimpse of how Horizon keeps the essentials easy to find.</p></div>
      <div className="hz-interactive-grid">
        <div className="hz-preview-options" role="tablist" aria-label="Explore the Horizon interface">
          {(["overview", "transfers", "activity"] as const).map((key, i) => <button
            key={key}
            type="button"
            id={`hz-tab-${key}`}
            role="tab"
            aria-selected={tab === key}
            aria-controls="hz-preview-panel"
            className={`hz-preview-option${tab === key ? " is-active" : ""}`}
            onClick={() => setTab(key)}
          ><span className="hz-preview-option-num">0{i+1}</span><span><strong>{showcaseCopy[key].title}</strong><small>{showcaseCopy[key].description}</small></span><ArrowUpRight size={20}/></button>)}
          <div className="hz-preview-caption"><CheckCircle2 size={17}/>{showcaseCopy[tab].note}</div>
        </div>
        <div className="hz-preview-frame"><div className="hz-demo-browser"><div className="hz-demo-browser-top"><span className="hz-browser-dots"><i/><i/><i/></span><span><MiniLogo/> horizon / {tab}</span><span className="hz-browser-end"><LockKeyhole size={12}/></span></div><div id="hz-preview-panel" role="tabpanel" aria-labelledby={`hz-tab-${tab}`}><ShowcaseContent tab={tab}/></div></div><div className="hz-demo-annotation">Interactive product preview · sample data only</div></div>
      </div>
    </div>
  </section>;
}

const steps = [
  {number:"01", title:"Create your space.", body:"Register your Horizon profile using secure email authentication.", icon:Plus},
  {number:"02", title:"Find your footing.", body:"Head to your dashboard to see your checking and savings ledger accounts.", icon:WalletCards},
  {number:"03", title:"Stay in the know.", body:"Submit requests, monitor decisions, and see your activity in one place.", icon:ArrowRightLeft},
];

function HowItWorks() {
  return <section className="hz-steps" id="how-it-works"><div className="hz-container"><div className="hz-steps-heading"><div><SectionEyebrow>THREE SIMPLE STEPS</SectionEyebrow><h2>Getting started<br/>feels <em>easy.</em></h2></div><p>Your new financial workspace is just a few steps away.</p></div><div className="hz-steps-grid">{steps.map((step) => {const Icon = step.icon; return <article className="hz-step" key={step.number}><span className="hz-step-num">{step.number} <ArrowUpRight size={16}/></span><span className="hz-step-icon"><Icon size={27}/></span><h3>{step.title}</h3><p>{step.body}</p></article>;})}</div><Link href="/create-account" className="hz-steps-link">Get started with Horizon <ArrowRight size={18}/></Link></div></section>;
}

const faqs = [
  { q: "What can I do with Horizon?", a: "You can create a profile, view your internal checking and savings ledger balances, browse account activity, and submit transfer requests for review." },
  { q: "Can I send or receive real bank payments?", a: "Not yet. This version is a financial dashboard prototype. Transfer requests and balances are internal records; no external bank transfer, deposit, card issuance, or live payment processing is connected." },
  { q: "How is my account information protected?", a: "Horizon uses Supabase authentication and database row-level security. Sensitive ledger changes and transfer approvals are handled through role-checked database functions rather than direct browser edits." },
  { q: "Where do I track a transfer request?", a: "Sign in and open Transfers or Activity. Each request displays its status as pending, approved, or rejected, depending on the review outcome." },
  { q: "How do I get help?", a: "Visit the Support section from your dashboard or the public support page. For security, never share your password or secret authentication codes with anyone." },
];

function FrequentlyAsked() {
  return <section className="hz-faq" id="faqs"><div className="hz-container hz-faq-grid"><div className="hz-faq-heading"><SectionEyebrow>GOOD TO KNOW</SectionEyebrow><h2>Questions?<br/><em>Answered.</em></h2><p>Clear answers, just like the rest of your experience.</p><Link href="/support">More questions? Visit support <ArrowUpRight size={17}/></Link></div><div className="hz-faq-list">{faqs.map((faq, i) => <details key={faq.q} className="hz-faq-item" open={i === 0}><summary><span>{faq.q}</span><Plus size={20} className="hz-faq-plus"/></summary><p>{faq.a}</p></details>)}</div></div></section>;
}

function Footer() {
  return <footer className="hz-footer"><div className="hz-container"><div className="hz-footer-upper"><div className="hz-footer-brand"><Wordmark light/><p>More clarity for your money.<br/>More space for what&apos;s next.</p></div><div className="hz-footer-links"><div><strong>Explore</strong><a href="#platform">The platform</a><a href="#why-horizon">Why Horizon</a><a href="#how-it-works">How it works</a><a href="#faqs">FAQs</a></div><div><strong>Your account</strong><Link href="/create-account">Create account</Link><Link href="/dashboard/loginpage">Log in</Link><Link href="/dashboard/dashboard">Dashboard</Link><Link href="/dashboard/transfers">Transfers</Link></div><div><strong>Company</strong><Link href="/about">About</Link><Link href="/security">Security</Link><Link href="/support">Support</Link><Link href="/careers">Careers</Link></div></div></div><div className="hz-footer-disclosure"><ShieldCheck size={17}/><p><strong>About this version:</strong> Horizon is a Supabase-backed financial dashboard prototype. Account balances are internal ledger records, not bank deposits. It does not currently process real payments or issue bank accounts or cards.</p></div><div className="hz-footer-lower"><span>© {new Date().getFullYear()} Horizon. Crafted for a clearer view.</span><span>Built around clarity <span aria-hidden="true">✳</span></span><a href="#top">Back to top ↑</a></div></div></footer>;
}

export default function Page() {
  return <div className="hz-site" id="top"><Header/><main>
    <section className="hz-hero"><div className="hz-hero-glow" aria-hidden="true"/><div className="hz-hero-grid" aria-hidden="true"/><div className="hz-container hz-hero-content"><div className="hz-hero-copy"><div className="hz-hero-tag"><span className="hz-tag-pulse"/> A new perspective on your finances <ArrowUpRight size={13}/></div><h1>Your money.<br/>A better <em>perspective.</em></h1><p>Everything that matters, beautifully in view. Meet the simpler, smarter space to understand your accounts and stay in control of every next move.</p><div className="hz-hero-ctas"><Link href="/create-account" className="hz-button hz-button-primary">Create your account <ArrowUpRight size={19}/></Link><a href="#experience" className="hz-button hz-button-ghost">Explore the experience <ArrowRight size={18}/></a></div><div className="hz-hero-micro"><span><CheckCircle2 size={16}/> A clear account overview</span><span><ShieldCheck size={16}/> Protected account access</span></div></div><HeroProduct/></div><div className="hz-container hz-hero-bottom"><div><span className="hz-hero-bottom-dash"/> BUILT FOR WHAT&apos;S NEXT</div><span>SCROLL TO DISCOVER <span aria-hidden="true">↓</span></span></div></section>
    <div className="hz-value-band"><div className="hz-container hz-value-band-inner"><span>One place.<br/><strong>All your essentials.</strong></span><span className="hz-value-band-divider"/><span><Layers3 size={20}/> Account overview</span><span><ArrowRightLeft size={20}/> Transfer tracking</span><span><Activity size={20}/> Activity insights</span><span><LockKeyhole size={20}/> Secure access</span></div></div>
    <section className="hz-philosophy" id="why-horizon"><div className="hz-container hz-philosophy-grid"><div><SectionEyebrow>MEET YOUR NEW NORMAL</SectionEyebrow><h2>Good finance feels<br/><em>effortless.</em></h2></div><div><p>Money is complicated enough. Your dashboard shouldn&apos;t be. We&apos;ve taken the noise out of the equation and put a clearer, calmer experience in its place.</p><a href="#platform" className="hz-text-link">Get to know Horizon <ArrowUpRight size={18}/></a></div></div></section>
    <FeatureBento/>
    <div className="hz-manifesto"><div className="hz-container"><span>THE HORIZON WAY</span><p>Less noise. <em>More possibility.</em></p><div aria-hidden="true" className="hz-manifesto-sun"><span/></div></div></div>
    <LivePreview/>
    <HowItWorks/>
    <FrequentlyAsked/>
    <section className="hz-final-cta"><div className="hz-container hz-final-content"><div className="hz-final-orbit" aria-hidden="true"/><SectionEyebrow light>YOUR NEXT CHAPTER</SectionEyebrow><h2>A brighter outlook<br/>starts <em>here.</em></h2><p>A better view of your finances is only a few clicks away.</p><div className="hz-final-actions"><Link href="/create-account" className="hz-button hz-button-primary">Get started with Horizon <ArrowUpRight size={19}/></Link><Link href="/dashboard/loginpage" className="hz-button hz-button-ghost">Already a member? Log in <ArrowRight size={18}/></Link></div><div className="hz-final-decoration" aria-hidden="true"><Globe2 size={21}/><span>LOOK FURTHER. MOVE FORWARD.</span></div></div></section>
  </main><Footer/></div>;
}
