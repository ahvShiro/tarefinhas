import { Component, type ReactNode } from 'react'

/**
 * Hides a decoration that fails (for example, the 3D scene without WebGL) instead of letting the error
 * take down the whole page.
 */
export class BackdropBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
