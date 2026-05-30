"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

import { useThemeNetwork } from "@/app/components/theme-network-provider";
import type { BuiltInGame } from "@/lib/games/config";

type LeaderRow = { id: string; walletAddress: string; bestScore: number; bestPoints: number };
type HistRow = { id: string; score: number; points: number; rewardUnits: number; submittedAt: string };

function shortAddr(a: string) {
  if (a.length <= 10) return a;
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

function SceneArcRunner({
  running,
  onFinish,
  onHud,
}: {
  running: boolean;
  onFinish: (score: number) => void;
  onHud: (hud: { score: number; coins: number; speed: number }) => void;
}) {
  const { camera } = useThree();

  const finishedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const coinsRef = useRef(0);

  // Player state (use refs to avoid re-render every frame).
  const laneRef = useRef(0); // -1 | 0 | +1
  const yRef = useRef(0);
  const vyRef = useRef(0);
  const slidingUntilRef = useRef(0);

  const playerRef = useRef<THREE.Mesh | null>(null);
  const runnerGroupRef = useRef<THREE.Group | null>(null);
  const trackRef = useRef<THREE.Group | null>(null);
  const groundMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const wallMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const laneMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  type ObKind = "barrier" | "overhead" | "coin";
  type Ob = { mesh: THREE.Mesh; lane: -1 | 0 | 1; z: number; kind: ObKind; collected?: boolean };
  const obstaclesRef = useRef<Ob[]>([]);

  const inputRef = useRef({
    left: false,
    right: false,
    jump: false,
    slide: false,
    lastLaneMoveAt: 0,
  });

  const speedRef = useRef(10); // world units / second
  const distanceRef = useRef(0); // world units

  const themeRef = useRef<{
    fog: string;
    ground: string;
    wall: string;
    lane: string;
    coinEmissive: string;
  } | null>(null);

  function randomTheme() {
    const themes = [
      // Jungle dusk
      { fog: "#081012", ground: "#0f1a16", wall: "#152420", lane: "#2a3a34", coinEmissive: "#3b2b10" },
      // Temple torchlight
      { fog: "#120b07", ground: "#1a120d", wall: "#241a12", lane: "#3a2c20", coinEmissive: "#4a2b0b" },
      // Moonlit stone
      { fog: "#070a12", ground: "#0e1118", wall: "#121826", lane: "#2a3142", coinEmissive: "#24314a" },
      // Emerald ruins
      { fog: "#06110d", ground: "#0b1a12", wall: "#0f2418", lane: "#244a34", coinEmissive: "#1a4a3b" },
    ] as const;
    return themes[Math.floor(Math.random() * themes.length)]!;
  }

  useEffect(() => {
    if (!running) return;
    finishedRef.current = false;
    startedAtRef.current = performance.now();
    coinsRef.current = 0;
    laneRef.current = 0;
    yRef.current = 0;
    vyRef.current = 0;
    slidingUntilRef.current = 0;
    speedRef.current = 10;
    distanceRef.current = 0;
    inputRef.current.lastLaneMoveAt = 0;

    // Pick a theme per run.
    themeRef.current = randomTheme();

    // Apply theme immediately to materials + fog.
    const th = themeRef.current;
    if (th) {
      if (groundMatRef.current) groundMatRef.current.color.set(th.ground);
      if (wallMatRef.current) wallMatRef.current.color.set(th.wall);
      if (laneMatRef.current) laneMatRef.current.color.set(th.lane);
    }
  }, [running]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!running) return;
      if (e.key === "ArrowLeft" || e.key === "a") inputRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d") inputRef.current.right = true;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") inputRef.current.jump = true;
      if (e.key === "ArrowDown" || e.key === "s") inputRef.current.slide = true;
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "a") inputRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d") inputRef.current.right = false;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") inputRef.current.jump = false;
      if (e.key === "ArrowDown" || e.key === "s") inputRef.current.slide = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [running]);

  // Basic swipe controls (mobile).
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);
  useEffect(() => {
    if (!running) return;
    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      touchRef.current = { x: t.clientX, y: t.clientY, t: performance.now() };
    }
    function onTouchEnd(e: TouchEvent) {
      const start = touchRef.current;
      touchRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ax < 16 && ay < 16) {
        // Tap: jump
        inputRef.current.jump = true;
        window.setTimeout(() => (inputRef.current.jump = false), 40);
        return;
      }
      if (ax > ay) {
        if (dx < 0) {
          inputRef.current.left = true;
          window.setTimeout(() => (inputRef.current.left = false), 60);
        } else {
          inputRef.current.right = true;
          window.setTimeout(() => (inputRef.current.right = false), 60);
        }
      } else {
        if (dy < 0) {
          inputRef.current.jump = true;
          window.setTimeout(() => (inputRef.current.jump = false), 60);
        } else {
          inputRef.current.slide = true;
          window.setTimeout(() => (inputRef.current.slide = false), 120);
        }
      }
    }
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [running]);

  // Seed obstacles once (meshes are stable; positions are reset on run start).
  const seededRef = useRef(false);
  // Wider lanes = more Temple/Surfers-like readability on mobile.
  const laneX = 1.75;
  const groundY = 0;
  // Give the player time to start before the first obstacle.
  const spawnAhead = 34;
  const despawnBehind = -6;
  const spawnSpacing = 4.2;
  // Some GLB characters have their "forward" axis flipped.
  // Positive value rotates them to face into the track.
  const MODEL_YAW_OFFSET = 0;

  const resetObstacles = useCallback(() => {
    const obs = obstaclesRef.current;
    // Safe runway before the first spawns.
    let z = 16;
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i]!;
      const lane = ((i % 3) - 1) as -1 | 0 | 1;
      o.lane = lane;
      o.z = z;
      o.collected = false;
      z += spawnSpacing + (i % 4 === 0 ? 1.6 : 0);
      if (o.kind === "coin") {
        o.mesh.position.set(lane * laneX, 1.05, o.z);
      } else if (o.kind === "overhead") {
        o.mesh.position.set(lane * laneX, 1.55, o.z);
      } else {
        o.mesh.position.set(lane * laneX, 0.55, o.z);
      }
      o.mesh.visible = true;
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    resetObstacles();
  }, [resetObstacles, running]);

  function finishNow() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // Subway-surfers style: distance is primary, coins add bonus.
    const score = Math.max(0, Math.floor(distanceRef.current * 10 + coinsRef.current * 120));
    onFinish(score);
  }

  useFrame((_state, dt) => {
    if (!running) return;
    if (finishedRef.current) return;
    if (!playerRef.current || !trackRef.current) return;

    // Camera: tighter 3rd-person runner view (closer to Subway Surfers).
    const camY = 3.15 + Math.sin(distanceRef.current * 0.05) * 0.05;
    // Forward is +Z. Camera sits behind player at -Z.
    camera.position.set(0, camY, -5.55);
    camera.lookAt(0, 1.2, 0.8);

    // Gradually ramp speed.
    speedRef.current = Math.min(24, speedRef.current + dt * 0.65);
    const speed = speedRef.current;
    distanceRef.current += speed * dt;
    onHud({
      score: Math.max(0, Math.floor(distanceRef.current * 10 + coinsRef.current * 120)),
      coins: coinsRef.current,
      speed,
    });

    // Persist best score (client-side) for quick replay feedback.
    // Keep it here so it updates even if the run ends abruptly.
    if (typeof window !== "undefined") {
      const s = Math.max(0, Math.floor(distanceRef.current * 10 + coinsRef.current * 120));
      const raw = window.localStorage.getItem("arc_runner_3d_best_score");
      const prev = raw != null ? Number(raw) : 0;
      if (!Number.isFinite(prev) || s > prev) {
        window.localStorage.setItem("arc_runner_3d_best_score", String(s));
      }
    }

    // Lane switching with a small cooldown to avoid jitter.
    const now = performance.now();
    const moveCooldownMs = 140;
    if (now - inputRef.current.lastLaneMoveAt > moveCooldownMs) {
      if (inputRef.current.left) {
        laneRef.current = Math.max(-1, laneRef.current - 1);
        inputRef.current.lastLaneMoveAt = now;
      } else if (inputRef.current.right) {
        laneRef.current = Math.min(1, laneRef.current + 1);
        inputRef.current.lastLaneMoveAt = now;
      }
    }

    // Jump physics.
    const gravity = -24;
    const jumpV = 8.75;
    const onGround = yRef.current <= 0.0001;
    const nowMs = performance.now();
    const sliding = nowMs < slidingUntilRef.current;

    if (inputRef.current.jump && onGround && !sliding) {
      vyRef.current = jumpV;
    }
    vyRef.current += gravity * dt;
    yRef.current = Math.max(0, yRef.current + vyRef.current * dt);
    if (yRef.current <= 0.0001) {
      yRef.current = 0;
      vyRef.current = 0;
    }

    // Slide: real timed crouch.
    if (inputRef.current.slide && onGround) {
      slidingUntilRef.current = Math.max(slidingUntilRef.current, nowMs + 480);
    }

    // Smoothly interpolate player X toward lane.
    const targetX = laneRef.current * laneX;
    const px = THREE.MathUtils.lerp(playerRef.current.position.x, targetX, 1 - Math.pow(0.0001, dt));
    playerRef.current.position.x = px;
    playerRef.current.position.y = 0.62 + yRef.current;
    playerRef.current.position.z = 0;
    playerRef.current.rotation.y = THREE.MathUtils.lerp(
      playerRef.current.rotation.y,
      (targetX - px) * 0.25,
      1 - Math.pow(0.0001, dt),
    );

    if (runnerGroupRef.current) {
      runnerGroupRef.current.position.set(px, 0.0, 0.0);
      // Character should face "forward" (+Z), away from the camera.
      runnerGroupRef.current.rotation.y = MODEL_YAW_OFFSET + playerRef.current.rotation.y;
      runnerGroupRef.current.visible = true;
    }

    // Player collider.
    const halfW = 0.38;
    const halfH = sliding ? 0.28 : 0.6;
    const pMin = new THREE.Vector3(px - halfW, playerRef.current.position.y - halfH, -0.35);
    const pMax = new THREE.Vector3(px + halfW, playerRef.current.position.y + halfH, 0.35);

    // Move track and recycle obstacles.
    trackRef.current.position.z -= speed * dt;
    if (trackRef.current.position.z < -20) trackRef.current.position.z = 0;

    const obs = obstaclesRef.current;
    for (const o of obs) {
      o.z -= speed * dt;
      if (o.z < despawnBehind) {
        // respawn ahead (same kind; keep stable mesh/shape for performance)
        o.lane = ([-1, 0, 1][Math.floor(Math.random() * 3)] ?? 0) as -1 | 0 | 1;
        o.z = spawnAhead + Math.random() * 16;
        o.collected = false;
        o.mesh.scale.set(1, 1, 1);
        const mat = o.mesh.material as THREE.MeshStandardMaterial;
        if (o.kind === "coin") {
          mat.color.set("#c49b57");
          mat.emissive.set(themeRef.current?.coinEmissive ?? "#3b2b10");
        } else if (o.kind === "overhead") {
          mat.color.set("#e9e3d6");
          mat.emissive.set("#0b0d10");
        } else {
          mat.color.set("#e9e3d6");
          mat.emissive.set("#0b0d10");
        }
      }
      if (o.kind === "coin") o.mesh.position.set(o.lane * laneX, 1.05, o.z);
      else if (o.kind === "overhead") o.mesh.position.set(o.lane * laneX, 1.55, o.z);
      else o.mesh.position.set(o.lane * laneX, 0.55, o.z);

      const oX = o.mesh.position.x;
      const oY = o.mesh.position.y;
      const oZ = o.z;

      if (o.kind === "coin") {
        if (o.collected) continue;
        const dx = Math.abs(px - oX);
        const dy = Math.abs(playerRef.current.position.y - oY);
        const dz = Math.abs(oZ);
        if (dx < 0.55 && dy < 0.8 && dz < 0.55) {
          o.collected = true;
          o.mesh.visible = false;
          coinsRef.current += 1;
        }
        continue;
      }

      // Obstacles: barrier requires JUMP, overhead requires SLIDE.
      const bHalfW = 0.72;
      const bHalfD = 0.62;
      const bHalfH = o.kind === "overhead" ? 0.22 : 0.55;
      const bMin = new THREE.Vector3(oX - bHalfW, oY - bHalfH, oZ - bHalfD);
      const bMax = new THREE.Vector3(oX + bHalfW, oY + bHalfH, oZ + bHalfD);
      const hit =
        pMin.x <= bMax.x &&
        pMax.x >= bMin.x &&
        pMin.y <= bMax.y &&
        pMax.y >= bMin.y &&
        pMin.z <= bMax.z &&
        pMax.z >= bMin.z;

      if (!hit) continue;
      // If overhead and sliding: allow passing.
      if (o.kind === "overhead" && sliding) continue;
      // If barrier and jumping high enough: allow passing (player yRef gives jump).
      if (o.kind === "barrier" && yRef.current > 0.35) continue;
      finishNow();
      return;
    }

    // Safety end: cap run length (prevents infinite sessions).
    if (startedAtRef.current && performance.now() - startedAtRef.current > 75_000) {
      finishNow();
    }
  });

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 10, 6]} intensity={1.15} />
      <fog attach="fog" args={[themeRef.current?.fog ?? "#0b0d10", 6, 28]} />

      <group ref={trackRef} position={[0, 0, 0]}>
        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, groundY, 0]}>
          <planeGeometry args={[14, 60]} />
          <meshStandardMaterial ref={groundMatRef} color={themeRef.current?.ground ?? "#111315"} />
        </mesh>

        {/* Side walls/buildings (simple low-poly corridor) */}
        <mesh position={[-4.1, 1.3, -6]}>
          <boxGeometry args={[1.4, 3.0, 20]} />
          <meshStandardMaterial ref={wallMatRef} color={themeRef.current?.wall ?? "#14181c"} />
        </mesh>
        <mesh position={[4.1, 1.3, -6]}>
          <boxGeometry args={[1.4, 3.0, 20]} />
          <meshStandardMaterial color={themeRef.current?.wall ?? "#14181c"} />
        </mesh>

        {/* Lane lines */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-laneX / 2, groundY + 0.001, 0]}>
          <planeGeometry args={[0.06, 60]} />
          <meshStandardMaterial ref={laneMatRef} color={themeRef.current?.lane ?? "#2a2f34"} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[laneX / 2, groundY + 0.001, 0]}>
          <planeGeometry args={[0.06, 60]} />
          <meshStandardMaterial color={themeRef.current?.lane ?? "#2a2f34"} />
        </mesh>
      </group>

      {/* Player */}
      {/* Hidden collider; visible model is GLB below */}
      <mesh ref={playerRef} position={[0, 0.62, 0]} visible={false}>
        <capsuleGeometry args={[0.38, 0.72, 8, 16]} />
        <meshStandardMaterial color="#e9e3d6" roughness={0.5} metalness={0.05} />
      </mesh>

      <RunnerModel
        running={running}
        jumpY={yRef.current}
        sliding={performance.now() < slidingUntilRef.current}
        runnerGroupRef={runnerGroupRef}
      />

      {/* Obstacles */}
      {!seededRef.current ? (
        (() => {
          seededRef.current = true;
          const obs: Ob[] = [];
          // Create stable pools so we don't swap geometries at runtime.
          // Coins: collectible, barriers: must jump, overhead: must slide.
          const make = (kind: ObKind) => {
            const geo = (() => {
              if (kind === "coin") return new THREE.TorusGeometry(0.35, 0.14, 14, 24);
              if (kind === "overhead") return new THREE.BoxGeometry(1.7, 0.28, 0.95); // horizontal bar
              return new THREE.BoxGeometry(1.45, 0.9, 1.05); // chunky low barrier
            })();
            const mat = new THREE.MeshStandardMaterial({
              color: kind === "coin" ? "#c49b57" : "#e9e3d6",
              roughness: 0.55,
              metalness: kind === "coin" ? 0.25 : 0.0,
              emissive: new THREE.Color(kind === "coin" ? "#3b2b10" : "#0b0d10"),
            });
            const mesh = new THREE.Mesh(geo, mat);
            (mesh as any).castShadow = false;
            (mesh as any).receiveShadow = false;
            obs.push({ mesh, lane: 0, z: 0, kind });
          };
          for (let i = 0; i < 10; i++) make("barrier");
          for (let i = 0; i < 6; i++) make("overhead");
          for (let i = 0; i < 14; i++) make("coin");

          obstaclesRef.current = obs;
          // resetObstacles will position them when running toggles on.
          return null;
        })()
      ) : null}
      {obstaclesRef.current.map((o, idx) => (
        <primitive key={idx} object={o.mesh} />
      ))}
    </>
  );
}

