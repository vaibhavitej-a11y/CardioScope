/**
 * Shared physical materials for the hero organ.
 *
 * The look targets the reference (BioDigital / MSD-style medical render):
 * wet translucent tissue, a warm fresnel rim so the silhouette glows against
 * the backdrop, clearcoat speculars that read as serous fluid, and red
 * attenuation so light going through the muscle comes out flesh-coloured
 * instead of grey.
 *
 * Fresnel is injected with onBeforeCompile — no custom ShaderMaterial, so
 * lighting / transmission / clearcoat keep working exactly as three intends.
 */

import * as THREE from 'three'

/** Warm rim tint — complements MUSCLE without ever reading as a risk colour. */
const RIM = '#ff9b7a'

/**
 * Procedural roughness/bump field — soft wet patches over drier grain.
 * Uniform roughness is the last tell of "browser 3D"; this breaks speculars
 * up the way real serosa does. Pure canvas noise: no network, per Track A.
 */
function createTissueField(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    // ~0.65 grey → with material.roughness 0.85 lands near 0.55 average.
    ctx.fillStyle = '#a6a6a6'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 170; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const r = 7 + Math.random() * 36
      const wet = Math.random() > 0.45
      const tone = wet ? 255 : 0
      const alpha = 0.05 + Math.random() * 0.13
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(${tone},${tone},${tone},${alpha})`)
      g.addColorStop(1, `rgba(${tone},${tone},${tone},0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 3)
  return texture
}

function injectFresnelRim(
  material: THREE.MeshPhysicalMaterial,
  intensity: number,
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = { value: new THREE.Color(RIM) }
    shader.uniforms.uRimStrength = { value: intensity }
    shader.fragmentShader =
      /* glsl */ `uniform vec3 uRim;
uniform float uRimStrength;
` + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      /* glsl */ `#include <emissivemap_fragment>
      {
        // vViewPosition points from the fragment toward the camera, so
        // 1 - N.V is 0 face-on and 1 at the silhouette.
        vec3 rimView = normalize(vViewPosition);
        float fres = pow(1.0 - saturate(dot(rimView, normal)), 2.4);
        totalEmissiveRadiance += uRim * fres * uRimStrength;
      }`,
    )
  }
  // Distinct cache key so three never reuses a non-rim program.
  material.customProgramCacheKey = () => `rim-${intensity}`
}

/**
 * Myocardium — wet, faintly translucent, glossy where fluid catches light.
 * transmission + red attenuation gives the edge a subsurface glow that a
 * plain opaque surface can never fake.
 */
export function createMuscleMaterial(): THREE.MeshPhysicalMaterial {
  const tissue = createTissueField()
  const material = new THREE.MeshPhysicalMaterial({
    color: '#a75f54',
    roughness: 0.85,
    roughnessMap: tissue,
    bumpMap: tissue,
    bumpScale: 0.018,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.26,
    sheen: 0.8,
    sheenColor: new THREE.Color('#e08a72'),
    sheenRoughness: 0.5,
    transmission: 0.24,
    thickness: 1.5,
    ior: 1.38,
    attenuationColor: new THREE.Color('#c93f31'),
    attenuationDistance: 0.85,
    envMapIntensity: 1.15,
  })
  injectFresnelRim(material, 0.55)
  // Owned by the material: disposed together whenever the organ tears down.
  material.userData.tissue = tissue
  material.addEventListener('dispose', () => tissue.dispose())
  return material
}

/** Darker, wetter twin for the coronary sulcus groove. */
export function createSulcusMaterial(): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: '#6e3a33',
    roughness: 0.55,
    metalness: 0,
    clearcoat: 0.9,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.9,
  })
  injectFresnelRim(material, 0.18)
  return material
}

/**
 * Great vessels (aorta, pulmonary trunk, vena cava) — smooth, elastic,
 * slightly glossy like fresh vessel wall.
 */
export function createVesselWallMaterial(color: string): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.22,
    sheen: 0.4,
    sheenColor: new THREE.Color('#ffffff'),
    envMapIntensity: 1.25,
  })
  injectFresnelRim(material, 0.12)
  return material
}
