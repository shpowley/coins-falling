/**
 * COMMENTS:
 * - "realistic render" tweaks
 * - next "stage" of development
 */
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js"
// import * as dat from "lil-gui" // CHANGED TO ON-DEMAND IMPORT (SEE BELOW)




// GET URL PARAMETER KEY
const getParameter = key => {
  const params = new URLSearchParams(window.location.search)
  return params.get(key)
}

const parameterEnabled = key => {
  const param = getParameter(key)

  if (param === null || param === "false") {
    return false
  }
  else {
    return true
  }
}




// PARAMETERS
const params = {
  env_map_intensity: 1.2,
  light_intensity_ambient: 0,
  background_blurriness: 0,
  background_intensity: 0,
  target_center: 1,
  cast_shadow: false,
  receive_shadow: false,
  tone_mapping: THREE.ReinhardToneMapping,
  tone_mapping_exposure: 1.5,
  use_legacy_lights: false,



  // DEFAULT : environment/2k.hdr
  // directional_light: {
  //   intensity: 2.5,
  //   x: -4,
  //   y: 2.5,
  //   z: 2,
  // },

  // shadow_camera: {
  //   near: 3.0,
  //   far: 6.5,
  //   zoom: 3.5,
  //   bias: 0.02,
  // }


  // CHINESE GARDEN : environment/chinese_garden_2k.hdr
  directional_light: {
    intensity: 0,
    x: 2.38,
    y: 2.78,
    z: 2,
  },

  shadow_camera: {
    near: 2.0,
    far: 5.0,
    zoom: 3.5,
    bias: 0.02,
  }
}




// DEMO MODE
// - "demo" parameter in URL disables affiliate links
//   ..for sharing on threejs-journey demo specifically as ads aren't really appropriate
//   self-promotion is probably fine though
let demo_mode = parameterEnabled("demo")




// DEBUG
let gui

if (parameterEnabled("debug")) {
  // ON-DEMAND IMPORT
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import
  const dat = await import("lil-gui")
  gui = new dat.GUI()
  gui.close()
}




// LOADERS
const gltf_loader = new GLTFLoader()
const hdri_loader = new RGBELoader()




// CANVAS
const canvas = document.querySelector("canvas.webgl")

// SCENE
const scene = new THREE.Scene()




// UPDATE ALL MATERIALS
const updateAllMaterials = () => {
  scene.traverse(child => {
    if (child.isMesh && child.material.isMeshStandardMaterial) {
      child.material.envMapIntensity = params.env_map_intensity
      child.castShadow = params.cast_shadow
      child.receiveShadow = params.receive_shadow
      // child.material.wireframe = true
    }
  })
}



// HDR ENVIRONMENT MAP
// hdri_loader.load('/media/dev/environment/2k.hdr', env_map => {
hdri_loader.load('/media/dev/environment/chinese_garden_2k.hdr', env_map => {
  env_map.mapping = THREE.EquirectangularReflectionMapping
  scene.environment = env_map
  scene.background = env_map
})



scene.backgroundBlurriness = params.background_blurriness
scene.backgroundIntensity = params.background_intensity

if (gui) {
  const folder_environment = gui.addFolder("Environment").close()

  folder_environment.add(params, "env_map_intensity")
    .min(0)
    .max(10)
    .step(0.001)
    .onChange(updateAllMaterials)
    .name("Environment Map Intensity")


  folder_environment.add(scene, "backgroundBlurriness").min(0).max(1).step(0.0001).name("Background Blurriness")
  folder_environment.add(scene, "backgroundIntensity").min(0).max(10).step(0.0001).name("Background Intensity")
}




// LIGHTS
const light_ambient = new THREE.AmbientLight(0xffffff, params.light_intensity_ambient)
scene.add(light_ambient)

const light_directional = new THREE.DirectionalLight(0xffffff, params.directional_light.intensity)
light_directional.position.set(
  params.directional_light.x,
  params.directional_light.y,
  params.directional_light.z
)

scene.add(light_directional)

light_directional.target.position.set(0, params.target_center, 0)
light_directional.target.updateWorldMatrix()


// DIRECTIONAL LIGHT HELPER
const light_directional_helper = new THREE.DirectionalLightHelper(light_directional, 0.2)
light_directional_helper.visible = false
scene.add(light_directional_helper)


if (gui) {
  const folder_lights = gui.addFolder("Lights").close()
  folder_lights.add(light_ambient, "intensity").min(0).max(1).step(0.001).name("Ambient Light")

  const folder_dir_light = folder_lights.addFolder("Directional Light").close()
  folder_dir_light.add(light_directional, "intensity").min(0).max(10).step(0.001).name("Intensity")
  folder_dir_light.add(light_directional.position, "x").min(-5).max(5).step(0.001).name("x")
  folder_dir_light.add(light_directional.position, "y").min(-5).max(5).step(0.001).name("y")
  folder_dir_light.add(light_directional.position, "z").min(-5).max(5).step(0.001).name("z")

  folder_dir_light.add(light_directional_helper, "visible").name("Light Helper")
}






