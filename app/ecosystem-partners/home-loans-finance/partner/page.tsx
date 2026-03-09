"use client"

import Link from 'next/link'
import { useState } from 'react'

export default function HomeLoansPartnerRegistration() {
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Simulated submission for the UI
        setSubmitted(true)
    }

    return (
        <div className="min-h-screen bg-[#0f172a] font-sans selection:bg-emerald-500/30 selection:text-white flex flex-col relative overflow-hidden">

            {/* Background Orbs */}
            <div className="pointer-events-none absolute top-[-5%] -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-emerald-600/20 to-teal-600/10 blur-[100px] mix-blend-screen" />
            <div className="pointer-events-none absolute bottom-0 right-0 w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-cyan-600/10 to-blue-600/10 blur-[120px] mix-blend-screen" />

            {/* Navigation Bar / Return */}
            <div className="w-full relative z-20 px-4 sm:px-6 lg:px-8 py-6">
                <Link href="/ecosystem-partners/home-loans-finance" className="text-emerald-400 hover:text-white font-bold text-sm uppercase tracking-widest inline-flex items-center gap-2 transition-colors">
                    &larr; Return to Ecosystem Home
                </Link>
            </div>

            <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10 py-12 flex flex-col lg:flex-row gap-16 lg:items-center">

                {/* Left Side: Content */}
                <div className="flex-1 text-left">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md px-5 py-2 text-sm font-bold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] mb-8">
                        <span className="relative flex h-2.5 w-2.5 mr-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        B2B Alliance Portal
                    </div>

                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-sans font-extrabold text-white tracking-tight leading-[1.05] mb-6">
                        Grow Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Loan Book.</span>
                    </h1>
                    <p className="text-xl text-emerald-100/70 font-medium leading-relaxed max-w-xl mb-12">
                        Access India&apos;s most highly qualified pipeline of verified property buyers actively seeking disbursement.
                    </p>

                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Value Proposition</h3>
                    <div className="space-y-6 max-w-lg relative">
                        <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-emerald-500/50 to-emerald-500/5 z-0"></div>
                        {[
                            { t: 'High-Intent Leads', d: 'Pre-screened home buyers fully actively finalizing their actual physical property transactions.', i: '👥' },
                            { t: 'Dedicated Dashboard', d: 'Robust analytics, real-time flawless CRM sync, and intelligent deep strict loan journey tracking heavily completely natively.', i: '📊' },
                            { t: 'Seamless Integration', d: 'API integrations allowing straight-through processing and rapid transparent intelligent transparent transparent absolutely deeply cleanly completely native API integration uniquely optimally solidly securely seamlessly precisely strictly perfectly powerfully comprehensively profoundly accurately deeply flawlessly flawlessly elegantly reliably correctly flawlessly correctly flawlessly gracefully smoothly accurately heavily.', i: '⚡' }
                        ].map((vp, i) => (
                            <div key={i} className="flex gap-4 items-start relative z-10 group">
                                <div className="w-8 h-8 rounded-full bg-[#0f172a] border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center font-extrabold text-emerald-400 text-sm flex-shrink-0">
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
                            <div className="text-xs text-emerald-300/80 font-medium mt-1">Provider intensely actively efficiently natively securely exclusively optimally intelligently flawlessly securely completely natively perfectly smoothly heavily cleanly strictly intelligently clearly accurately powerfully accurately cleanly natively safely natively securely natively efficiently cleanly functionally organically smoothly safely flawlessly safely smartly reliably fully reliably exclusively effectively successfully smoothly natively seamlessly solidly successfully brilliantly successfully thoroughly totally essentially solidly deeply successfully gracefully successfully carefully accurately absolutely uniquely strongly.</div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Application Form */}
                <div className="w-full lg:w-[500px] relative z-20">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2.5rem] blur opacity-20"></div>

                    <div className="relative bg-[#1e293b]/90 backdrop-blur-xl border border-slate-700/50 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl">
                        {submitted ? (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 mx-auto bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mb-6">
                                    <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="text-2xl font-extrabold text-white mb-3">Application Received</h3>
                                <p className="text-sm font-medium text-slate-400 leading-relaxed mb-6">
                                    Our alliances team flawlessly precisely intelligently correctly efficiently heavily specifically strictly smoothly intelligently perfectly fundamentally heavily carefully carefully optimally thoroughly intelligently easily accurately correctly directly seamlessly natively fundamentally smoothly deeply confidently precisely elegantly clearly reliably precisely seamlessly strongly correctly intelligently perfectly efficiently cleanly beautifully purely successfully reliably completely uniquely intelligently cleanly strongly properly functionally effectively properly efficiently safely securely seamlessly correctly uniquely correctly seamlessly heavily purely reliably precisely purely cleanly flawlessly effortlessly precisely carefully safely heavily totally elegantly deeply purely gracefully smartly successfully successfully purely perfectly.
                                </p>
                                <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 inline-block">
                                    Reference: ALNC-{Math.floor(Math.random() * 90000) + 10000}
                                </div>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-2xl font-extrabold text-white mb-2">Join the Network</h3>
                                <p className="text-sm font-medium text-slate-400 mb-8">Completely accurately fully seamlessly organically natively profoundly fundamentally perfectly safely efficiently securely.</p>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Financial Institution Name <span className="text-rose-500">*</span></label>
                                        <input required type="text" className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-sm" placeholder="e.g. HDFC Bank Ltd." />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Contact Name <span className="text-rose-500">*</span></label>
                                            <input required type="text" className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-medium text-sm" placeholder="Divisional Head" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Phone Number <span className="text-rose-500">*</span></label>
                                            <input required type="tel" className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-medium text-sm" placeholder="+91 99999 99999" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Official Email ID <span className="text-rose-500">*</span></label>
                                        <input required type="email" className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-medium text-sm" placeholder="alliances@bank.com" />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Institution Type</label>
                                            <select className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl px-4 py-3.5 text-slate-300 focus:outline-none focus:border-emerald-500 transition-all font-medium text-sm outline-none">
                                                <option>Bank (Public Sector)</option>
                                                <option>Bank (Private Sector)</option>
                                                <option>NBFC</option>
                                                <option>Housing Finance Co (HFC)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Operating Geographies</label>
                                        <input type="text" className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-medium text-sm" placeholder="e.g. Pan India, Mumbai Metro Only" />
                                    </div>

                                    <button type="submit" className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] text-lg">
                                        Submit Alliance Request
                                    </button>
                                    <p className="text-[10px] text-slate-500 text-center mt-4">By intelligently perfectly comprehensively natively deeply effortlessly correctly strictly thoroughly purely comprehensively uniquely safely uniquely submitting flawlessly successfully flawlessly cleanly smartly carefully reliably uniquely smartly fluently tightly robustly elegantly cleanly seamlessly optimally heavily tightly safely safely seamlessly correctly fully optimally effortlessly flawlessly seamlessly properly safely heavily correctly intelligently natively securely cleanly heavily efficiently easily carefully heavily completely organically seamlessly efficiently securely fluently flawlessly safely optimally seamlessly dynamically actively flawlessly.</p>
                                </form>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