function RunnerModel({
  running,
  jumpY,
  sliding,
  runnerGroupRef,
}: {
  running: boolean;
  jumpY: number;
  sliding: boolean;
  runnerGroupRef: React.MutableRefObject<THREE.Group | null>;
}) {
  const gltf = useGLTF("/models/arc-runner/runner.glb") as unknown as {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
  };
  const group = useRef<THREE.Group | null>(null);
  const { actions } = useAnimations(gltf.animations, group);

  useEffect(() => {
    if (!actions) return;
    const keys = Object.keys(actions);
    const pick = (nameContains: RegExp) => keys.find((k) => nameContains.test(k)) ?? null;
    const runKey = pick(/run|walk/i);
    const idleKey = pick(/idle/i);
    const action = (runKey && actions[runKey]) || (idleKey && actions[idleKey]) || (keys[0] ? actions[keys[0]] : null);

    if (running && action) action.reset().fadeIn(0.15).play();
    else if (action) action.fadeOut(0.15);
    return () => {
      if (action) action.stop();
    };
  }, [actions, running]);

  useEffect(() => {
    runnerGroupRef.current = group.current;
    return () => {
      if (runnerGroupRef.current === group.current) runnerGroupRef.current = null;
    };
  }, [runnerGroupRef]);

  // Small pose tweaks for jump/slide without relying on specific animation names.
  const y = 0.0;
  const scale = 0.95;
  const tilt = sliding ? -0.55 : jumpY > 0.15 ? 0.18 : 0;

  return (
    // Rotation is controlled by the runnerGroupRef in the main loop (faces +Z).
    <group ref={group} position={[0, y, 0]} rotation={[0, 0, tilt]} scale={scale} visible={running}>
      <primitive object={gltf.scene} />
    </group>
  );
}

