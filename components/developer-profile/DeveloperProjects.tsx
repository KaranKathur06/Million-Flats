import Link from 'next/link'
import type { DeveloperProjectCard } from './types'

type DeveloperProjectsProps = {
  projects: DeveloperProjectCard[]
}

export default function DeveloperProjects({ projects }: DeveloperProjectsProps) {
  return (
    <section id="developer-projects" className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">Featured Projects</h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">Explore signature developments from this verified developer.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
              No published projects available for this developer yet.
            </div>
          ) : (
            projects.map((project) => (
              <article
                key={project.id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  <img
                    src={project.image}
                    alt={project.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {project.tag ? (
                    <span className="absolute left-3 top-3 rounded-full bg-primary-700 px-2.5 py-1 text-[11px] font-semibold text-white">
                      {project.tag}
                    </span>
                  ) : null}
                </div>

                <div className="p-4 sm:p-5">
                  <h3 className="line-clamp-2 text-base font-semibold text-dark-blue">{project.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{project.location}</p>

                  {project.startingPrice ? <p className="mt-3 text-sm font-semibold text-primary-700">From {project.startingPrice}</p> : null}
                  {project.status ? <p className="mt-1 text-xs text-gray-500">Status: {project.status}</p> : null}

                  <Link
                    href={`/projects/${project.slug}`}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-dark-blue text-sm font-semibold text-white transition-colors hover:bg-dark-blue/90"
                  >
                    View Project
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
