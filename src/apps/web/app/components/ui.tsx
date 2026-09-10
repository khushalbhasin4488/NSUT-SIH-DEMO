import Link from 'next/link';
import React from 'react';
import { Icon } from './icons';
export function PageHeader({eyebrow,title,description,action,actionHref,onAction}:{eyebrow:string;title:string;description?:string;action?:string;actionHref?:string;onAction?:()=>void}){return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action&&(onAction?<button type="button" className="button" onClick={onAction}>{action} <span><Icon name="plus" size={13} /></span></button>:<Link className="button" href={actionHref||'#'}>{action} <span><Icon name="plus" size={13} /></span></Link>)}</div>}
export function Status({children,tone='neutral'}:{children:React.ReactNode;tone?:'green'|'amber'|'red'|'blue'|'neutral'}){return <span className={`status ${tone}`}><i/>{children}</span>}
export function Kpi({label,value,delta,tone=''}:{label:string;value:string;delta?:string;tone?:string}){return <div className="kpi"><span className="kpi-label">{label}</span><strong className={tone}>{value}</strong>{delta&&<span className="kpi-delta">{delta}</span>}</div>}
export function Section({title,action,children}:{title:string;action?:React.ReactNode;children:React.ReactNode}){return <section className="section-card"><div className="section-title"><h2>{title}</h2>{action}</div>{children}</section>}
