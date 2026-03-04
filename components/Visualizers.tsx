/// <reference types="@react-three/fiber" />
import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VisualizerSettings } from '../types';

interface VisualizerProps {
  analyser: React.MutableRefObject<AnalyserNode | null>;
  color: string;
  secondaryColor: string;
  settings?: VisualizerSettings;
}

// === CIRCULAR SPECTRUM ===
export const BasicVisualizer: React.FC<VisualizerProps> = ({ analyser, color, secondaryColor, settings }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const count = 80;
  const radius = settings?.circularRadius ?? 3.5;
  const rotSpeed = settings?.circularRotationSpeed ?? 0.15;
  const barLength = settings?.circularBarLength ?? 5;
  const showRing = settings?.circularRing ?? false;
  const dummy = new THREE.Object3D();
  const dataArray = new Uint8Array(128);
  const smoothData = useRef(new Float32Array(count).fill(0));

  useLayoutEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -1);
        dummy.rotation.z = angle;
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [radius]);

  useFrame((state) => {
    if (!analyser.current || !meshRef.current) return;
    analyser.current.getByteFrequencyData(dataArray);
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const freqIndex = Math.floor((i / count) * (dataArray.length / 2));
      const rawValue = dataArray[freqIndex] / 255.0;
      smoothData.current[i] += (rawValue - smoothData.current[i]) * 0.15;
      const value = smoothData.current[i];

      const angle = (i / count) * Math.PI * 2 + time * rotSpeed;
      const breathe = 1 + Math.sin(time * 2 + i * 0.1) * 0.1;
      const scaleY = (0.3 + value * barLength) * breathe;
      const scaleX = 0.12 + value * 0.15;

      dummy.position.set(
        Math.cos(angle) * (radius + value * 0.5),
        Math.sin(angle) * (radius + value * 0.5),
        -1
      );
      dummy.rotation.z = angle + Math.PI / 2;
      dummy.scale.set(scaleX, scaleY, scaleX);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    // Ring pulse
    if (ringRef.current && showRing) {
      const avg = smoothData.current.reduce((a, b) => a + b, 0) / count;
      const scale = 1 + avg * 0.3;
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} toneMapped={false} emissive={color} emissiveIntensity={0.8} transparent opacity={0.9} />
      </instancedMesh>
      {showRing && (
        <mesh ref={ringRef} position={[0, 0, -1.1]}>
          <ringGeometry args={[radius - 0.05, radius + 0.05, 64]} />
          <meshBasicMaterial color={secondaryColor} transparent opacity={0.2} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

// === BASS REACTOR (Dual Geometry) ===
export const ComplexVisualizer: React.FC<VisualizerProps> = ({ analyser, color, secondaryColor }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const innerMeshRef = useRef<THREE.Mesh>(null);
  const dataArray = new Uint8Array(32);
  const smoothBass = useRef(0);

  useFrame((state) => {
    if (!analyser.current || !meshRef.current) return;
    analyser.current.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += dataArray[i];
    const normalized = (sum / 8) / 255;
    smoothBass.current += (normalized - smoothBass.current) * 0.12;
    const bass = smoothBass.current;

    const scale = 1 + bass * 2;
    meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.08);
    meshRef.current.rotation.x += 0.003 + bass * 0.015;
    meshRef.current.rotation.y += 0.005 + bass * 0.01;

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      const c1 = new THREE.Color(color);
      const c2 = new THREE.Color(secondaryColor);
      mat.emissive.lerpColors(c1, c2, bass);
      mat.emissiveIntensity = 0.5 + bass * 1.5;
      mat.opacity = 0.3 + bass * 0.4;
    }

    if (innerMeshRef.current) {
      const innerScale = 0.6 + bass * 1;
      innerMeshRef.current.scale.lerp(new THREE.Vector3(innerScale, innerScale, innerScale), 0.1);
      innerMeshRef.current.rotation.x -= 0.004 + bass * 0.008;
      innerMeshRef.current.rotation.z += 0.006 + bass * 0.005;
    }
  });

  return (
    <group position={[0, 0, -2]}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[2, 3]} />
        <meshStandardMaterial color={color} wireframe toneMapped={false} emissive={color} emissiveIntensity={0.8} transparent opacity={0.4} />
      </mesh>
      <mesh ref={innerMeshRef}>
        <octahedronGeometry args={[1.2, 1]} />
        <meshStandardMaterial color={secondaryColor} wireframe toneMapped={false} emissive={secondaryColor} emissiveIntensity={0.6} transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

// === LINEAR SPECTRUM (customizable) ===
export const LinearSpectrum: React.FC<VisualizerProps> = ({ analyser, color, secondaryColor, settings }) => {
  const count = settings?.spectrumBarCount ?? 48;
  const barW = settings?.spectrumBarWidth ?? 0.7;
  const mirror = settings?.spectrumMirror ?? false;
  const pos = settings?.spectrumPosition ?? 'bottom';
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const mirrorRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();
  const dataArray = new Uint8Array(128);
  const smoothData = useRef(new Float32Array(128).fill(0));
  const width = 14;
  const spacing = width / count;

  const yBase = pos === 'bottom' ? -3.5 : pos === 'top' ? 3.5 : 0;
  const direction = pos === 'top' ? -1 : 1;

  useFrame((state) => {
    if (!analyser.current || !meshRef.current) return;
    analyser.current.getByteFrequencyData(dataArray);
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const rawValue = dataArray[Math.floor((i / count) * 64)] / 255.0;
      smoothData.current[i] += (rawValue - smoothData.current[i]) * 0.2;
      const value = smoothData.current[i];

      const x = (i - count / 2) * spacing + (spacing / 2);
      const scaleY = 0.15 + value * 5;
      const waveOffset = Math.sin(time * 2 + i * 0.15) * 0.1;

      dummy.position.set(x, yBase + (scaleY / 2) * direction + waveOffset * direction, -4);
      dummy.scale.set(spacing * barW, scaleY, 0.15);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Mirror
      if (mirror && mirrorRef.current) {
        dummy.position.set(x, yBase - (scaleY / 2) * direction + waveOffset * -direction, -4);
        dummy.scale.set(spacing * barW, scaleY * 0.5, 0.15);
        dummy.updateMatrix();
        mirrorRef.current.setMatrixAt(i, dummy.matrix);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (mirror && mirrorRef.current) mirrorRef.current.instanceMatrix.needsUpdate = true;

    const avgLevel = smoothData.current.slice(0, count).reduce((a, b) => a + b, 0) / count;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      const c1 = new THREE.Color(color);
      const c2 = new THREE.Color(secondaryColor);
      mat.emissive.lerpColors(c1, c2, avgLevel);
      mat.emissiveIntensity = 0.5 + avgLevel * 1.5;
    }
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} transparent opacity={0.85} />
      </instancedMesh>
      {mirror && (
        <instancedMesh ref={mirrorRef} args={[undefined, undefined, count]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={0.5} toneMapped={false} transparent opacity={0.35} />
        </instancedMesh>
      )}
    </group>
  );
};

// === LINE WAVE (dual mirrored) ===
export const LineWave: React.FC<VisualizerProps> = ({ analyser, color, secondaryColor, settings }) => {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const geometry2Ref = useRef<THREE.BufferGeometry>(null);
  const count = 160;
  const width = 22;
  const smoothing = settings?.waveformSmoothing ?? 0.5;

  useLayoutEffect(() => {
    [geometryRef, geometry2Ref].forEach(ref => {
      if (ref.current) {
        const positions = new Float32Array(count * 3);
        const sp = width / count;
        for (let i = 0; i < count; i++) {
          positions[i * 3] = (i - count / 2) * sp;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = 0;
        }
        ref.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      }
    });
  }, []);

  useFrame((state) => {
    if (!analyser.current) return;
    const data = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteFrequencyData(data);
    const time = state.clock.elapsedTime;
    const lerpFactor = 0.1 + smoothing * 0.3;

    if (geometryRef.current) {
      const positions = geometryRef.current.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const dataIdx = Math.floor((i / count) * (data.length * 0.7));
        const val = data[dataIdx] / 255.0;
        const breathe = Math.sin(time * 1.5 + i * 0.05) * 0.15;
        const target = val * 5 + breathe;
        positions[i * 3 + 1] += (target - positions[i * 3 + 1]) * lerpFactor;
      }
      geometryRef.current.attributes.position.needsUpdate = true;
    }

    if (geometry2Ref.current) {
      const positions = geometry2Ref.current.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const dataIdx = Math.floor((i / count) * (data.length * 0.7));
        const val = data[dataIdx] / 255.0;
        const breathe = Math.cos(time * 1.2 + i * 0.08) * 0.2;
        const target = -(val * 3 + breathe);
        positions[i * 3 + 1] += (target - positions[i * 3 + 1]) * lerpFactor;
      }
      geometry2Ref.current.attributes.position.needsUpdate = true;
    }
  });

  const line1 = useMemo(() => new THREE.Line(), []);
  const line2 = useMemo(() => new THREE.Line(), []);

  return (
    <group position={[0, -2, -2]}>
      <primitive object={line1}>
        <bufferGeometry ref={geometryRef} />
        <lineBasicMaterial color={color} linewidth={2} transparent opacity={0.8} />
      </primitive>
      <primitive object={line2}>
        <bufferGeometry ref={geometry2Ref} />
        <lineBasicMaterial color={secondaryColor} linewidth={1} transparent opacity={0.4} />
      </primitive>
    </group>
  );
};

// === RETRO GRID ===
export const RetroGrid: React.FC<VisualizerProps> = ({ analyser, color, secondaryColor }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const horizonRef = useRef<THREE.Mesh>(null);
  const dataArray = new Uint8Array(16);

  useFrame((state) => {
    if (!meshRef.current) return;
    const speed = 2.5;
    meshRef.current.position.z = (state.clock.elapsedTime * speed) % 2 - 10;

    if (analyser.current) {
      analyser.current.getByteFrequencyData(dataArray);
      const bass = dataArray[0] / 255;
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + bass * 1.2;
      mat.opacity = 0.25 + bass * 0.2;
    }

    if (horizonRef.current) {
      const mat = horizonRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
    }
  });

  return (
    <group>
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
        <mesh ref={meshRef}>
          <planeGeometry args={[80, 80, 40, 40]} />
          <meshStandardMaterial color={color} wireframe emissive={color} transparent opacity={0.3} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={horizonRef} position={[0, -3.5, -12]}>
        <planeGeometry args={[60, 0.5]} />
        <meshBasicMaterial color={secondaryColor} transparent opacity={0.15} toneMapped={false} />
      </mesh>
    </group>
  );
};

// === LIQUID WAVE ===
export const LiquidWave: React.FC<VisualizerProps> = ({ analyser, color, secondaryColor }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const dataArray = new Uint8Array(32);
  const smoothBass = useRef(0);

  useFrame((state) => {
    if (!meshRef.current) return;
    let bass = 0;
    if (analyser.current) {
      analyser.current.getByteFrequencyData(dataArray);
      bass = dataArray[2] / 255.0;
    }
    smoothBass.current += (bass - smoothBass.current) * 0.1;
    const smoothedBass = smoothBass.current;
    const time = state.clock.elapsedTime;
    const geometry = meshRef.current.geometry;
    const positionAttribute = geometry.attributes.position;

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const wave1 = Math.sin(x * 0.35 + time * 0.8) * Math.cos(y * 0.35 + time * 1.2);
      const wave2 = Math.sin(x * 0.6 + time * 1.5) * 0.4;
      const wave3 = Math.cos(y * 0.8 + time * 0.6) * 0.3;
      const z = (wave1 + wave2 + wave3) * (0.8 + smoothedBass * 4);
      positionAttribute.setZ(i, z);
    }
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      mat.emissiveIntensity = 0.3 + smoothedBass * 0.8;
      mat.opacity = 0.25 + smoothedBass * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -2.5, -10]}>
      <planeGeometry args={[50, 25, 64, 32]} />
      <meshStandardMaterial color={color} wireframe side={THREE.DoubleSide} emissive={secondaryColor} emissiveIntensity={0.4} transparent opacity={0.3} toneMapped={false} />
    </mesh>
  );
};

