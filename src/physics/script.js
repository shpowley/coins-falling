import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js"
// import * as dat from "lil-gui" // CHANGED TO ON-DEMAND IMPORT (SEE BELOW)
import * as CANNON from "cannon-es"
// import CannonDebugger from "cannon-es-debugger" // CHANGED TO ON-DEMAND IMPORT (SEE BELOW)
import CoinArray from "./World/CoinArray.js"




// SHORTCUT FOR QUERY SELECTOR
const $QS = selector => document.querySelector(selector)
const URL_PARAMS = new URLSearchParams(window.location.search)

// GET URL PARAMETER KEY
const parameterEnabled = key => {
  const param = URL_PARAMS.get(key)

  if (param === null || param === "false") {
    return false
  }
  else {
    return true
  }
}




// PARAMETERS
const asset_paths = {
  model_bitcoin: "/media/testing/Crypto_Bitcoin/bitcoin.gltf",
  model_dogecoin: "/media/testing/Crypto_Dogecoin/dogecoin.gltf",
  model_ethereum: "/media/testing/Crypto_Ethereum/ethereum.gltf",
  model_mario_coin: "/media/testing/mario_coin/coin.gltf",

  hdri_urban_alley: "/media/dev/environment/urban_alley_01_2k.hdr",
  hdri_chinese_garden: "/media/dev/environment/chinese_garden_2k.hdr",

  background_digital: "/media/dev/backgrounds/digital_blue.jpg",

  image_fullscreen: "/media/dev/images/fullscreen.png",
  image_resize: "/media/dev/images/resize.png",
  image_sound_on: "/media/dev/images/sound.png",
  image_sound_off: "/media/dev/images/sound-off.png",
  image_auto_on: "/media/dev/images/hourglass.png",
  image_auto_off: "/media/dev/images/hourglass-off.png",
  image_gyro_on: "/media/dev/images/gyro.png",
  image_gyro_off: "/media/dev/images/gyro-off.png",

  image_bitcoin: "/media/dev/images/select/bitcoin.png",
  image_dogecoin: "/media/dev/images/select/doge.png",
  image_ethereum: "/media/dev/images/select/eth.png",
  image_mario_coin: "/media/dev/images/select/mario.png",
  image_roman_coin: "/media/dev/images/select/roman.png",
}

const ENUM_LICENSE = {
  CC_BY_4: 1,
  CC_0: 2,
}

const copyright_data = {
  bitcoin: {
    name: "Bitcoin - Crypto Coin (Sketchfab)",
    url: "https://skfb.ly/oMFYO",
    author: "PXLmesh LLC",
    author_url: "https://sketchfab.com/pxlmesh",
  },

  dogecoin: {
    name: "Dogecoin - Crypto Coin (Sketchfab)",
    url: "https://skfb.ly/oM7UQ",
    author: "PXLmesh LLC",
    author_url: "https://sketchfab.com/pxlmesh",
  },

  ethereum: {
    name: "Ethereum - Crypto Coin (Sketchfab)",
    url: "https://skfb.ly/oMG6t",
    author: "PXLmesh LLC",
    author_url: "https://sketchfab.com/pxlmesh",
  },

  mario: {
    name: "Mario Coin (Sketchfab)",
    url: "https://skfb.ly/6XUM9",
    author: "Alucard",
    author_url: "https://sketchfab.com/Ronald.Browen",
    license: ENUM_LICENSE.CC_BY_4,
  },

  hdri_chinese: {
    name: "Chinese Garden (Poly Haven)",
    url: "https://polyhaven.com/a/chinese_garden",
    author: "Andreas Mischok",
    author_url: "https://www.artstation.com/andreasmischok",
    license: ENUM_LICENSE.CC_0,
  },

  digital_blue: {
    name: "3d render of a low poly plexus design - network communications",
    url: "https://www.freepik.com/free-photo/3d-render-low-poly-plexus-design-network-communications_17560612.htm",
    author: "kjpargeter",
    author_url: "https://www.freepik.com/author/kjpargeter",
  },

  kenny_sound: {
    name: "Kenney.nl Audio Assets",
    url: "https://kenney.nl/assets",
    author: "kenny.nl",
    author_url: "https://kenney.nl/",
  },
}

