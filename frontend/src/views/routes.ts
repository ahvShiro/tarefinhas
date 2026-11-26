// Page addresses. In Portuguese, like the interface text, because people see them in the address bar.
export const ROUTES = {
  home: '/',
  tasks: '/tarefas',
  /** Choose the tasks of the day, one by one: swipe right to do it, left to leave it in the bank. */
  pick: '/escolher',
  /** The profile screen: photo, name, e-mail. */
  profile: '/perfil',
  /** Admin page of the homepage bubbles. Development only. */
  admin: '/admin',
} as const
