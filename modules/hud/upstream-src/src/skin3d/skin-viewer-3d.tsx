import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinnedScene } from "three/examples/jsm/utils/SkeletonUtils.js";

import { bakeNormalMap, buildSkinSources, composeAlbedo, getDisplayColors } from "./bake";
import { glitchLabToGlitchState, paletteToColorState } from "./adapter";
import { resolveDino, SKIN3D_SHARED, type DinoData } from "./registry";
import type { GlitchLabConfig, SkinPalette, SkinRenderMode } from "./types";
import "./load-progress.css";

function useSkinTextures(dino: DinoData, pattern: number) {
  const patternUrl = dino.patterns[pattern] ?? dino.patterns[1];
  const patternTexture = useLoader(THREE.TextureLoader, patternUrl);
  const normalMap = useLoader(THREE.TextureLoader, dino.normalMap);
  const detailNormalMap = useLoader(THREE.TextureLoader, SKIN3D_SHARED.detailNormal);
  const noiseMap = useLoader(THREE.TextureLoader, SKIN3D_SHARED.noise);
  const hasRAC = !!dino.racMap;
  const racMap = useLoader(THREE.TextureLoader, dino.racMap ?? patternUrl);
  const hasJuvenile = !!dino.juvenilePattern;
  const juvenileTexture = useLoader(THREE.TextureLoader, dino.juvenilePattern ?? patternUrl);
  const hasMask = !!dino.maskMap;
  const maskMap = useLoader(THREE.TextureLoader, dino.maskMap ?? patternUrl);
  const tmcUrl = dino.patternMasks?.[pattern];
  const hasTmc = !!tmcUrl;
  const tmcMask = useLoader(THREE.TextureLoader, tmcUrl ?? patternUrl);
  return {
    patternTexture,
    normalMap,
    detailNormalMap,
    noiseMap,
    hasRAC,
    racMap,
    hasJuvenile,
    juvenileTexture,
    hasMask,
    maskMap,
    hasTmc,
    tmcMask,
  };
}

function SafeFrameTicker() {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    // 30 FPS is plenty for a small preview and keeps GPU usage far below a normal
    // always-running requestAnimationFrame loop while The Isle is rendering behind it.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") invalidate();
    }, 34);
    return () => window.clearInterval(timer);
  }, [invalidate]);

  return null;
}

function WebGLContextGuard({ onContextLost }: { onContextLost?: () => void }) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      console.warn("[YETI 3D] WebGL context lost; disabling preview");
      onContextLost?.();
    };
    canvas.addEventListener("webglcontextlost", lost, false);
    return () => canvas.removeEventListener("webglcontextlost", lost, false);
  }, [gl, onContextLost]);

  return null;
}

function DinoModel({
  dino,
  palette,
  renderMode,
  glitchLab,
  onReady,
}: {
  dino: DinoData;
  palette: SkinPalette;
  renderMode: SkinRenderMode;
  glitchLab: GlitchLabConfig;
  onReady?: () => void;
}) {
  const pattern = Math.max(1, Math.round(glitchLab.pi || 1));
  const gltf = useLoader(GLTFLoader, dino.glbModel);
  const tex = useSkinTextures(dino, pattern);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  const colors = useMemo(() => paletteToColorState(palette), [palette]);
  const glitchValues = useMemo(
    () => glitchLabToGlitchState(glitchLab, renderMode === "glitched"),
    [glitchLab, renderMode],
  );
  const displayColors = useMemo(
    () => getDisplayColors(colors, glitchValues),
    [colors, glitchValues],
  );
  const noiseStrength = Math.max(0, Math.min(1, glitchLab.sv || 0));

  const bakedNormal = useMemo(
    () => bakeNormalMap(tex.normalMap, tex.detailNormalMap, dino.detailScale ?? 12, false),
    [tex.normalMap, tex.detailNormalMap, dino.detailScale],
  );

  const sources = useMemo(
    () =>
      buildSkinSources({
        pattern: tex.patternTexture,
        juvenile: tex.hasJuvenile ? tex.juvenileTexture : null,
        rac: tex.hasRAC ? tex.racMap : null,
        noise: tex.noiseMap,
        mask: tex.hasMask ? tex.maskMap : null,
        tmc: tex.hasTmc ? tex.tmcMask : null,
      }),
    [
      tex.patternTexture,
      tex.hasJuvenile,
      tex.juvenileTexture,
      tex.hasRAC,
      tex.racMap,
      tex.noiseMap,
      tex.hasMask,
      tex.maskMap,
      tex.hasTmc,
      tex.tmcMask,
    ],
  );

  const bakedAlbedo = useMemo(
    () => composeAlbedo(sources, displayColors, glitchValues, dino.overlayDefaults, noiseStrength),
    [sources, displayColors, glitchValues, dino.overlayDefaults, noiseStrength],
  );

  useEffect(() => () => bakedNormal.dispose(), [bakedNormal]);
  useEffect(() => () => bakedAlbedo.dispose(), [bakedAlbedo]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: bakedAlbedo,
        normalMap: bakedNormal,
        normalScale: new THREE.Vector2(1, 1),
        roughness: 0.95,
        metalness: 0.0,
        envMapIntensity: 0.4,
        side: THREE.DoubleSide,
      }),
    [bakedAlbedo, bakedNormal],
  );

  const eyeMaterial = useMemo(() => {
    const c = new THREE.Color(displayColors.eyeColor);
    return new THREE.MeshStandardMaterial({
      color: c,
      emissive: c.clone().multiplyScalar(0.4),
      roughness: 0.35,
      metalness: 0.0,
    });
  }, [displayColors.eyeColor]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => eyeMaterial.dispose(), [eyeMaterial]);

  const clonedScene = useMemo(() => cloneSkinnedScene(gltf.scene), [gltf.scene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const cur = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (cur && /eye|iris|pupil/i.test(cur.name)) {
        mesh.material = eyeMaterial;
        return;
      }
      mesh.material = material;
    });
  }, [clonedScene, material, eyeMaterial]);

  useEffect(() => {
    if (gltf.animations.length === 0) return;
    const want = dino.previewClip;
    const clip =
      (want && gltf.animations.find((a) => a.name.includes(want))) || gltf.animations[0];
    const mixer = new THREE.AnimationMixer(clonedScene);
    mixer.clipAction(clip).play();
    mixerRef.current = mixer;
    return () => {
      mixerRef.current = null;
      mixer.stopAllAction();
      mixer.uncacheRoot(clonedScene);
    };
  }, [gltf.animations, clonedScene, dino.previewClip]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => onReady?.());
    return () => window.cancelAnimationFrame(frame);
  }, [clonedScene, onReady]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return (
    <primitive
      object={clonedScene}
      scale={dino.glbScale}
      position={dino.glbPosition}
      rotation={[0, -Math.PI / 6, 0]}
    />
  );
}