// ============ NEW VISUALIZERS ============

// === WAVEFORM (time-domain oscilloscope) ===
export const Waveform: React.FC<VisualizerProps> = ({ analyser, color, settings }) => {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const count = 256;
  const width = 18;
  const thickness = settings?.waveformThickness ?? 2;

  useLayoutEffect(() => {
    if (geometryRef.current) {
      const positions = new Float32Array(count * 3);
      const sp = width / count;
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (i - count / 2) * sp;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
      }
      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }
  }, []);

  useFrame(() => {
    if (!analyser.current || !geometryRef.current) return;
    const data = new Uint8Array(analyser.current.fftSize);
    analyser.current.getByteTimeDomainData(data);
    const positions = geometryRef.current.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const dataIdx = Math.floor((i / count) * data.length);
      const val = (data[dataIdx] / 128.0) - 1.0; // -1 to 1
      positions[i * 3 + 1] = val * 3;
    }
    geometryRef.current.attributes.position.needsUpdate = true;
  });

  const line = useMemo(() => new THREE.Line(), []);

  return (
    <primitive object={line} position={[0, 0, -3]}>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial color={color} linewidth={thickness} transparent opacity={0.7} />
    </primitive>
  );
};

// === DNA HELIX ===
export const DNAHelix: React.FC<VisualizerProps> = ({ analyser, color, secondaryColor }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const mesh2Ref = useRef<THREE.InstancedMesh>(null);
  const count = 60;
  const dummy = new THREE.Object3D();
  const dataArray = new Uint8Array(64);
  const smoothData = useRef(new Float32Array(count).fill(0));

  useFrame((state) => {
    if (!meshRef.current || !mesh2Ref.current) return;
    if (analyser.current) analyser.current.getByteFrequencyData(dataArray);
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const freqIndex = Math.floor((i / count) * 32);
      const rawValue = analyser.current ? dataArray[freqIndex] / 255.0 : 0;
      smoothData.current[i] += (rawValue - smoothData.current[i]) * 0.15;
      const value = smoothData.current[i];

      const t = (i / count) * Math.PI * 4 + time * 1.5;
      const y = (i - count / 2) * 0.2;
      const radius = 2 + value * 1.5;
      const scale = 0.08 + value * 0.15;

      // Strand 1
      dummy.position.set(Math.cos(t) * radius, y, Math.sin(t) * radius + -4);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Strand 2 (offset by PI)
      dummy.position.set(Math.cos(t + Math.PI) * radius, y, Math.sin(t + Math.PI) * radius + -4);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      mesh2Ref.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    mesh2Ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} toneMapped={false} transparent opacity={0.7} />
      </instancedMesh>
      <instancedMesh ref={mesh2Ref} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color={secondaryColor} emissive={secondaryColor} emissiveIntensity={0.6} toneMapped={false} transparent opacity={0.7} />
      </instancedMesh>
    </group>
  );
};

