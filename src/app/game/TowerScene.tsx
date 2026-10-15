"use client";

import { Physics, useBox, useSphere } from "@react-three/cannon";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import * as THREE from "three";
import {
  MAX_SHOTS,
  LEVELS,
  PER_LEVEL,
  TOTAL_BLOCKS,
  MULTI_KNOCK_BONUS,
  blockLevel,
  blockPoints,
  runBonus,
} from "./score";

export type GameStats = {
  /** Balls fired so far. */
  shots: number;
  /** Balls allowed for the whole run. */
  maxShots: number;
  knocked: number;
  total: number;
  /** Live score, bonuses included once the run ends. */
  score: number;
  /** True once the run is over and the dust has settled. */
  finished: boolean;
};

/* ---------------------------- tuning ---------------------------- */
const BLOCK = { w: 0.9, h: 0.44, d: 0.3 };
const SPACING = BLOCK.d + 0.02;
const LEVEL_HEIGHT = BLOCK.h + 0.01;
const KNOCK_DISTANCE = 0.55;

const BALL_RADIUS = 0.3;
const BALL_SPEED = 23;
const MAX_BALLS = 10;

/** How long to let the tower keep falling after the last shot before scoring. */
const SETTLE_MS = 1400;

const TOTAL = TOTAL_BLOCKS;
const LAUNCH_ORIGIN: [number, number, number] = [0, 2, 7.5];
const BLOCK_COLORS = ["#efe9ff", "#a99fd0", "#6f6796"];

type BlockSpec = {
  id: number;
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
};

type BallSpec = {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
};

/** Jenga-style tower: alternating levels laid along X and Z. */
function buildTower(): BlockSpec[] {
  const specs: BlockSpec[] = [];
  let id = 0;

  for (let level = 0; level < LEVELS; level += 1) {
    const rotate = level % 2 === 1;
    const y = BLOCK.h / 2 + level * LEVEL_HEIGHT;

    for (let slot = 0; slot < PER_LEVEL; slot += 1) {
      const offset = (slot - (PER_LEVEL - 1) / 2) * SPACING;
      const position: [number, number, number] = rotate ? [offset, y, 0] : [0, y, offset];

      specs.push({
        id,
        position,
        rotation: [0, rotate ? Math.PI / 2 : 0, 0],
        color: BLOCK_COLORS[id % BLOCK_COLORS.length],
      });
      id += 1;
    }
  }

  return specs;
}

/* ----------------------------- pieces ----------------------------- */

