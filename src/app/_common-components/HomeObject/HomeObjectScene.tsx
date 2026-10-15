"use client";

import { Environment, Lightformer, MeshDistortMaterial, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Quaternion, Vector3 } from "three";

/**
 * A dark liquid knot that sits still and only rotates.
 *
 * The surface ripples gently with a noise distortion, so it flows like a slow
 * liquid instead of sitting inert. The colour is a deep violet with only a
 * faint iridescent sheen, which keeps it dark and lets it sink into the page's
 * near-black background.
 *
 * A single light is baked into an environment map (built procedurally, so
 * nothing is fetched over the network) and then turned to follow the camera, so
 * the light always falls from the viewer's side. Spinning the object slides its
 * surface under a stationary light instead of dragging the light around with it.
 *
 * Zoom and pan are disabled so the only interaction is spinning it, and the
 * transparent canvas lets it sit directly on the page's dark background.
 */

// The light panel sits on the environment map's local +Z axis.
const LIGHT_AXIS = new Vector3(0, 0, 1);
const toCamera = new Vector3();
const spin = new Quaternion();

/** Turns the baked environment map so its single light always faces the camera. */
function CameraLockedLight() {
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useFrame(() => {
    // Direction leading from the object (at the origin) out to the camera.
    toCamera.copy(camera.position).normalize();

    // `environmentRotation` rotates the environment as it is sampled, so the
    // light — fixed at +Z inside the map — is turned to point at the camera.
    // This is cheap: the map is baked once and never re-rendered.
    spin.setFromUnitVectors(toCamera, LIGHT_AXIS);
    scene.environmentRotation.setFromQuaternion(spin);
  });

  return null;
}

export default function HomeObjectScene({ onReady }: { onReady?: () => void }) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 0, 6], fov: 42 }}
      onCreated={() => {
        // Wait two frames so the first render has actually been painted.
        requestAnimationFrame(() => requestAnimationFrame(() => onReady?.()));
      }}
    >
      {/* A single light straight in front. `target` defaults to the origin, so
          it turns to face the object on its own. */}
      <Environment resolution={256}>
        <Lightformer intensity={3} color="#e9dcff" position={[0, 0, 4]} scale={[8, 8, 1]} />
      </Environment>
      <CameraLockedLight />

      <mesh>
        <torusKnotGeometry args={[1, 0.36, 320, 40]} />
        <MeshDistortMaterial
          color="#241a45"
          distort={0.28}
          speed={1.5}
          radius={1}
          roughness={0.07}
          metalness={0.35}
          clearcoat={1}
          clearcoatRoughness={0.1}
          iridescence={0.4}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[120, 900]}
          envMapIntensity={1.1}
          emissive="#0f0824"
          emissiveIntensity={0.3}
        />
      </mesh>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.9}
        autoRotate
        autoRotateSpeed={0.9}
      />
    </Canvas>
  );
}
