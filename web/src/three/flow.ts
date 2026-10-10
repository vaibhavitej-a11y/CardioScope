/**
 * Blood-flow light bands for the vessel tubes.
 *
 * A bright band scrolls along the tube's uv.x (base → apex) and is added to
 * the emissive term, so Bloom picks it up as a travelling glow — blood in
 * motion without opaque-tube particle occlusion. The band is injected via
 * onBeforeCompile rather than a custom ShaderMaterial so the tubes keep the
 * full physical lighting (clearcoat, IBL, fresnel) they already have.
 *
 * The injected code only touches shaders that include <common>,
 * <begin_vertex> and <emissivemap_fragment> — present in every built-in
 * material, which is all this app renders.
 */

interface FlowShader {
  uniforms: { [name: string]: { value: number } }
  vertexShader: string
  fragmentShader: string
}

export interface FlowSpec {
  /** Band repetitions along the tube. */
  readonly repeat: number
  /** Downstream scroll speed, uv units per second. */
  readonly speed: number
  /** Additive band colour. */
  readonly tint: readonly [number, number, number]
  /** Peak additive strength — feeds the bloom threshold. */
  readonly strength: number
}

export function injectFlow(
  shader: FlowShader,
  uTime: { value: number },
  spec: FlowSpec,
): void {
  shader.uniforms.uFlowTime = uTime
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying float vFlowU;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlowU = uv.x;')
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      '#include <common>\nvarying float vFlowU;\nuniform float uFlowTime;',
    )
    .replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      {
        float flowPhase = fract(vFlowU * ${spec.repeat.toFixed(1)} - uFlowTime * ${spec.speed.toFixed(2)});
        float flowBand = smoothstep(0.0, 0.14, flowPhase) * (1.0 - smoothstep(0.16, 0.42, flowPhase));
        totalEmissiveRadiance += vec3(${spec.tint[0].toFixed(2)}, ${spec.tint[1].toFixed(2)}, ${spec.tint[2].toFixed(2)}) * flowBand * ${spec.strength.toFixed(2)};
      }`,
    )
}