useGLTF.preload("/models/arc-runner/runner.glb");

function SceneTargetTap({ running, onFinish }: { running: boolean; onFinish: (score: number) => void }) {
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const t = window.setTimeout(() => {
      const score = 600 + Math.floor((Date.now() - started) / 30);
      onFinish(score);
    }, 8000);
    return () => window.clearTimeout(t);
  }, [onFinish, running]);

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 8, 2]} intensity={1.2} />
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#c49b57" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#111315" />
      </mesh>
      <OrbitControls enablePan={false} enableZoom={false} />
    </>
  );
}

function SceneRingRun({ running, onFinish }: { running: boolean; onFinish: (score: number) => void }) {
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const t = window.setTimeout(() => {
      const score = 900 + Math.floor((Date.now() - started) / 22);
      onFinish(score);
    }, 10000);
    return () => window.clearTimeout(t);
  }, [onFinish, running]);

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 8, 2]} intensity={1.2} />
      <mesh position={[0, 1.1, 0]}>
        <torusGeometry args={[1, 0.28, 16, 40]} />
        <meshStandardMaterial color="#e9e3d6" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#111315" />
      </mesh>
      <OrbitControls enablePan={false} enableZoom={false} />
    </>
  );
}

export function SkillBuiltInGameClient({ game }: { game: BuiltInGame }) {
  const { cluster } = useThemeNetwork();
  const [balance, setBalance] = useState<number | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "countdown" | "running" | "gameover" | "submitting"
  >("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hud, setHud] = useState<{ score: number; coins: number; speed: number } | null>(null);
  const [bestLocal, setBestLocal] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lastRun, setLastRun] = useState<{
    score: number;
    coins: number;
    reason: "hit";
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [history, setHistory] = useState<HistRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const defaultStake = game.defaultStakeUnits ?? game.minStakeUnits;
  const [stakeUnits, setStakeUnits] = useState(defaultStake);

  const allowed = game.availableClusters.includes(cluster);

  const refresh = useCallback(async () => {
    const [b, lb, hist] = await Promise.all([
      fetch(`/api/gamepass/balance?cluster=${cluster}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/games/leaderboard?cluster=${cluster}&gameId=${game.id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/games/history?cluster=${cluster}&gameId=${game.id}`).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (b?.units != null) setBalance(Number(b.units));
    setLeaderboard(Array.isArray(lb?.items) ? (lb.items as LeaderRow[]) : []);
    setHistory(Array.isArray(hist?.items) ? (hist.items as HistRow[]) : []);
  }, [cluster, game.id]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (game.id !== "arc-runner-3d") return;
    const raw = window.localStorage.getItem("arc_runner_3d_best_score");
    const n = raw != null ? Number(raw) : 0;
    if (Number.isFinite(n) && n > 0) setBestLocal(Math.floor(n));
  }, [game.id]);

  async function startRun() {
    setBusy(true);
    setMsg(null);
    try {
      const stake = Math.min(game.maxStakeUnits, Math.max(game.minStakeUnits, Math.floor(stakeUnits)));
      const res = await fetch("/api/games/session/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cluster, gameId: game.id, stakeUnits: stake }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to start session");
      setStakeUnits(stake);
      setSessionId(json.session.id);
      setHud({ score: 0, coins: 0, speed: 0 });
      setLastRun(null);
      if (game.id === "arc-runner-3d") {
        // Mobile-first: short countdown so the first swipe isn't "wasted".
        setCountdown(3);
        setPhase("countdown");
      } else {
        setCountdown(null);
        setPhase("running");
      }
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (countdown == null) return;
    if (countdown <= 0) {
      setCountdown(null);
      setPhase("running");
      return;
    }
    const t = window.setTimeout(() => setCountdown((v) => (v == null ? null : v - 1)), 900);
    return () => window.clearTimeout(t);
  }, [countdown]);

  const submit = useCallback(
    async (score: number, meta?: { coins?: number; reason?: "hit" }) => {
      setBusy(true);
      setMsg(null);
      setPhase("submitting");
      try {
        const sid = sessionId;
        if (!sid) throw new Error("Missing session");
        const points = score;
        const res = await fetch("/api/games/session/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cluster, sessionId: sid, score, points }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Submit failed");
        setMsg(`Run submitted. Reward: ${json.rewardUnits ?? 0} GP`);
        if (game.id === "arc-runner-3d") {
          setLastRun({ score, coins: meta?.coins ?? hud?.coins ?? 0, reason: meta?.reason ?? "hit" });
          setPhase("gameover");
        } else {
          setPhase("idle");
        }
        setSessionId(null);
        setHud(null);
        await refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : String(e));
        setPhase("idle");
        setHud(null);
      } finally {
        setBusy(false);
      }
    },
    [cluster, game.id, hud?.coins, refresh, sessionId],
  );

  const running = phase === "running";

  const scene = useMemo(() => {
    if (game.id === "arc-runner-3d")
      return (
        <SceneArcRunner
          running={running}
          onFinish={(score) => submit(score, { coins: hud?.coins ?? 0, reason: "hit" })}
          onHud={setHud}
        />
      );
    if (game.id === "target-tap-3d") return <SceneTargetTap running={running} onFinish={(score) => submit(score)} />;
    return <SceneRingRun running={running} onFinish={(score) => submit(score)} />;
  }, [game.id, hud?.coins, running, submit, setHud]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Play</p>
        <h1 className="text-3xl font-semibold tracking-tight">{game.title}</h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted">{game.summary}</p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-foreground/80">
            Stake: {game.minStakeUnits}–{game.maxStakeUnits.toLocaleString()} GP
          </span>
          <span className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted">
            Cluster: {cluster}
          </span>
          <span className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted">
            Balance: {balance == null ? "—" : `${balance} GP`}
          </span>
        </div>
      </header>

      {!allowed ? (
        <div className="rounded border border-border-low bg-cream px-4 py-4">
          <div className="text-sm font-semibold text-foreground">Not available on {cluster}</div>
          <div className="mt-1 text-sm text-muted">Switch clusters to play this game.</div>
        </div>
      ) : null}

      <div className="rounded border border-border-low bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="text-sm font-semibold">
              {phase === "running"
                ? "Run in progress…"
                : phase === "countdown"
                  ? "Get ready…"
                  : phase === "submitting"
                    ? "Submitting…"
                    : phase === "gameover"
                      ? "Game over"
                      : "Ready to play"}
            </div>
            {phase !== "running" && phase !== "countdown" && phase !== "submitting" ? (
              <div className="flex flex-col gap-2 sm:max-w-xs">
                <label htmlFor="skill-stake" className="text-xs font-semibold text-muted">
                  GP stake (rewards scale with stake)
                </label>
                <input
                  id="skill-stake"
                  type="number"
                  min={game.minStakeUnits}
                  max={game.maxStakeUnits}
                  value={stakeUnits}
                  onChange={(e) => setStakeUnits(Number(e.target.value))}
                  className="h-10 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
                />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => startRun()}
            disabled={!allowed || phase === "running" || phase === "countdown" || phase === "submitting" || busy}
            className="rounded bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Starting…"
              : `Stake ${Math.min(game.maxStakeUnits, Math.max(game.minStakeUnits, Math.floor(stakeUnits))).toLocaleString()} GP & start`}
          </button>
        </div>

        <div className="relative mt-4 w-full overflow-hidden rounded border border-border-low bg-bg1 max-md:aspect-9/14 md:aspect-16/10">
          <Canvas camera={{ position: [2.6, 2.2, 2.6] }}>{scene}</Canvas>

          {/* Game Over overlay (Arc Runner only) */}
          {game.id === "arc-runner-3d" && phase === "gameover" && lastRun ? (
            <div className="absolute inset-0 grid place-items-center bg-black/55 p-4">
              <div className="w-full max-w-sm rounded border border-white/15 bg-card/90 p-5 text-center shadow-[0_30px_100px_-70px_rgba(0,0,0,0.8)] backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Run ended
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Score {lastRun.score.toLocaleString()}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-border-low bg-card px-3 py-1 text-muted">
                    Coins <span className="text-foreground">{lastRun.coins}</span>
                  </span>
                  <span className="rounded-full border border-border-low bg-card px-3 py-1 text-muted">
                    Best <span className="text-foreground">{bestLocal.toLocaleString()}</span>
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => startRun()}
                    className="rounded bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
                  >
                    Play again
                  </button>
                  <Link
                    href="/play"
                    className="rounded border border-border-low bg-bg1 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-cream/60"
                  >
                    Back
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {game.id === "arc-runner-3d" ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full border border-border-low bg-card px-3 py-1 text-muted">
                Best <span className="text-foreground tabular-nums">{bestLocal.toLocaleString()}</span>
              </span>
              {hud ? (
                <>
                  <span className="rounded-full border border-border-low bg-card px-3 py-1 text-muted">
                    Score{" "}
                    <span className="text-foreground tabular-nums">{hud.score.toLocaleString()}</span>
                  </span>
                  <span className="rounded-full border border-border-low bg-card px-3 py-1 text-muted">
                    Coins{" "}
                    <span className="text-foreground tabular-nums">{hud.coins.toLocaleString()}</span>
                  </span>
                  <span className="rounded-full border border-border-low bg-card px-3 py-1 text-muted">
                    Speed{" "}
                    <span className="text-foreground tabular-nums">{hud.speed.toFixed(1)}</span>
                  </span>
                </>
              ) : null}
            </div>
            {countdown != null ? (
              <div className="rounded border border-border-low bg-card px-4 py-3 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Starting
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">{countdown}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <span>
            Controls: swipe left/right/up/down (mobile) · arrows/WASD + space + down (desktop)
          </span>
          <Link href="/play" className="font-semibold text-foreground hover:underline">
            Back
          </Link>
        </div>

        {msg ? <div className="mt-3 rounded border border-border-low bg-cream px-4 py-3 text-sm">{msg}</div> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-border-low bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold">Leaderboard</p>
            <button
              type="button"
              onClick={() => refresh().catch(() => {})}
              className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground"
            >
              Refresh
            </button>
          </div>
          {leaderboard.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No scores yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-border-low">
              {leaderboard.map((r, idx) => (
                <div key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="text-sm font-semibold">
                    #{idx + 1} <span className="text-muted">{shortAddr(r.walletAddress)}</span>
                  </div>
                  <div className="rounded bg-cream px-3 py-1 text-xs font-semibold text-foreground/80">
                    {r.bestScore}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded border border-border-low bg-card p-5">
          <p className="text-base font-semibold">Your recent runs</p>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No runs yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-border-low">
              {history.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Score {r.score}</div>
                    <div className="mt-1 text-xs text-muted">{new Date(r.submittedAt).toLocaleString()}</div>
                  </div>
                  <div className="rounded bg-cream px-3 py-1 text-xs font-semibold text-foreground/80">
                    +{r.rewardUnits} GP
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
