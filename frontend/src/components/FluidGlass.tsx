/* eslint-disable react/no-unknown-property */
'use client';

import * as THREE from 'three';
import { useRef, useState, useEffect, memo, Suspense } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import {
  useFBO,
  useGLTF,
  Preload,
  MeshTransmissionMaterial,
} from '@react-three/drei';
import { easing } from 'maath';

interface FluidGlassProps {
  mode?: 'lens' | 'bar' | 'cube';
  lensProps?: any;
  barProps?: any;
  cubeProps?: any;
}

function FallbackScene() {
  return (
    <mesh scale={[10, 10, 1]}>
      <planeGeometry />
      <meshBasicMaterial color={0x0a0e27} />
    </mesh>
  );
}

export default function FluidGlass({ 
  mode = 'lens', 
  lensProps = {}, 
  barProps = {}, 
  cubeProps = {} 
}: FluidGlassProps) {
  const Wrapper = mode === 'bar' ? Bar : mode === 'cube' ? Cube : Lens;
  const rawOverrides = mode === 'bar' ? barProps : mode === 'cube' ? cubeProps : lensProps;

  return (
    <Canvas camera={{ position: [0, 0, 20], fov: 15 }} gl={{ alpha: true }}>
      <Suspense fallback={<FallbackScene />}>
        <ErrorBoundaryWrapper>
          <Wrapper modeProps={rawOverrides}>
            <Preload />
          </Wrapper>
        </ErrorBoundaryWrapper>
      </Suspense>
    </Canvas>
  );
}

function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('3D loading error:', error);
    return <FallbackScene />;
  }
}

const ModeWrapper = memo(function ModeWrapper({
  children,
  glb,
  geometryKey,
  lockToBottom = false,
  followPointer = true,
  modeProps = {},
  ...props
}: any) {
  const ref = useRef<any>(null);
  
  // useGLTF will be wrapped in Suspense, so we can safely call it
  const gltf = useGLTF(glb) as any;
  const nodes = gltf?.nodes || {};
  
  const buffer = useFBO();
  const { viewport: vp } = useThree();
  const [scene] = useState(() => new THREE.Scene());
  const geoWidthRef = useRef(1);

  useEffect(() => {
    const geo = nodes[geometryKey]?.geometry;
    if (geo) {
      geo.computeBoundingBox();
      geoWidthRef.current = (geo.boundingBox?.max.x ?? 1) - (geo.boundingBox?.min.x ?? 0) || 1;
    }
  }, [nodes, geometryKey]);

  useFrame((state, delta) => {
    const { gl, viewport, pointer, camera } = state;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);

    const destX = followPointer ? (pointer.x * v.width) / 2 : 0;
    const destY = lockToBottom ? -v.height / 2 + 0.2 : followPointer ? (pointer.y * v.height) / 2 : 0;
    
    if (ref.current) {
      easing.damp3(ref.current.position, [destX, destY, 15], 0.15, delta);

      if (modeProps.scale == null) {
        const maxWorld = v.width * 0.9;
        const desired = maxWorld / geoWidthRef.current;
        ref.current.scale.setScalar(Math.min(0.15, desired));
      }
    }

    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    // Background Color
    gl.setClearColor(0x0a0e27, 1);
  });

  const { scale, ior, thickness, anisotropy, chromaticAberration, ...extraMat } = modeProps;

  const geometry = nodes[geometryKey]?.geometry;

  return (
    <>
      {createPortal(children, scene)}
      <mesh scale={[vp.width, vp.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent />
      </mesh>
      {geometry && (
        <mesh ref={ref} scale={scale ?? 0.15} rotation-x={Math.PI / 2} geometry={geometry} {...props}>
          <MeshTransmissionMaterial
            buffer={buffer.texture}
            ior={ior ?? 1.15}
            thickness={thickness ?? 5}
            anisotropy={anisotropy ?? 0.01}
            chromaticAberration={chromaticAberration ?? 0.1}
            {...extraMat}
          />
        </mesh>
      )}
    </>
  );
});

function Lens({ modeProps, ...p }: any) {
  try {
    return <ModeWrapper glb="/assets/3d/lens.glb" geometryKey="Cylinder" followPointer modeProps={modeProps} {...p} />;
  } catch (e) {
    console.warn('Lens model failed to load', e);
    return <FallbackScene />;
  }
}

function Cube({ modeProps, ...p }: any) {
  try {
    return <ModeWrapper glb="/assets/3d/cube.glb" geometryKey="Cube" followPointer modeProps={modeProps} {...p} />;
  } catch (e) {
    console.warn('Cube model failed to load', e);
    return <FallbackScene />;
  }
}

function Bar({ modeProps = {}, ...p }: any) {
  const defaultMat = {
    transmission: 1,
    roughness: 0,
    thickness: 10,
    ior: 1.15,
    color: '#ffffff',
    attenuationColor: '#ffffff',
    attenuationDistance: 0.25
  };

  try {
    return (
      <ModeWrapper
        glb="/assets/3d/bar.glb"
        geometryKey="Cube"
        lockToBottom
        followPointer={false}
        modeProps={{ ...defaultMat, ...modeProps }}
        {...p}
      />
    );
  } catch (e) {
    console.warn('Bar model failed to load', e);
    return <FallbackScene />;
  }
}