const params = {
  env_map_intensity: 1.2,
  light_intensity_ambient: 0,
  background_blurriness: 0,
  background_intensity: 0,
  target_center: 1,
  tone_mapping: THREE.ReinhardToneMapping,
  tone_mapping_exposure: 1.5,
  use_legacy_lights: false,
}






// DEBUG
let debug_mode = parameterEnabled("debug")
let gui

if (debug_mode) {
  // ON-DEMAND IMPORT
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import
  const dat = await import("lil-gui")
  gui = new dat.GUI()
  gui.close()
}






// FUNCTION TO ADD COINS AT RANDOM INTERVALS
let
  auto_add_coins = true,
  timer_id

const addCoinRandom = () => {
  if (!coin_array) {
    console.warn("COIN ARRAY NOT YET LOADED")
    timer_id = null
    return
  }

  if (auto_add_coins) {
    const random_interval = Math.random() * 1200 + 800 // 0.8 - 2.0 seconds

    timer_id = setTimeout(() => {
      coin_array?.addCoin()
      addCoinRandom()
    }, random_interval)
  }
}






// LOADERS
const gltf_loader = new GLTFLoader()
const hdri_loader = new RGBELoader()




// CANVAS
const canvas = $QS("canvas.webgl")

// SCENE
const scene = new THREE.Scene()

// BACKGROUND TEXTURE
// https://threejs.org/manual/#en/backgrounds (good reference code) >> 2d static background (three.js OR CSS) or 3d environment map
// https://www.w3schools.com/html/html_images_background.asp (CSS background image)

// - CSS APPROACH, BUT SET IN JS
// - NOTE THAT THIS IS SET ON THE CANVAS HTML ELEMENT, NOT THE HTML BODY..
canvas.style.background = `url("${asset_paths.background_digital}") no-repeat center center`
canvas.style.backgroundSize = "cover"

// - THREE.JS APPROACH
// const background_texture = new THREE.TextureLoader().load(asset_paths.background_image)
// background_texture.minFilter = THREE.LinearFilter
// scene.background = background_texture

const ENUM_BACKGROUND = {
  STATIC_IMAGE: 0,
  ENVIRONMENT_MAP: 1,
  FLAT_COLOR: 2,
}

let background_mode = ENUM_BACKGROUND.STATIC_IMAGE

const cycleBackgroundMode = () => {
  // CYCLE THROUGH BACKGROUND MODES 0 > 1 > 2 > 0
  background_mode = (background_mode + 1) % 3

  switch (background_mode) {
    case ENUM_BACKGROUND.STATIC_IMAGE:
      scene.background = null
      scene.backgroundIntensity = 0
      break

    case ENUM_BACKGROUND.ENVIRONMENT_MAP:
      scene.background = scene.environment
      scene.backgroundIntensity = 1.0
      break

    case ENUM_BACKGROUND.FLAT_COLOR:
      scene.background = scene.environment
      scene.backgroundIntensity = 0
      break
  }
}




// UPDATE ALL MATERIALS
const updateAllMaterials = () => {
  scene.traverse(child => {
    if (child.isMesh && child.material.isMeshStandardMaterial) {
      child.material.envMapIntensity = params.env_map_intensity
    }
  })
}



