export const POST_LOGIN_ACTION_KEY = 'post_login_action'
export const POST_LOGIN_ACTION_LOCK_KEY = 'post_login_action_lock'
export const FAQ_POPUP_LAST_SEEN_KEY = 'faq_popup_last_seen'

export const DEFAULT_FAQ_LEAD_MAGNET_SLUG = 'dubai-real-estate-investor-guide'

export type PostLoginAction =
  | {
      type: 'lead_magnet_download'
      slug: string
      source?: string
      createdAt?: number
    }
