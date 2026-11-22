"use client";
import type { ReactNode } from "react";
import { Brand } from "./Shell";
import "./dashboard.css";
export function AuthFrame({children}:{children:ReactNode}){return <div className="hd-auth"><aside className="hd-auth-aside"><Brand light/><div style={{position:"relative",zIndex:1}}><div className="hd-eyebrow" style={{color:"#a6b8ff",marginBottom:22}}>SMARTER MONEY MANAGEMENT</div><h1>Banking that puts you in control.</h1><p>An intelligent, effortless space to manage your accounts, understand your spending, and stay on top of every move.</p></div><div style={{color:"#8497b8",fontSize:12}}>© Horizon · Built for clarity</div></aside><main className="hd-auth-content"><div className="hd-auth-card">{children}</div></main></div>}