// === CIRCULAR WAVE (expanding rings) ===
export const CircularWave: React.FC<VisualizerProps> = ({ analyser, color, secondaryColor }) => {
  const ringCount = 5;
  const meshRefs = useRef<(THREE.Mesh | null)[]>(new Array(ringCount).fill(null));
  const dataArray = new Uint8Array(32);
  const smoothBass = useRef(0);

  useFrame((state) => {
    if (!analyser.current) return;
    analyser.current.getByteFrequencyData(dataArray);
    const bass = dataArray[1] / 255;
    smoothBass.current += (bass - smoothBass.current) * 0.1;
    const time = state.clock.elapsedTime;

    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const phase = (time * 0.8 + i * 0.5) % (ringCount * 0.5);
      const radius = 1 + phase * 2;
      const opacity = Math.max(0, 1 - phase / (ringCount * 0.5));

      mesh.scale.set(radius + smoothBass.current, radius + smoothBass.current, 1);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity * 0.3;
    });
  });

  return (
    <group position={[0, 0, -3]}>
      {Array.from({ length: ringCount }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
        >
          <ringGeometry args={[0.95, 1.05, 64]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? color : secondaryColor}
            transparent
            opacity={0.3}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

// === GALAXY SPIRAL (particle-like spiral arms) ===
export const GalaxySpiral: React.FC<VisualizerProps> = ({ analyser, color, secondaryColor }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 200;
  const dummy = new THREE.Object3D();
  const dataArray = new Uint8Array(32);
  const smoothBass = useRef(0);

  useFrame((state) => {
    if (!meshRef.current) return;
    if (analyser.current) {
      analyser.current.getByteFrequencyData(dataArray);
      const bass = dataArray[0] / 255;
      smoothBass.current += (bass - smoothBass.current) * 0.08;
    }
    const time = state.clock.elapsedTime;
    const bass = smoothBass.current;

    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 6; // spiral turns
      const armRadius = (i / count) * 8;
      const armOffset = time * 0.3 + bass * 0.5;

      const x = Math.cos(t + armOffset) * armRadius;
      const y = Math.sin(t + armOffset) * armRadius;
      const z = Math.sin(t * 2 + time) * 0.3 - 6;

      const scale = 0.03 + (1 - i / count) * 0.08 + bass * 0.04;

      dummy.position.set(x, y, z);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.2}
        toneMapped={false}
        transparent
        opacity={0.6}
      />
    </instancedMesh>
  );
};