import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GroupProps } from '@react-three/fiber';

interface HelmetProps extends GroupProps {
  // Add any specific props Helmet might need, if any
}

/**
 * 3D Helmet model component
 */
export default function Helmet(props: HelmetProps): JSX.Element | null {
  const { nodes } = useGLTF('/elegant_g.glb') as any;

  // Find the first mesh in the GLTF nodes
  let firstMesh: THREE.Mesh | undefined = undefined;
  for (const nodeName in nodes) {
    if (nodes[nodeName] instanceof THREE.Mesh) {
      firstMesh = nodes[nodeName] as THREE.Mesh;
      break;
    }
  }

  if (!firstMesh) {
    console.warn("No mesh found in elegant_g.glb");
    return null;
  }

  return (
    <group {...props} dispose={null}>
      <primitive
        object={firstMesh}
        castShadow
        material-roughness={0.15}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={1}
      />
    </group>
  );
}

// Optional: Preload the model data here if you prefer it co-located with the component
// useGLTF.preload('/elegant_g.glb'); 