/**
 * Shared physical materials for the hero organ.
 *
 * Deterministic muscle fibers, restrained clearcoat, and a soft warm rim.
 * Opaque physical materials avoid an expensive transmission render pass.
 *
 * Fresnel is injected with onBeforeCompile — no custom ShaderMaterial, so
 * lighting and clearcoat keep working exactly as three intends.
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
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const field = ctx.createImageData(size, size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Periodic, deterministic fibers; the seam meets cleanly at u=0/1.
        const u = x / size * Math.PI * 2
        const v = y / size * Math.PI * 2
        const fiber = Math.sin(u * 54 + v * 13 + 3 * Math.sin(v * 2))
        const fine = Math.sin(u * 117 - v * 47) * Math.cos(v * 81 + u * 9)
        const patches = Math.sin(u * 5 + v * 3) * Math.cos(v * 7 - u * 2)
        const tone = 170 + fiber * 15 + fine * 7 + patches * 24
        const i = (y * size + x) * 4
        field.data[i] = field.data[i + 1] = field.data[i + 2] = tone
        field.data[i + 3] = 255
      }
    }
    ctx.putImageData(field, 0, 0)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)
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
 * Myocardium with surface fibers and a restrained rim to suggest soft tissue.
 */
export function createMuscleMaterial(): THREE.MeshPhysicalMaterial {
  const tissue = createTissueField()
  const material = new THREE.MeshPhysicalMaterial({
    color: '#984f4d',
    vertexColors: true,
    roughness: 0.8,
    roughnessMap: tissue,
    bumpMap: tissue,
    bumpScale: 0.017,
    metalness: 0,
    clearcoat: 0.32,
    clearcoatRoughness: 0.45,
    sheen: 0.35,
    sheenColor: new THREE.Color('#e08a72'),
    sheenRoughness: 0.5,
    transmission: 0,
    envMapIntensity: 0.65,
  })
  injectFresnelRim(material, 0.12)
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
    clearcoat: 0.3,
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
    roughness: 0.58,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
    sheen: 0.4,
    sheenColor: new THREE.Color('#ffffff'),
    envMapIntensity: 0.65,
  })
  injectFresnelRim(material, 0.12)
  return material
}
