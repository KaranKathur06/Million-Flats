import { describe, expect, it } from '@jest/globals'
import { leadershipSections } from '../../lib/leadership'

describe('leadership dataset', () => {
  it('exposes the updated executive leadership roster from a single source', () => {
    const names = leadershipSections.flatMap((section) => section.members.map((member: { name: string }) => member.name))

    expect(names).toEqual(
      expect.arrayContaining([
        'Tarique Mansuri',
        'Neelam Mamnani',
        'Carel De Wet',
        'Divesh More',
        'Paresh Dubariya',
        'Karan Kathur',
        'Dharani Shanmugam',
        'Bharat Tank',
      ])
    )

    expect(leadershipSections[0].members[0].title).toBe('Chief Executive Officer')
    expect(leadershipSections[0].members[1].title).toBe('Managing Director')
  })
})