// SHADOWS
light_directional.castShadow = params.cast_shadow
light_directional.shadow.camera.near = params.shadow_camera.near
light_directional.shadow.camera.far = params.shadow_camera.far
light_directional.shadow.camera.zoom = params.shadow_camera.zoom
light_directional.shadow.mapSize.set(512, 512)
light_directional.shadow.bias = params.shadow_camera.bias

const shadow_camera_helper = new THREE.CameraHelper(light_directional.shadow.camera)
shadow_camera_helper.visible = false
scene.add(shadow_camera_helper)


if (gui) {
  const folder_shadows = gui.addFolder("Shadows").close()
  folder_shadows.add(light_directional, "castShadow").name("Cast Shadow")
  folder_shadows.add(light_directional.shadow.camera, "near").min(0.1).max(10).step(0.001).name("Near")
  folder_shadows.add(light_directional.shadow.camera, "far").min(0.1).max(10).step(0.001).name("Far")
  folder_shadows.add(light_directional.shadow, "normalBias").min(-0.05).max(0.05).step(0.0001).name("Normal Bias")
  folder_shadows.add(light_directional.shadow, "bias").min(-0.05).max(0.05).step(0.0001).name("Shadow Bias")
  folder_shadows.add(shadow_camera_helper, "visible").name("Camera Helper")
}




// ANIMATIONS
let
  model_coin,
  mixer,
  animations,
  action

gltf_loader.load(
  // "/media/production/Crypto_Dogecoin/dogecoin.gltf",
  "/media/testing/Crypto_Dogecoin/dogecoin.gltf",

  // onLoad callback
  gltf => {
    // Animation
    animations = gltf.animations

    if (animations.length > 0) {
      // console.log("animations: ", animations)

      mixer = new THREE.AnimationMixer(gltf.scene)
      action = mixer.clipAction(gltf.animations[0])
      action.play()
    }

    model_coin = gltf.scene.children[0]
    model_coin.position.set(0, 1, 0)

    // console.log("model_coin: ", model_coin)

    // add the model to the scene
    scene.add(model_coin)

    updateAllMaterials() // -- NEEDS TO BE CALLED *AFTER* THE MODEL IS ADDED TO THE SCENE
  }
)




// SIZES
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
}

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // Update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// CAMERA
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.set(3.5, 1.5, 3.5)
scene.add(camera)

// ORBIT CONTROLS - https://threejs.org/docs/#examples/en/controls/OrbitControls
const controls = new OrbitControls(camera, canvas)
controls.target.y = params.target_center
controls.enableDamping = true
controls.enablePan = false
// controls.autoRotate = true
// controls.autoRotateSpeed = 1.75

// RENDERER
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: window.devicePixelRatio > 1
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

renderer.toneMapping = params.tone_mapping
renderer.toneMappingExposure = params.tone_mapping_exposure

renderer.useLegacyLights = params.use_legacy_lights

if (gui) {
  gui.add(renderer, "toneMapping", {
    No: THREE.NoToneMapping,
    Linear: THREE.LinearToneMapping,
    Reinhard: THREE.ReinhardToneMapping, // MORE REALISTIC
    Cineon: THREE.CineonToneMapping,
    ACESFilmic: THREE.ACESFilmicToneMapping, // DEEPER, MORE VIBRANT COLORS
  })
  .name("Tone Mapping")

  gui.add(renderer, "toneMappingExposure").min(0).max(10).step(0.001).name("Tone Mapping Exposure")
  gui.add(renderer, "useLegacyLights").name("Use Legacy Lights")
}

renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap



// ANIMATIONS - play next animation on click
document.querySelector("body").addEventListener("click", () => {
  // play next animation, looping back to the first animation when the last animation is reached
  if (mixer && animations && action) {
    const animation_index = animations.indexOf(action.getClip())
    const restart_animations = animation_index + 1 === animations.length

    action.stop()
    action = mixer.clipAction(animations[restart_animations ? 0 : animation_index + 1])
    action.play()
  }
})

// MAIN RENDER LOOP
const clock = new THREE.Clock()

let
  previous_time = 0,
  elapsed_time = 0,
  delta_time = 0

const tick = () => {
  elapsed_time = clock.getElapsedTime()
  delta_time = elapsed_time - previous_time
  previous_time = elapsed_time

  // UPDATE ANIMATIONS
  mixer?.update(delta_time)

  if (model_coin && model_coin.isObject3D) {
    model_coin.rotation.y += 0.1 * delta_time
  }

  // UPDATE CONTROLS
  controls.update()

  // RENDER
  renderer.render(scene, camera)

  window.requestAnimationFrame(tick)
}

tick()
