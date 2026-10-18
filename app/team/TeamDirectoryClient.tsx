'use client'

import Image from 'next/image'
import Link from 'next/link'
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
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const colors = [
    '#1a3a5c', '#0f4c75', '#1b262c', '#16213e', '#0a3d62',
    '#1e3a5f', '#2c3e50', '#1a252f', '#2d4059', '#1b2631',
  ]
  const bg = colors[(name.charCodeAt(0) || 0) % colors.length]

  return (
    <div
      className="mx-auto flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white"
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
      className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/10"
      aria-label={`Team member: ${member.displayName}`}
    >
      <div className="mb-4">
        {member.imageUrl && !imgError ? (
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-slate-100">
            <Image
              src={member.imageUrl}
              alt={member.displayName}
              width={80}
              height={80}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <InitialsAvatar name={member.displayName} />
        )}
      </div>

      <h2 className="mb-1 text-lg font-semibold leading-tight text-[#122b49]">
        {member.displayName}
      </h2>

      {member.designation && (
        <p className="mb-2 text-sm font-semibold text-blue-700">
          {member.designation}
        </p>
      )}

      {member.location && (
        <p className="mb-3 flex items-center justify-center gap-1 text-xs uppercase tracking-wider text-slate-500">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {member.location}
        </p>
      )}

      {member.bio && (
        <p className="mb-4 line-clamp-4 text-sm leading-relaxed text-slate-600">
          {member.bio}
        </p>
      )}

      {member.linkedinUrl && (
        <a
          href={member.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-blue-700"
          aria-label={`${member.displayName} on LinkedIn`}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
    <div className="min-h-[60vh] bg-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="team-heading">
        <div className="mb-12 flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              MillionFlats
            </p>
            <h1 id="team-heading" className="mb-3 text-4xl font-bold text-[#122b49]">Our Team</h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600 sm:mx-0">
              Meet the people building MillionFlats.
            </p>
          </div>
          {isTeamAdmin && (
            <Link
              href="/admin/team"
              className="inline-flex items-center justify-center rounded-lg bg-[#122b49] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900"
            >
              Manage Team
            </Link>
          )}
        </div>

        {members.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-24 text-center shadow-sm">
            <p className="text-sm text-slate-600">No active team profiles yet.</p>
            {isTeamAdmin && (
              <Link
                href="/admin/team"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-700 transition-colors hover:text-blue-900"
              >
                Add team members
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
      </section>
    </div>
  )
}
