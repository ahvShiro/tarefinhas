import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type ForceLink,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'

// Physics of the task bank, after the Obsidian graph. Distances are in flow units (1 = 1 px at zoom 1).
const LINK_DISTANCE = 210 // linked miniTasks rest about this far apart, center to center
const LINK_STRENGTH = 0.6
const CHARGE = -600 // every miniTask pushes the others away
const CHARGE_REACH = 800 // ...but only up to this distance, so far groups do not drift away forever
const GRAVITY = 0.05 // weak pull toward the center: keeps the groups together
const COLLIDE_RADIUS = 100 // a card is 176 px wide (`w-44`): cards never overlap
const DRAG_HEAT = 0.3 // the graph keeps moving while a card is held
const REHEAT = 0.3 // how much the graph moves when a miniTask enters or leaves
const SPAWN_JITTER = 30
const REDUCED_MOTION_TICKS = 300

interface PhysicsNode extends SimulationNodeDatum {
  id: string
}

type PhysicsLink = SimulationLinkDatum<PhysicsNode>

export interface Point {
  x: number
  y: number
}

interface GraphShape {
  nodeIds: string[]
  links: { source: string; target: string }[]
}

function jitter() {
  return (Math.random() - 0.5) * SPAWN_JITTER
}

/**
 * Runs a d3-force simulation for the task bank and returns the position of each node.
 * The simulation keeps its nodes between changes, so a miniTask entering or leaving only nudges the others.
 * It stops by itself when the graph settles, and then calls `onSettle`. With reduced motion it settles at once,
 * without animation.
 */
export function useBankSimulation(
  { nodeIds, links }: GraphShape,
  { reducedMotion, onSettle }: { reducedMotion: boolean; onSettle: () => void },
) {
  const [positions, setPositions] = useState<ReadonlyMap<string, Point>>(() => new Map())
  const simulationRef = useRef<Simulation<PhysicsNode, PhysicsLink> | null>(null)
  const linkForceRef = useRef<ForceLink<PhysicsNode, PhysicsLink> | null>(null)
  const nodesRef = useRef(new Map<string, PhysicsNode>())
  // Where a miniTask that is about to enter the bank should appear (the drop point).
  const spawnRef = useRef(new Map<string, Point>())

  // Only a change in nodes or links restarts the physics, not a new array with the same content.
  const signature = useMemo(
    () => `${nodeIds.join(',')}#${links.map((link) => `${link.source}>${link.target}`).join(',')}`,
    [nodeIds, links],
  )
  const shapeRef = useRef<GraphShape>({ nodeIds, links })
  const onSettleRef = useRef(onSettle)
  useEffect(() => {
    shapeRef.current = { nodeIds, links }
    onSettleRef.current = onSettle
  })

  const publish = useCallback(() => {
    const next = new Map<string, Point>()
    for (const node of nodesRef.current.values()) next.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 })
    setPositions(next)
  }, [])

  useEffect(() => {
    const linkForce = forceLink<PhysicsNode, PhysicsLink>([])
      .id((node) => node.id)
      .distance(LINK_DISTANCE)
      .strength(LINK_STRENGTH)
    const simulation = forceSimulation<PhysicsNode, PhysicsLink>([])
      .force('link', linkForce)
      .force('charge', forceManyBody<PhysicsNode>().strength(CHARGE).distanceMax(CHARGE_REACH))
      .force('x', forceX<PhysicsNode>(0).strength(GRAVITY))
      .force('y', forceY<PhysicsNode>(0).strength(GRAVITY))
      .force('collide', forceCollide<PhysicsNode>(COLLIDE_RADIUS))
      .stop()
    simulation.on('tick', publish)
    simulation.on('end', () => onSettleRef.current())
    simulationRef.current = simulation
    linkForceRef.current = linkForce
    return () => {
      simulation.stop()
      simulationRef.current = null
      linkForceRef.current = null
    }
  }, [publish])

  // Syncs the simulation with the graph: keeps known nodes, adds new ones near a linked node, drops the rest.
  useEffect(() => {
    const simulation = simulationRef.current
    if (!simulation) return
    const { nodeIds: ids, links: graphLinks } = shapeRef.current
    const known = nodesRef.current
    const next = new Map<string, PhysicsNode>()

    for (const id of ids) {
      const existing = known.get(id)
      if (existing) {
        next.set(id, existing)
        continue
      }
      const node: PhysicsNode = { id }
      const spawn = spawnRef.current.get(id)
      spawnRef.current.delete(id)
      const partnerId = graphLinks.find((link) => link.source === id || link.target === id)
      const partner = partnerId && known.get(partnerId.source === id ? partnerId.target : partnerId.source)
      if (spawn) {
        node.x = spawn.x
        node.y = spawn.y
      } else if (partner?.x !== undefined && partner.y !== undefined) {
        node.x = partner.x + jitter()
        node.y = partner.y + jitter()
      }
      // Otherwise d3 places it, around the center.
      next.set(id, node)
    }

    nodesRef.current = next
    simulation.nodes([...next.values()])
    // Fresh link objects: d3 replaces the ids in them with the nodes.
    linkForceRef.current?.links(graphLinks.map((link) => ({ source: link.source, target: link.target })))

    if (reducedMotion) {
      simulation.stop()
      simulation.tick(REDUCED_MOTION_TICKS)
      // Published on the next frame: a state change straight in an effect renders twice.
      const frame = requestAnimationFrame(() => {
        publish()
        onSettleRef.current()
      })
      return () => cancelAnimationFrame(frame)
    }
    simulation.alpha(Math.max(simulation.alpha(), REHEAT)).restart()
  }, [signature, reducedMotion, publish])

  /** Holds a node at a point. The linked nodes follow through the physics. */
  const pin = useCallback(
    (id: string, point: Point) => {
      const node = nodesRef.current.get(id)
      const simulation = simulationRef.current
      if (!node || !simulation) return
      node.fx = point.x
      node.fy = point.y
      if (reducedMotion) {
        node.x = point.x
        node.y = point.y
        publish()
        return
      }
      simulation.alphaTarget(DRAG_HEAT).restart()
    },
    [reducedMotion, publish],
  )

  /** Lets a held node go: it stays where it is and the graph settles around it. */
  const release = useCallback((id: string) => {
    const node = nodesRef.current.get(id)
    if (node) {
      node.fx = null
      node.fy = null
    }
    simulationRef.current?.alphaTarget(0)
  }, [])

  /** Makes a miniTask that is about to enter the bank appear at a point, instead of next to its links. */
  const spawnAt = useCallback((id: string, point: Point) => {
    spawnRef.current.set(id, point)
  }, [])

  return { positions, pin, release, spawnAt }
}