function Block({ spec, onKnock }: { spec: BlockSpec; onKnock: (id: number) => void }) {
  const [ref, api] = useBox(() => ({
    mass: 1,
    position: spec.position,
    rotation: spec.rotation,
    args: [BLOCK.w, BLOCK.h, BLOCK.d],
    sleepSpeedLimit: 0.15,
  }));

  useEffect(() => {
    const [sx, sy, sz] = spec.position;
    return api.position.subscribe(([x, y, z]) => {
      if (Math.hypot(x - sx, y - sy, z - sz) > KNOCK_DISTANCE) onKnock(spec.id);
    });
  }, [api, onKnock, spec.id, spec.position]);

  return (
    <mesh ref={ref as RefObject<THREE.Mesh>} castShadow receiveShadow>
      <boxGeometry args={[BLOCK.w, BLOCK.h, BLOCK.d]} />
      <meshStandardMaterial color={spec.color} roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

function Ball({ spec }: { spec: BallSpec }) {
  const [ref] = useSphere(() => ({
    mass: 7,
    position: spec.position,
    velocity: spec.velocity,
    args: [BALL_RADIUS],
  }));

  return (
    <mesh ref={ref as RefObject<THREE.Mesh>} castShadow>
      <sphereGeometry args={[BALL_RADIUS, 24, 24]} />
      <meshStandardMaterial
        color="#a855f7"
        emissive="#7c3aed"
        emissiveIntensity={0.55}
        roughness={0.3}
        metalness={0.45}
      />
    </mesh>
  );
}

function Ground() {
  const [ref] = useBox(() => ({ mass: 0, position: [0, -0.5, 0], args: [80, 1, 80] }));

  return (
    <mesh ref={ref as RefObject<THREE.Mesh>} receiveShadow>
      <boxGeometry args={[80, 1, 80]} />
      <meshStandardMaterial color="#171233" roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

/**
 * Invisible pick plane that turns pointer position into an aim point, plus the
 * crosshair ring. The ring is moved inside useFrame so pointer movement does
 * not trigger React re-renders on every event.
 */
function AimTarget({
  aimRef,
  onAim,
  onFire,
}: {
  aimRef: { current: [number, number] };
  onAim: (x: number, y: number) => void;
  onFire: () => void;
}) {
  const markerRef = useRef<THREE.Mesh>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const el = document.querySelector<HTMLCanvasElement>(".game__mount canvas");
    if (!el) return undefined;

    const onDown = () => {
      draggingRef.current = true;
    };
    const onUp = () => {
      draggingRef.current = false;
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  useFrame(() => {
    const marker = markerRef.current;
    if (marker) marker.position.set(aimRef.current[0], aimRef.current[1], 0.01);
  });

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    if (draggingRef.current) return; // orbiting, not aiming
    onAim(
      THREE.MathUtils.clamp(event.point.x, -3, 3),
      THREE.MathUtils.clamp(event.point.y, 0.3, 3.6),
    );
  };

  return (
    <>
      <mesh
        position={[0, 1.8, 0]}
        onPointerMove={handleMove}
        onClick={(event) => {
          if (event.delta < 5) onFire();
        }}
      >
        <planeGeometry args={[16, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh ref={markerRef} renderOrder={999}>
        <ringGeometry args={[0.16, 0.26, 32]} />
        <meshBasicMaterial
          color="#c4b5fd"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>
    </>
  );
}

/**
 * Watches for the end of a run. A run is finished once the balls are spent or
 * the tower is flat — then we wait a beat so blocks still tumbling from the
 * final shot are counted before the bonus is added and the score is frozen.
 */
function RunSettler({
  shotsRef,
  knockedRef,
  scoreRef,
  finishedRef,
  settleAtRef,
  emit,
}: {
  shotsRef: MutableRefObject<number>;
  knockedRef: MutableRefObject<Set<number>>;
  scoreRef: MutableRefObject<number>;
  finishedRef: MutableRefObject<boolean>;
  settleAtRef: MutableRefObject<number | null>;
  emit: () => void;
}) {
  useFrame(() => {
    if (finishedRef.current) return;

    const shotsUsed = shotsRef.current;
    const cleared = knockedRef.current.size >= TOTAL;
    const outOfShots = shotsUsed >= MAX_SHOTS;

    if (!cleared && !outOfShots) {
      settleAtRef.current = null; // run is still live; disarm any pending timer
      return;
    }

    if (settleAtRef.current === null) {
      settleAtRef.current = performance.now();
      return;
    }
    if (performance.now() - settleAtRef.current < SETTLE_MS) return;

    finishedRef.current = true;
    scoreRef.current += runBonus(knockedRef.current.size, shotsUsed);
    emit();
  });

  return null;
}

/* ------------------------------ scene ------------------------------ */

export default function TowerScene({
  onStats,
  resetSignal,
  onReady,
}: {
  onStats: (stats: GameStats) => void;
  resetSignal: number;
  onReady?: () => void;
}) {
  const blocks = useMemo(buildTower, []);
  const [balls, setBalls] = useState<BallSpec[]>([]);
  const [towerKey, setTowerKey] = useState(0);

  const aimRef = useRef<[number, number]>([0, 1.4]);
  const nextBallId = useRef(0);
  const shotsRef = useRef(0);
  const scoreRef = useRef(0);
  const knockedRef = useRef<Set<number>>(new Set());
  const finishedRef = useRef(false);
  const settleAtRef = useRef<number | null>(null);
  /** Blocks brought down by the shot currently in flight, for the combo bonus. */
  const shotKnocksRef = useRef(0);

  const emit = useCallback(() => {
    onStats({
      shots: shotsRef.current,
      maxShots: MAX_SHOTS,
      knocked: knockedRef.current.size,
      total: TOTAL,
      score: scoreRef.current,
      finished: finishedRef.current,
    });
  }, [onStats]);

  const handleKnock = useCallback(
    (id: number) => {
      // Keep counting while the dust settles, but never after the run is scored.
      if (finishedRef.current) return;
      if (knockedRef.current.has(id)) return;
      knockedRef.current.add(id);

      // Landing a shot on more than one block pays a growing bonus.
      if (shotKnocksRef.current > 0) scoreRef.current += MULTI_KNOCK_BONUS;
      shotKnocksRef.current += 1;
      scoreRef.current += blockPoints(blockLevel(id));

      emit();
    },
    [emit],
  );

  const handleAim = useCallback((x: number, y: number) => {
    aimRef.current = [x, y];
  }, []);

  const handleFire = useCallback(() => {
    if (finishedRef.current || shotsRef.current >= MAX_SHOTS) return;

    shotKnocksRef.current = 0; // this shot's tally starts empty
    settleAtRef.current = null; // a new ball is in flight, so nothing is settling

    const direction = new THREE.Vector3(aimRef.current[0], aimRef.current[1], 0)
      .sub(new THREE.Vector3(...LAUNCH_ORIGIN))
      .normalize()
      .multiplyScalar(BALL_SPEED);

    setBalls((prev) =>
      [
        ...prev,
        {
          id: nextBallId.current++,
          position: [...LAUNCH_ORIGIN] as [number, number, number],
          velocity: [direction.x, direction.y, direction.z] as [number, number, number],
        },
      ].slice(-MAX_BALLS),
    );

    shotsRef.current += 1;
    emit();
  }, [emit]);

  useEffect(() => {
    setBalls([]);
    knockedRef.current.clear();
    shotsRef.current = 0;
    scoreRef.current = 0;
    finishedRef.current = false;
    settleAtRef.current = null;
    shotKnocksRef.current = 0;
    setTowerKey((key) => key + 1);
    emit();
  }, [resetSignal, emit]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 7, 13], fov: 50 }}
      onCreated={() => {
        // Wait two frames so the first render has actually been painted.
        requestAnimationFrame(() => requestAnimationFrame(() => onReady?.()));
      }}
    >
      <color attach="background" args={["#0a0812"]} />
      <fog attach="fog" args={["#0a0812", 24, 50]} />

      <hemisphereLight args={["#c4b5fd", "#0a0714", 0.85]} />
      <directionalLight
        position={[6, 11, 7]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <directionalLight position={[-8, 5, -6]} color="#a855f7" intensity={0.6} />

      <gridHelper args={[80, 80, "#3b2f5e", "#191233"]} position={[0, 0.01, 0]} />

      <Physics
        gravity={[0, -9.82, 0]}
        allowSleep
        defaultContactMaterial={{ friction: 0.42, restitution: 0.12 }}
      >
        <Ground />

        <group key={towerKey}>
          {blocks.map((spec) => (
            <Block key={spec.id} spec={spec} onKnock={handleKnock} />
          ))}
        </group>

        {balls.map((ball) => (
          <Ball key={ball.id} spec={ball} />
        ))}

        <AimTarget aimRef={aimRef} onAim={handleAim} onFire={handleFire} />

        <RunSettler
          shotsRef={shotsRef}
          knockedRef={knockedRef}
          scoreRef={scoreRef}
          finishedRef={finishedRef}
          settleAtRef={settleAtRef}
          emit={emit}
        />
      </Physics>

      <OrbitControls
        enablePan={false}
        minDistance={7}
        maxDistance={24}
        minPolarAngle={0.35}
        maxPolarAngle={1.45}
        target={[0, 1.2, 0]}
      />
    </Canvas>
  );
}
