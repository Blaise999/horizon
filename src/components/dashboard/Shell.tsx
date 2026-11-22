"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode, type ComponentType } from "react";
import { ArrowLeftRight, Bell, ChevronDown, CircleHelp, CreditCard, LayoutDashboard, LogOut, Menu, Settings2, ShieldCheck, X, Activity } from "lucide-react";
import { currentProfile, signOut, type Profile } from "@/libs/horizon";
import "./dashboard.css";

type Item = { href: string; title: string; icon: ComponentType<{size?:number;strokeWidth?:number}> };
const MAIN: Item[] = [
  { href:"/dashboard/dashboard",title:"Overview",icon:LayoutDashboard },
  { href:"/dashboard/transfers",title:"Transfers",icon:ArrowLeftRight },
  { href:"/dashboard/activity",title:"Activity",icon:Activity },
  { href:"/notifications",title:"Notifications",icon:Bell },
];
const OTHER: Item[] = [
  { href:"/dashboard/settings",title:"Settings",icon:Settings2 },
  { href:"/dashboard/support",title:"Help & support",icon:CircleHelp },
];
export function Brand({light=false}:{light?:boolean}) {
  return <Link href="/" className={`hd-brand ${light?"hd-brand-light":""}`} aria-label="Horizon home"><span className="hd-brand-mark"><span>H</span></span><span>horizon<span className="hd-brand-dot">.</span></span></Link>;
}
export function Shell({children,active,title,eyebrow,subtitle}:{children:ReactNode;active?:string;title:string;eyebrow?:string;subtitle?:string}) {
  const path=usePathname(); const router=useRouter();
  const [profile,setProfile]=useState<Profile|null>(null); const [open,setOpen]=useState(false); const [error,setError]=useState("");
  useEffect(()=>{ let live=true; currentProfile().then(p=>{if(live)setProfile(p);}).catch(e=>{if(!live)return; if(String(e?.message).includes("not configured"))setError(e.message); else router.replace("/dashboard/loginpage");}); return ()=>{live=false;}; },[router]);
  const nav=(items:Item[])=>items.map(({href,title,icon:Icon})=><Link href={href} onClick={()=>setOpen(false)} className={`hd-nav-link ${(active||path)===href?"is-active":""}`} key={href}><Icon size={19} strokeWidth={1.8}/><span>{title}</span></Link>);
  if(error)return <div className="hd-boot"><Brand/><h2>Finish connecting Supabase</h2><p>{error}</p><p>See the project README and <code>.env.example</code>.</p></div>;
  if(!profile)return <div className="hd-boot"><div className="hd-spinner"/>Loading your workspace…</div>;
  const initials=((profile.first_name?.[0]||"")+(profile.last_name?.[0]||"")).toUpperCase()||"H";
  return <div className="hd-app"><aside className={`hd-sidebar ${open?"hd-sidebar-open":""}`}>
    <div className="hd-side-top"><Brand light/><button className="hd-mobile-close" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={20}/></button></div>
    <div className="hd-side-label">YOUR WORKSPACE</div><nav className="hd-nav">{nav(MAIN)}</nav>
    <div className="hd-side-label hd-side-label-second">PREFERENCES</div><nav className="hd-nav">{nav(OTHER)}{profile.role==="admin"&&<Link href="/Admin" className="hd-nav-link"><ShieldCheck size={19}/>Admin console</Link>}</nav>
    <div className="hd-side-bottom"><div className="hd-security"><ShieldCheck size={23}/><div><strong>Account workspace</strong><p>Protected by Supabase Auth</p></div></div><button className="hd-logout" onClick={async()=>{await signOut();router.replace("/dashboard/loginpage");}}><LogOut size={17}/>Sign out</button></div>
  </aside>
  {open&&<button aria-label="Close navigation" className="hd-overlay" onClick={()=>setOpen(false)}/>}
  <div className="hd-main"><header className="hd-topbar"><div className="hd-topbar-left"><button className="hd-icon-button hd-menu" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu size={22}/></button><span className="hd-topbar-breadcrumb">Workspace <span>/</span> <strong>{title}</strong></span></div><div className="hd-header-actions"><Link href="/notifications" className="hd-icon-button" aria-label="Notifications"><Bell size={20}/></Link><Link href="/dashboard/settings" className="hd-identity"><span className="hd-avatar">{initials}</span><span className="hd-identity-name">{profile.first_name||"Account"}<small>Personal account</small></span><ChevronDown size={15}/></Link></div></header>
  <main className="hd-content"><div className="hd-page-intro"><div><div className="hd-eyebrow">{eyebrow||"PERSONAL BANKING"}</div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div></div>{children}</main></div></div>;
}
export const usd=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(value)||0);
export const shortDate=(date:string)=>new Date(date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
export const timeAgo=(date:string)=>new Date(date).toLocaleDateString("en-US",{month:"short",day:"numeric"});
export function Status({value}:{value:string}) { return <span className={`hd-status hd-status-${value.toLowerCase()}`}>{value}</span>; }
export function Empty({title,body}:{title:string;body:string}) {return <div className="hd-empty"><div className="hd-empty-icon"><CreditCard size={25}/></div><strong>{title}</strong><p>{body}</p></div>}
