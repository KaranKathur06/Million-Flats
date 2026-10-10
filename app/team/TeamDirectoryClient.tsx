'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

interface TeamMember {
  id: string
  displayName: string
  designation: string | null
  bio: string | null
  imageUrl: string | null
  linkedinUrl: string | null
  location: string | null
}

interface TeamDirectoryClientProps {
  members: TeamMember[]
  isTeamAdmin: boolean
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // Deterministic color based on name
  const colors = [
    '#1a3a5c', '#0f4c75', '#1b262c', '#16213e', '#0a3d62',
    '#1e3a5f', '#2c3e50', '#1a252f', '#2d4059', '#1b2631',
  ]
  const bg = colors[name.charCodeAt(0) % colors.length]

  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0 mx-auto"
      style={{ backgroundColor: bg }}
      aria-label={`${name} avatar`}
    >
      {initials}
    </div>
  )
}

function MemberCard({ member }: { member: TeamMember }) {
  const [imgError, setImgError] = useState(false)

  return (
    <article
      className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/20 hover:border-white/20"
      aria-label={`Team member: ${member.displayName}`}
    >
      {/* Subtle gradient glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/0 to-indigo-600/0 group-hover:from-blue-600/5 group-hover:to-indigo-600/5 transition-all duration-300 pointer-events-none" />

      {/* Avatar */}
      <div className="mb-4">
        {member.imageUrl && !imgError ? (
          <div className="w-20 h-20 rounded-full overflow-hidden mx-auto border-2 border-white/10">
            <Image
              src={member.imageUrl}
              alt={member.displayName}
              width={80}
              height={80}
              className="object-cover w-full h-full"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <InitialsAvatar name={member.displayName} />
        )}
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-white mb-1 leading-tight">
        {member.displayName}
      </h3>

      {/* Designation */}
      {member.designation && (
        <p className="text-sm font-medium text-blue-400 mb-2">
          {member.designation}
        </p>
      )}

      {/* Location */}
      {member.location && (
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1 justify-center">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {member.location}
        </p>
      )}

      {/* Bio */}
      {member.bio && (
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-4 mb-4">
          {member.bio}
        </p>
      )}

      {/* LinkedIn */}
      {member.linkedinUrl && (
        <a
          href={member.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
          aria-label={`${member.displayName} on LinkedIn`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
          LinkedIn
        </a>
      )}
    </article>
  )
}

export default function TeamDirectoryClient({ members, isTeamAdmin }: TeamDirectoryClientProps) {
  return (
    <div className="min-h-screen bg-[#080e1a]">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm">MillionFlats Internal</span>
          </div>
          {isTeamAdmin && (
            <Link
              href="/admin/team"
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Manage Team
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Page title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-900/20 border border-blue-800/30 rounded-full px-4 py-1.5 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">Internal Access Only</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Our Team</h1>
          <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
            The people building MillionFlats — private to team members only.
          </p>
        </div>

        {/* Members grid */}
        {members.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">No active team profiles yet.</p>
            {isTeamAdmin && (
              <Link
                href="/admin/team"
                className="inline-flex items-center gap-2 mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Add team members →
              </Link>
            )}
          </div>
        ) : (
          <div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            role="list"
            aria-label="Team member directory"
          >
            {members.map((member) => (
              <div key={member.id} role="listitem">
                <MemberCard member={member} />
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-slate-700 mt-16">
          This page is private and not indexed by search engines.{' '}
          {isTeamAdmin && (
            <Link href="/admin/team" className="text-slate-500 hover:text-slate-400 underline underline-offset-2">
              Manage profiles
            </Link>
          )}
        </p>
      </main>
    </div>
  )
}