// HDR ENVIRONMENT MAP
hdri_loader.load(asset_paths.hdri_chinese_garden, env_map => {
  env_map.mapping = THREE.EquirectangularReflectionMapping
  scene.environment = env_map
  scene.background = null // MUST BE SET TO "null" TO USE CSS BACKGROUND IMAGE
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




// LOAD 3D MODEL
const ENUM_COIN = {
  BITCOIN: "bitcoin",
  DOGECOIN: "dogecoin",
  ETHEREUM: "ethereum",
  MARIO: "mario",
}

let
  coin_array,
  object3D_coin,
  selected_coin = URL_PARAMS.get("coin") || ENUM_COIN.MARIO,
  selected_coin_pending

const getModelPath = (coin) => {
  switch(coin) {
    case ENUM_COIN.BITCOIN:
      return asset_paths.model_bitcoin

    case ENUM_COIN.DOGECOIN:
      return asset_paths.model_dogecoin

    case ENUM_COIN.ETHEREUM:
      return asset_paths.model_ethereum

    case ENUM_COIN.MARIO:
    default:
      return asset_paths.model_mario_coin
  }
}

const loadModel = model_path => {
  gltf_loader.load(
    model_path,

    gltf => {
      object3D_coin = gltf.scene.children[0]
      updateAllMaterials() // -- NEEDS TO BE CALLED *AFTER* THE MODEL IS ADDED TO THE SCENE

      // CREATE COIN ARRAY
      if (coin_array) {
        coin_array.replaceModel(object3D_coin)
      }
      else {
        coin_array = new CoinArray(object3D_coin, scene, world)
      }

      coin_array.model_path = model_path

      addCoinRandom()
      icon_hourglass.src = asset_paths.image_auto_on
    }
  )
}

loadModel(getModelPath(selected_coin))



// PHYSICS
const WORLD_STEP = 1 / 60
const world = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world)
world.allowSleep = true
world.gravity.set(0, -9.82, 0) // Earth gravity = 9.82 m/s² (NOTE: SIM SEEMS SLOWER THAN REALITY)


const physics_material_default = new CANNON.Material("default")

const physics_contact_material = new CANNON.ContactMaterial(
  physics_material_default,
  physics_material_default,
  {
    friction: 0.01, // default: 0.3
    restitution: 0.5, // default: 0.3
  }
)

world.addContactMaterial(physics_contact_material)
world.defaultContactMaterial = physics_contact_material

// CANNON DEBUGGER
let cannon_debugger

if (debug_mode) {
  const Debugger = await import("cannon-es-debugger")
  cannon_debugger = new Debugger.default(scene, world)
}




// CREATE PHYSICS FLOOR
const createFloor = () => {
  const shape_params = {
    radius: 2.75,
    height: 0.1,
    position_y: 0.5,
  }

  // -- FLOOR IS INVISIBLE, SO NO NEED FOR THREE.JS MESH

  // THREE.JS MESH
  // const floor_geometry = new THREE.CylinderGeometry(
  //   shape_params.radius,
  //   shape_params.radius,
  //   shape_params.height,
  //   64
  // )

  // const floor_material = new THREE.MeshStandardMaterial({
  //   color: 0xFFFFFF,
  //   metalness: 0.5,
  //   roughness: 0.7,
  // })
  // const floor_mesh = new THREE.Mesh(floor_geometry, floor_material)
  // floor_mesh.position.y = shape_params.position_y
  // scene.add(floor_mesh)


  // PHYSICS SHAPE
  const floor_shape = new CANNON.Cylinder(
    shape_params.radius,
    shape_params.radius,
    shape_params.height,
    24
  )

  const floor_body = new CANNON.Body()
  floor_body.mass = 0
  floor_body.addShape(floor_shape)
  floor_body.position.y = shape_params.position_y

  world.addBody(floor_body)
}

createFloor()




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

  // UPDATE FULLSCREEN ICON
  icon_fullscreen.src = document.fullscreenElement ? asset_paths.image_resize : asset_paths.image_fullscreen
})

// CAMERA
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.set(5.0, 6.5, 5.0)
scene.add(camera)

// ORBIT CONTROLS - https://threejs.org/docs/#examples/en/controls/OrbitControls
const controls = new OrbitControls(camera, canvas)
controls.target.y = params.target_center
controls.enableDamping = true
controls.enablePan = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.5

// RENDERER
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: window.devicePixelRatio > 1,
  alpha: true,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

renderer.toneMapping = params.tone_mapping
renderer.toneMappingExposure = params.tone_mapping_exposure

renderer.useLegacyLights = params.use_legacy_lights

if (gui) {
  const folder_renderer = gui.addFolder("Renderer").close()

  folder_renderer.add(renderer, "toneMapping", {
    No: THREE.NoToneMapping,
    Linear: THREE.LinearToneMapping,
    Reinhard: THREE.ReinhardToneMapping, // MORE REALISTIC
    Cineon: THREE.CineonToneMapping,
    ACESFilmic: THREE.ACESFilmicToneMapping, // DEEPER, MORE VIBRANT COLORS
  })
  .name("Tone Mapping")

  folder_renderer.add(renderer, "toneMappingExposure").min(0).max(10).step(0.001).name("Tone Mapping Exposure")
  folder_renderer.add(renderer, "useLegacyLights").name("Use Legacy Lights")
}