export function SkinViewer3D({
  species,
  palette,
  renderMode,
  glitchLab,
  controls = true,
  onContextLost,
}: {
  species: string;
  palette: SkinPalette;
  renderMode: SkinRenderMode;
  glitchLab: GlitchLabConfig;
  controls?: boolean;
  onContextLost?: () => void;
}) {
  const dino = resolveDino(species);
  const [modelReady, setModelReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(8);
  const [showLoadOverlay, setShowLoadOverlay] = useState(true);

  useEffect(() => {
    setModelReady(false);
    setLoadProgress(8);
    setShowLoadOverlay(true);
  }, [species]);

  useEffect(() => {
    if (modelReady) {
      setLoadProgress(100);
      const finish = window.setTimeout(() => setShowLoadOverlay(false), 320);
      return () => window.clearTimeout(finish);
    }

    setShowLoadOverlay(true);
    const timer = window.setInterval(() => {
      setLoadProgress((current) => {
        if (current >= 92) return 92;
        const step = Math.max(1, Math.round((94 - current) * 0.08));
        return Math.min(92, current + step);
      });
    }, 90);
    return () => window.clearInterval(timer);
  }, [modelReady, species]);

  const handleModelReady = useCallback(() => {
    setModelReady(true);
  }, []);

  if (!dino) {
    return <div className="skinViewerEmpty">Không có bản xem trước 3D cho {species}.</div>;
  }

  // During `npm run dev` inside Electron the overlay is rendered on top of The Isle.
  // Keep the dev guard as a second line of defense; packaged Electron is controlled by
  // DinoModelViewer's Safe 3D opt-in/fallback layer.
  const electronDev = import.meta.env.DEV && /Electron/i.test(navigator.userAgent);
  if (electronDev) {
    return (
      <div className="skinViewerEmpty">
        Xem trước 3D tạm tắt trong bản test Electron để tránh crash GPU. Các chức năng skin/cửa hàng vẫn hoạt động bình thường.
      </div>
    );
  }

  return (
    <div className="skinViewer">
      <Canvas
        dpr={1}
        frameloop="demand"
        camera={{ position: dino.cameraStart ?? [-19.33, 0.89, -0.02], fov: 40 }}
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.99,
          antialias: false,
          alpha: true,
          stencil: false,
          preserveDrawingBuffer: false,
          powerPreference: "low-power",
        }}
      >
        <SafeFrameTicker />
        <WebGLContextGuard onContextLost={onContextLost} />
        <ambientLight intensity={0.7} />
        <hemisphereLight args={["#cfe3ff", "#3a2f28", 0.6]} />
        <directionalLight position={[6, 10, 6]} intensity={2.4} color={"#fff2e6"} />
        <directionalLight position={[-6, 4, -6]} intensity={0.7} color={"#bcd4ff"} />
        <Suspense fallback={null}>
          <DinoModel
            key={species}
            dino={dino}
            palette={palette}
            renderMode={renderMode}
            glitchLab={glitchLab}
            onReady={handleModelReady}
          />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={controls} minDistance={8} maxDistance={40} />
      </Canvas>

      {showLoadOverlay ? (
        <div className={`skin3dLoadOverlay ${modelReady ? "done" : ""}`} aria-live="polite">
          <div className="skin3dLoadBox">
            <div className="skin3dLoadTop">
              <span>{modelReady ? "Xem trước 3D đã sẵn sàng" : "Đang tải xem trước 3D"}</span>
              <strong>{Math.round(loadProgress)}%</strong>
            </div>
            <div className="skin3dLoadTrack">
              <div className="skin3dLoadFill" style={{ width: `${loadProgress}%` }} />
            </div>
            <div className="skin3dLoadHint">
              {modelReady
                ? "Hoàn tất"
                : loadProgress >= 90
                  ? "Đang chuẩn bị model và texture…"
                  : "Đang tải model và texture…"}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
