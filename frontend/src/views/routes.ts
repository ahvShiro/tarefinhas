// Page addresses. In Portuguese, like the interface text, because people see them in the address bar.
export const ROUTES = {
  home: '/',
  tasks: '/tarefas',
  /** Choose the tasks of the day, one by one: swipe right to do it, left to leave it in the bank. */
  pick: '/escolher',
  /** Photos of the done steps, in columns like Pinterest. */
  gallery: '/galeria',
  /** The profile screen: photo, name, e-mail. */
  profile: '/perfil',
  /** Admin page of the homepage bubbles. Development only. */
  admin: '/admin',
} as const
