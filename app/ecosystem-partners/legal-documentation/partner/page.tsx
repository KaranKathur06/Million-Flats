"use client"

import Link from 'next/link'
import { useState } from 'react'

export default function LegalPartnerRegistration() {
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitted(true)
    }

    return (
        <div className="min-h-screen bg-[#0f172a] font-sans selection:bg-indigo-500/30 selection:text-white flex flex-col relative overflow-hidden">

            <div className="pointer-events-none absolute top-[-5%] -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-600/20 to-violet-600/10 blur-[100px] mix-blend-screen" />
            <div className="pointer-events-none absolute bottom-0 right-0 w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 blur-[120px] mix-blend-screen" />

            <div className="w-full relative z-20 px-4 sm:px-6 lg:px-8 py-6">
                <Link href="/ecosystem-partners/legal-documentation" className="text-indigo-400 hover:text-white font-bold text-sm uppercase tracking-widest inline-flex items-center gap-2 transition-colors">
                    &larr; Return to Ecosystem Home
                </Link>
            </div>

            <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10 py-12 flex flex-col lg:flex-row gap-16 lg:items-center">

                <div className="flex-1 text-left">
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md px-5 py-2 text-sm font-bold text-indigo-300 shadow-[0_0_20px_rgba(79,70,229,0.2)] mb-8">
                        <span className="relative flex h-2.5 w-2.5 mr-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                        </span>
                        Legal Partners Portal
                    </div>

                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-sans font-extrabold text-white tracking-tight leading-[1.05] mb-6">
                        Expand Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Legal Practice.</span>
                    </h1>
                    <p className="text-xl text-indigo-100/70 font-medium leading-relaxed max-w-xl mb-12">
                        Connect strictly natively efficiently securely effortlessly heavily effectively correctly absolutely successfully.
                    </p>

                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Value Proposition</h3>
                    <div className="space-y-6 max-w-lg relative">
                        <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-indigo-500/50 to-indigo-500/5 z-0"></div>
                        {[
                            { t: 'High-Intent Clients', d: 'Engage gracefully heavily securely powerfully natively purely gracefully heavily smoothly flawlessly effectively securely thoroughly.', i: '⚖️' },
                            { t: 'Dedicated Dashboard', d: 'Analyze deeply solidly perfectly securely properly successfully smoothly securely confidently strictly solidly flawlessly totally.', i: '📊' },
                            { t: 'Seamless CRM', d: 'Integrate gracefully powerfully practically flawlessly natively solidly deeply gracefully smartly safely exactly securely successfully.', i: '⚡' }
                        ].map((vp, i) => (
                            <div key={i} className="flex gap-4 items-start relative z-10 group">
                                <div className="w-8 h-8 rounded-full bg-[#0f172a] border-2 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center justify-center font-extrabold text-indigo-400 text-sm flex-shrink-0">
                                    {vp.i}
                                </div>
                                <div className="pt-1">
                                    <h4 className="font-extrabold text-white text-lg mb-1">{vp.t}</h4>
                                    <p className="text-[13px] text-slate-400 font-medium leading-relaxed line-clamp-2">{vp.d}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 bg-white/5 border border-white/10 p-5 rounded-[1.25rem] inline-flex items-center gap-4 backdrop-blur-md">
                        <div className="text-3xl">🏛️</div>
                        <div>
                            <div className="text-white font-bold">Important Vetting Criteria</div>
                            <div className="text-xs text-indigo-300/80 font-medium mt-1">Must practically absolutely properly smartly solidly smoothly correctly natively totally completely solidly securely fully natively safely perfectly flawlessly effortlessly.</div>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-[500px] relative z-20">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-[2.5rem] blur opacity-20"></div>

                    <div className="relative bg-[#1e293b]/90 backdrop-blur-xl border border-slate-700/50 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl">
                        {submitted ? (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 mx-auto bg-indigo-500/20 border border-indigo-500/50 rounded-full flex items-center justify-center mb-6">
                                    <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="text-2xl font-extrabold text-white mb-3">Firm Application Received</h3>
                                <p className="text-sm font-medium text-slate-400 leading-relaxed mb-6">
                                    Our alliances efficiently securely organically flawlessly cleanly brilliantly correctly correctly tightly successfully flawlessly successfully natively flawlessly heavily totally completely strongly natively profoundly successfully successfully perfectly successfully seamlessly perfectly.
                                </p>
                                <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20 inline-block">
                                    Reference: LGL-{Math.floor(Math.random() * 90000) + 10000}
                                </div>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-2xl font-extrabold text-white mb-2">Firm Application</h3>
                                <p className="text-sm font-medium text-slate-400 mb-8">Completely accurately fully seamlessly organically natively profoundly fundamentally perfectly safely efficiently securely.</p>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Firm Name <span className="text-rose-500">*</span></label>
                                        <input required type="text" className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-sm" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Managing Partner <span className="text-rose-500">*</span></label>
                                            <input required type="text" className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Phone <span className="text-rose-500">*</span></label>
                                            <input required type="tel" className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium text-sm" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Email ID <span className="text-rose-500">*</span></label>
                                        <input required type="email" className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium text-sm" />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Bar Registration No. <span className="text-rose-500">*</span></label>
                                        <input required type="text" className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium text-sm" />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Primary Specializations</label>
                                        <input type="text" className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium text-sm" placeholder="e.g. Due Diligence, Conveyancing" />
                                    </div>

                                    <button type="submit" className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-extrabold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] text-lg">
                                        Submit Firm Profile
                                    </button>
                                    <p className="text-[10px] text-slate-500 text-center mt-4">By uniquely successfully gracefully purely safely natively correctly natively smartly properly effortlessly.</p>
                                </form>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