// GYROSCOPE
const gyroscope = {
  enabled: false,
  x: 0,
  y: 0,
  z: 0,
}

const updateGyroData = (x, y, z) => {
  gyroscope.x = x
  gyroscope.y = y
  gyroscope.z = z
}

// SENSOR API (DOESN'T WORK ON DESKTOP, FIREFOX, OR SAFARI)
if ("Gyroscope" in window) {
  console.log("GYROSCOPE - SENSOR API: SUPPORTED")

  const sensor = new Gyroscope({ frequency: 60 })

  try {
    sensor.onerror = e => {
      if (e.error.name == "NotAllowedError") {
        console.error("PERMISSION TO ACCESS SENSOR WAS DENIED.")
      }
      else if (e.error.name == "NotReadableError") {
        console.error("CANNOT CONNECT TO THE SENSOR.")
      }

      gyroscope.enabled = false
      icon_gyro.style.display = "none"
    }

    sensor.onreading = e => {
      updateGyroData(sensor.x, sensor.y, sensor.z)
    }

    sensor.start()
    gyroscope.enabled = true
    controls.autoRotate = false
  }
  catch (error) {
    console.warn("GYROSCOPE - SENSOR API: NOT SUPPORTED")
    gyroscope.enabled = false
    icon_gyro.style.display = "none"
  }
}

// FALLBACK - POLYFILL?
// https://developer.chrome.com/en/articles/generic-sensor/
// https://github.com/kenchris/sensor-polyfills





// WINDOW DEBUG -- REMOVE
window.scene = scene
window.renderer = renderer




// UI ELEMENT INTERACTIONS
let gear_is_rotating = false // ..GEAR IS ROTATING >> SETTINGS PANEL TRANSITIONING TO OPEN

let

  // MODAL DIALOGS
  modal_copyright = $QS("#modal_copyright"),
  modal_info = $QS("#modal_info"),
  modal_settings = $QS("#modal_settings"),
  modal_qr_code = $QS("#modal_qr_code"),

  // INNER DIALOGS
  dialog_copyright = $QS("#dialog_copyright"),
  dialog_info = $QS("#dialog_info"),
  dialog_settings = $QS("#dialog_settings"),

  // COPYRIGHT
  icon_copyright = $QS("#icon_copyright"),

  // INFO
  icon_info = $QS("#icon_info"),

  // SETTINGS
  icon_gear = $QS("#icon_gear"),
  icon_fullscreen = $QS("#icon_fullscreen"),
  icon_sound = $QS("#icon_sound"),
  icon_scene = $QS("#icon_scene"),
  icon_hourglass = $QS("#icon_hourglass"),
  icon_gyro = $QS("#icon_gyro"),
  icon_qr_code = $QS("#icon_qrcode"),

  image_coin = $QS("#image_coin_select"),
  icon_select_left = $QS("#icon_left"),
  icon_select_right = $QS("#icon_right"),
  icon_select = $QS("#icon_select")

const swapCoinImage = (coin) => {
  switch(coin) {
    case ENUM_COIN.BITCOIN:
      image_coin.src = asset_paths.image_bitcoin
      break

    case ENUM_COIN.DOGECOIN:
      image_coin.src = asset_paths.image_dogecoin
      break

    case ENUM_COIN.ETHEREUM:
      image_coin.src = asset_paths.image_ethereum
      break

    case ENUM_COIN.MARIO:
    default:
      image_coin.src = asset_paths.image_mario_coin
      break
  }
}

const closeDialog = (dialog) => {
  dialog.animate([
    { opacity: 1 },
    { opacity: 0 },
  ], {
    duration: 500,
    easing: "ease-in-out",
  })
  .onfinish = () => {
    dialog.style = null
  }
}

const openDialog = (dialog) => {
  dialog.style.display = "flex"

  dialog.animate([
    { opacity: 0 },
    { opacity: 1 },
  ], {
    delay: 300,
    duration: 700,
    easing: "ease-in-out",
  })
  .onfinish = () => {
    dialog.style.opacity = 1
  }
}

