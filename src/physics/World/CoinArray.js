import Coin from "./Coin"
import * as CANNON from "cannon-es"

let instance

export default class CoinArray {
  static TAG = "CoinArray"

  static #PARAMS = {
    MAX_COINS: 50,
  }

  // PROPERTIES
  sound_enabled = false
  model_path

  // PRIVATE PROPERTIES
  #ready = false

  #coins = []
  #object3D
  #scene
  #world

  #sound_coin_1 = new Audio("/media/dev/sounds/sword9.mp3")
  #sound_coin_2 = new Audio("/media/dev/sounds/sword10.mp3")
  #sound_is_playing = false

  // CONSTRUCTOR
  constructor(object3D_coin, scene, world) {
    if (!object3D_coin || !scene || !world) {
      console.error(CoinArray.TAG, "MISSING PARAMETERS")
      return
    }

    if (instance) {
      return instance
    }

    // SET SINGLETON INSTANCE
    instance = this

    // SET PROPERTIES
    this.#object3D = object3D_coin
    this.#scene = scene
    this.#world = world

    this.#sound_coin_1.onended = () => this.#sound_is_playing = false
    this.#sound_coin_2.onended = () => this.#sound_is_playing = false

    this.#ready = true
  }

  // PUBLIC METHODS
  addCoin() {
    if (!this.#ready) {
      return
    }

    let coin

    // CREATE NEW COIN
    if (this.#coins.length < CoinArray.#PARAMS.MAX_COINS) {
      coin = new Coin(this.#object3D)
      coin.physics_body.addEventListener("collide", this.#playSound)
      this.#coins.push(coin)
      this.#scene.add(coin.object3D)
      this.#world.addBody(coin.physics_body)
    }

    // REUSE EXISTING COIN
    else {
      coin = this.#coins.find((coin) => !coin.is_active)

      if (!coin) {

        // USE FIRST SLEEPING COIN
        coin = this.#coins.find((coin) => coin.physics_body.sleepState === CANNON.Body.SLEEPING)

        // IF NO SLEEPING COINS, USE FIRST ACTIVE COIN
        if (!coin) {
          coin = this.#coins[0]
        }
      }

      coin.is_active = true
      coin.object3D.visible = true
      coin.physics_body.wakeUp()
      coin.initializeLocation()
    }
  }

  dispose() {
    if (this.#coins.length === 0) {
      return
    }

    // MAKE A LIST TEXTURES
    const textures = []
    const coin = this.#coins[0] // ALL COINS USE THE SAME TEXTURES

    coin.object3D.traverse(child => {
      if (child.isMesh && child.material.isMaterial) {
        Object.keys(child.material).forEach(key => {
          if (child.material[key] && child.material[key].isTexture) {
            textures.push(child.material[key])
          }
        })
      }
    })

    const unique_textures = [...new Set(textures)]

    // RESET/DISPOSE COINS
    this.#coins.forEach(coin => {
      coin.physics_body.removeEventListener("collide", this.#playSound)
      this.#scene.remove(coin.object3D)
      this.#world.removeBody(coin.physics_body)
      coin.dispose()
    })

    // DISPOSE TEXTURES
    unique_textures.forEach(texture => {
      texture.dispose()
    })

    this.#object3D = null
    this.#coins.length = 0
    this.#ready = false
  }

  replaceModel(object3D_coin) {
    this.#object3D = object3D_coin
    this.#ready = true
  }

  update() {
    if (!this.#ready) {
      return
    }

    // UPDATE ACTIVE COINS
    this.#coins.forEach((coin) => {
      coin.update()

      // FOR COINS THAT HAVE FALLEN OFF THE PLATFORM -- MAKE INACTIVE
      if (coin.physics_body.position.y < -50) {
        coin.is_active = false
        coin.object3D.visible = false
        coin.physics_body.sleep()
      }
    })
  }

  // PRIVATE METHODS
  #playSound = collision => {
    if (!this.#ready || !this.sound_enabled) {
      return
    }

    const impact_velocity = collision.contact.getImpactVelocityAlongNormal()

    if (impact_velocity > 1.5 && !this.#sound_is_playing) {
      let sound = Math.random() > 0.5 ? this.#sound_coin_1 : this.#sound_coin_2

      sound.volume = Math.min(impact_velocity / 10, 1)
      sound.currentTime = 0

      let promise = sound.play()

      // REQUIRED FOR AUTOPLAY POLICY
      if (promise) {
        promise
          .then(() => {
            this.#sound_is_playing = true
          })
          .catch(error => {
            // console.error(CoinArray.TAG, error)
            this.#sound_is_playing = false
          })
      }
    }
  }
}