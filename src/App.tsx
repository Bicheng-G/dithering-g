import { memo, FC, useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Center, Float, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useControls, folder, Leva } from 'leva';
import { RandomText } from './RandomText';
import './styles.css';

const LazyOrbitControls = lazy(() => import('@react-three/drei').then(module => ({ default: module.OrbitControls })));
const LazyPostProcessing = lazy(() => import('./post-processing').then(module => ({ default: module.PostProcessing })));
const LazyEnvironmentWrapper = lazy(() => import('./environment').then(module => ({ default: module.EnvironmentWrapper })));
const LazyHelmet = lazy(() => import('./Helmet'));

const DemoName: FC = () => {
  // const [showIcon, setShowIcon] = useState(false); // No longer needed for continuous loop
  const [iconOpacity, setIconOpacity] = useState(0);
  const glitchTimeoutRef = useRef<number | null>(null); // Ref to store timeout ID

  useEffect(() => {
    const startAnimationTimeout = setTimeout(() => {
      let currentStepInSequence = 0;
      const glitchSteps = [0.6, 0.2, 0.8, 0.4, 1]; // Opacity steps for one glitch burst
      const stepInterval = 75; // ms between individual opacity changes in a burst

      function runFullGlitchSequence() {
        // Reset step for the current sequence
        currentStepInSequence = 0;
        
        function animateNextStep() {
          if (currentStepInSequence < glitchSteps.length) {
            setIconOpacity(glitchSteps[currentStepInSequence]);
            currentStepInSequence++;
            glitchTimeoutRef.current = window.setTimeout(animateNextStep, stepInterval);
          } else {
            // Current sequence finished, schedule the next full sequence with random delay
            const randomLoopInterval = Math.random() * (2500 - 1500) + 1500; // 1.5s to 2.5s
            glitchTimeoutRef.current = window.setTimeout(runFullGlitchSequence, randomLoopInterval);
          }
        }
        animateNextStep(); // Start the steps of the current sequence
      }
      
      runFullGlitchSequence(); // Start the first full glitch sequence

    }, 2000); // 2-second delay before animation loop starts

    return () => {
      clearTimeout(startAnimationTimeout); // Clear the initial delay timeout
      if (glitchTimeoutRef.current) {
        clearTimeout(glitchTimeoutRef.current); // Clear the glitch loop timeout
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  return (
    <div className="demo-container">
      <div className="demo-name">
        <a href="https://bicheng.me/?intro=1" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center' }}>
          <RandomText text="bicheng Gu" />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="0.8em" 
            height="0.8em" 
            fill="grey"
            style={{
              marginLeft: '0.1em', 
              width: '0.75em', 
              height: '0.75em',
              opacity: iconOpacity, // Controlled by new state
              // transition: 'opacity 4s ease-in-out' // Removed CSS transition
            }}
            viewBox="0 0 16 16"
          >
            <path fillRule="evenodd" d="M14 2.5a.5.5 0 0 0-.5-.5h-6a.5.5 0 0 0 0 1h4.793L2.146 13.146a.5.5 0 0 0 .708.708L13 3.707V8.5a.5.5 0 0 0 1 0v-6z"/>
          </svg>
        </a>
      </div>
      <div className="demo-author" hidden={true}>
        <span className="underlined">
          <a href="https://bicheng.me" target="_blank" rel="noopener noreferrer">bicheng Gu</a>
        </span>
        {" • "}
        <a href="https://github.com/Bicheng-G/dithering-g" target="_blank" rel="noopener noreferrer" className="github-link">GitHub</a>
      </div>
    </div>
  );
}

// Pre-loading the model to avoid blocking the main thread later
useGLTF.preload('/elegant_g.glb');

/**
 * Main application component
 */
export default function App(): JSX.Element {
  const { bgColor } = useControls({
    'Scene Settings': folder({
      bgColor: {
        value: '#ffffff',
        label: 'Background Color'
      }
    })
  });

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [modelScale, setModelScale] = useState(2.6);

  const { intensity, highlight } = useControls({
    'Environment Settings': folder({
      intensity: {
        value: 1.5,
        min: 0,
        max: 5,
        step: 0.1,
        label: 'Environment Intensity'
      },
      highlight: {
        value: '#066aff',
        label: 'Highlight Color'
      }
    })
  });

  // Update renderer clear color when background color changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setClearColor(new THREE.Color(bgColor));
    }
  }, [bgColor]);

  // Responsive adjustment handler for model scale
  const handleResize = useCallback(() => {
    const isSmallScreen = window.innerWidth <= 768;
    setModelScale(isSmallScreen ? 2.08 : 2.6);
  }, []);

  // Set up resize handling
  useEffect(() => {
    // Initial check
    handleResize();
    
    // Add listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return (
    <>
      <Leva 
        collapsed={process.env.NODE_ENV === 'development' ? true : false} // Collapse in dev, doesn't matter in prod if hidden
        hidden={process.env.NODE_ENV === 'production'} 
      />
      <Canvas 
        shadows 
        camera={{ position: [0, -1, 4], fov: 65 }}
        gl={{ 
          alpha: false 
        }}
        onCreated={({ gl }) => {
          rendererRef.current = gl;
          gl.setClearColor(new THREE.Color(bgColor));
        }}
      >
        <Suspense fallback={null}>
          <group position={[-0.18, -0.5, 0]}>
            <Float 
              floatIntensity={2} 
              rotationIntensity={1}
              speed={2}
            >
              <Center scale={modelScale} position={[-0.18, 0.5, 0]} rotation={[0, -Math.PI / 3.5, -0.4]}>
                <LazyHelmet />
              </Center>
            </Float>
          </group>
          <LazyOrbitControls />
          <LazyEnvironmentWrapper intensity={intensity} highlight={highlight} />
          <Effects />
        </Suspense>
      </Canvas>
      <DemoName />
    </>
  )
}

/**
 * Post-processing effects wrapper component
 * Memoized to prevent unnecessary re-renders
 */
const Effects: FC = memo(() => (
  <LazyPostProcessing />
))

/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.5.3 jousting_helmet.glb --transform --resolution=4098 
Files: jousting_helmet.glb [45.8MB] > jousting_helmet-transformed.glb [3.99MB] (91%)
Author: The Royal Armoury (Livrustkammaren) (https://sketchfab.com/TheRoyalArmoury)
License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
Source: https://sketchfab.com/3d-models/jousting-helmet-a4eea31d9d9441af9434a7da5ae46b54
Title: Jousting Helmet
*/
// interface HelmetProps {  // This interface definition will be removed
//   [key: string]: any;
// }

// /**
//  * 3D Helmet model component 
//  */
// function Helmet(props: HelmetProps): JSX.Element | null { // This function definition will be removed
//   const { nodes } = useGLTF('/elegant_g.glb') as any;
//
//   // Find the first mesh in the GLTF nodes
//   let firstMesh: THREE.Mesh | undefined = undefined;
//   for (const nodeName in nodes) {
//     if (nodes[nodeName] instanceof THREE.Mesh) {
//       firstMesh = nodes[nodeName] as THREE.Mesh;
//       break;
//     }
//   }
//
//   if (!firstMesh) {
//     console.warn("No mesh found in elegant_g.glb");
//     return null; // Or some placeholder
//   }
//
//   return (
//     <group {...props} dispose={null}>
//       <primitive 
//         object={firstMesh} 
//         castShadow 
//         material-roughness={0.15}
//         // Reset position, rotation, and scale from the original mesh
//         // as these are often handled by the <Center> and <Float> components
//         // or should be adjusted specifically for the new model.
//         // You might need to fine-tune these for elegant_g.glb
//         position={[0, 0, 0]} 
//         rotation={[0, 0, 0]}
//         scale={1} // Adjust scale as needed for elegant_g.glb
//       />
//     </group>
//   );
// } 