// INTERACTION - PAGE VISIBILITY
// - PAUSE COIN DROP LOGIC WHEN PAGE IS HIDDEN
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    if (timer_id) {
      clearTimeout(timer_id)
      timer_id = null
    }
  }
  else {
    if (auto_add_coins) {
      addCoinRandom()
    }
  }
})

// INTERACTION - ADD MORE 3D MODELS
canvas.addEventListener("click", () => {
  coin_array?.addCoin()
})








// LIVELY WALLPAPER MODE? ..NO UI
if (parameterEnabled("wallpaper")) {
  $QS("#div_page_buttons").style.display = "none"

  openDialog(modal_copyright)

  setTimeout(() => {
    const logo = $QS("#icon_logo")

    closeDialog(modal_copyright)

    logo.animate([
      { opacity: 1 },
      { opacity: 0 },
    ], {
      duration: 500,
      easing: "ease-in-out",
    })
    .onfinish = () => {
      logo.style.display = "none"
    }

  }, 5000)
}
else {
  // INTERACTION - GEAR ICON >> SETTINGS
  icon_gear.addEventListener("click", () => {
    if (!gear_is_rotating) {
      gear_is_rotating = true

      icon_gear.animate([
        { transform: "rotate(0deg)" },
        { transform: "rotate(180deg)" },
      ], {
        duration: 1500,
        easing: "ease-in-out",
      })
      .onfinish = () => {
        gear_is_rotating = false
      }

      openDialog(modal_settings)

      selected_coin_pending = selected_coin
      swapCoinImage(selected_coin_pending)
    }
  })

  // INTERACTION - SETTINGS CLOSE
  dialog_settings.addEventListener("click", event => {
    event.stopPropagation()
  })

  modal_settings.addEventListener("click", () => {
    closeDialog(modal_settings)
  })

  // INTERACTION - FULLSCREEN ICON
  icon_fullscreen.addEventListener("click", () => {
    if (document.fullscreenElement) {
      icon_fullscreen.src = asset_paths.image_fullscreen
      document.exitFullscreen()
    }
    else {
      icon_fullscreen.src = asset_paths.image_resize
      document.documentElement.requestFullscreen()
    }
  })

  // INTERACTION - SOUND ON/OFF
  icon_sound.addEventListener("click", () => {
    if (coin_array) {
      coin_array.sound_enabled = !coin_array.sound_enabled
      icon_sound.src = coin_array.sound_enabled ? asset_paths.image_sound_on : asset_paths.image_sound_off
    }
  })

  // INTERACTION - CHANGE SCENE BACKGROUND
  // - 2D STATIC IMAGE > 3D ENVIRONMENT MAP > FLAT COLOR
  icon_scene.addEventListener("click", () => {
    cycleBackgroundMode()
  })

  // INTERACTION - AUTOMATIC COIN DROP ON/OFF
  icon_hourglass.addEventListener("click", () => {
    if (timer_id) {
      clearTimeout(timer_id)
      timer_id = null
      auto_add_coins = false
      icon_hourglass.src = asset_paths.image_auto_off
    }
    else {
      auto_add_coins = true
      addCoinRandom()
      icon_hourglass.src = asset_paths.image_auto_on
    }
  })


  // INTERACTION - GYRO ON/OFF
  icon_gyro.addEventListener("click", () => {
    gyroscope.enabled = !gyroscope.enabled
    controls.autoRotate = !gyroscope.enabled

    icon_gyro.src = gyroscope.enabled ? asset_paths.image_gyro_on : asset_paths.image_gyro_off
  })



  // INTERACTION - SHOW QR CODE
  icon_qr_code.addEventListener("click", () => {
    closeDialog(modal_settings)
    openDialog(modal_qr_code)
  })

  modal_qr_code.addEventListener("click", () => {
    closeDialog(modal_qr_code)
  })

  // INTERACTION - COIN SELECTOR
  icon_select_left.addEventListener("click", () => {
    switch(selected_coin_pending) {
      case ENUM_COIN.BITCOIN:
        selected_coin_pending = ENUM_COIN.MARIO
        break

      case ENUM_COIN.DOGECOIN:
        selected_coin_pending = ENUM_COIN.BITCOIN
        break

      case ENUM_COIN.ETHEREUM:
        selected_coin_pending = ENUM_COIN.DOGECOIN
        break

      case ENUM_COIN.MARIO:
        selected_coin_pending = ENUM_COIN.ETHEREUM
        break
    }

    swapCoinImage(selected_coin_pending)
  })

  icon_select_right.addEventListener("click", () => {
    switch(selected_coin_pending) {
      case ENUM_COIN.BITCOIN:
        selected_coin_pending = ENUM_COIN.DOGECOIN
        break

      case ENUM_COIN.DOGECOIN:
        selected_coin_pending = ENUM_COIN.ETHEREUM
        break

      case ENUM_COIN.ETHEREUM:
        selected_coin_pending = ENUM_COIN.MARIO
        break

      case ENUM_COIN.MARIO:
        selected_coin_pending = ENUM_COIN.BITCOIN
        break
    }

    swapCoinImage(selected_coin_pending)
  })

  icon_select.addEventListener("click", () => {
    let model_path

    model_path = getModelPath(selected_coin_pending)

    if (coin_array.model_path === model_path) {
      console.warn("COIN ALREADY LOADED")
      return
    }

    // PAUSE COIN DROP
    clearTimeout(timer_id)
    timer_id = null

    coin_array.dispose() // RESET COIN ARRAY

    loadModel(model_path)

    selected_coin = selected_coin_pending
  })

  // INTERACTION - INFO
  icon_info.addEventListener("click", () => {
    openDialog(modal_info)
  })

  modal_info.addEventListener("click", () => {
    closeDialog(modal_info)
  })

  dialog_info.addEventListener("click", event => {
    event.stopPropagation()
  })

  // INTERACTION - COPYRIGHT ATTRIBUTION
  icon_copyright.addEventListener("click", () => {
    openDialog(modal_copyright)
  })

  modal_copyright.addEventListener("click", () => {
    closeDialog(modal_copyright)
  })

  dialog_copyright.addEventListener("click", event => {
    event.stopPropagation()
  })
}











// ATTRIBUTION
const updateAttribution = (element, data) => {
  let text_attribution = `
    <a href="${data.url}" target="_blank">"${data.name}"</a>
    by <a href="${data.author_url}" target="_blank">${data.author}</a>
  `

  if (data.license) {
    switch (data.license) {
      case ENUM_LICENSE.CC_BY_4:
        text_attribution += ` licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank">CC-BY-4.0</a>`
        break

      case ENUM_LICENSE.CC_0:
        text_attribution += ` licensed under <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank">CC0</a>`
        break
    }
  }

  element.innerHTML = text_attribution
}

const updateAllAttributions = () => {
  updateAttribution($QS("#credits_mario"), copyright_data.mario)
  updateAttribution($QS("#credits_bitcoin"), copyright_data.bitcoin)
  updateAttribution($QS("#credits_dogecoin"), copyright_data.dogecoin)
  updateAttribution($QS("#credits_ethereum"), copyright_data.ethereum)
  updateAttribution($QS("#hdri_chinese"), copyright_data.hdri_chinese)
  updateAttribution($QS("#digital_blue"), copyright_data.digital_blue)
  updateAttribution($QS("#kenney_sounds"), copyright_data.kenny_sound)
}

updateAllAttributions()






// MAIN RENDER LOOP
const clock = new THREE.Clock()

let
  previous_time = 0,
  elapsed_time = 0,
  delta_time = 0

const tick = () => {
  if (gyroscope.enabled) {
    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), gyroscope.y * delta_time)
  }

  elapsed_time = clock.getElapsedTime()
  delta_time = elapsed_time - previous_time
  previous_time = elapsed_time

  // UPDATE PHYSICS
  coin_array?.update()
  world.step(WORLD_STEP, delta_time, 3)
  cannon_debugger?.update()

  // UPDATE CONTROLS
  controls.update()

  // RENDER
  renderer.render(scene, camera)

  window.requestAnimationFrame(tick)
}

tick()
