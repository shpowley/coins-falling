import * as THREE from "three"
import * as CANNON from "cannon-es"

export default class Coin {
  static TAG = "Coin"

  static #PARAMS = {
    SEGMENTS: 16,
    MASS: 0.1, // 0.1
    POSITION_Z: 12.0,
    RANDOM_RANGE_XY: 1.3,
  }

  static #PHYSICS_ROTATION_OFFSET = new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, 0))

  // PROPERTIES
  object3D // THREE.Object3D
  physics_body // CANNON.Body
  is_active = false

  // PRIVATE PROPERTIES
  #bounds // THREE.Vector3
  #is_valid = false
  #quaternion_offset = new THREE.Quaternion()

  // CONSTRUCTOR
  constructor(object3D) {
    if (object3D && object3D.isObject3D) {
      this.is_active = true
      this.#is_valid = true

      this.object3D = object3D.clone()

      // GET BOUNDS
      const bounding_box = new THREE.Box3().setFromObject(this.object3D)
      this.#bounds = bounding_box.getSize(new THREE.Vector3())

      // CREATE PHYSICS BODY
      const physics_shape = new CANNON.Cylinder(
        this.#bounds.x * 0.5,
        this.#bounds.y * 0.5,
        this.#bounds.z,
        Coin.#PARAMS.SEGMENTS
      )

      this.physics_body = new CANNON.Body({
        mass: Coin.#PARAMS.MASS,
        shape: physics_shape,
      })

      this.physics_body.allowSleep = true
      this.physics_body.sleepSpeedLimit = 0.3

      // SET RANDOM INITIAL POSITION & ROTATION
      this.initializeLocation()
    }
  }

  // PUBLIC METHODS

  // DISPOSE
  dispose() {
    if (this.#is_valid) {
      // this.#is_valid = false
      // this.is_active = false
      // this.object3D.visible = false

      // if (this.object3D.isMesh) {
      //   this.object3D.geometry.dispose()
      //   this.object3D.material.dispose()
      // }

      this.object3D.traverse(child => {
        if (child.geometry) {
          child.geometry.dispose()
        }

        if (child.material) {
          Object.keys(child.material).forEach(key => {
            if (child.material[key] && child.material[key].isTexture) {
              child.material[key].dispose()
            }
          })

          child.material.dispose()
        }
      })
    }
  }

  // SYNC THREE.OBJECT3D WITH PHYSICS BODY
  update() {
    if (this.#is_valid && this.is_active) {
      this.#quaternion_offset
        .copy(this.physics_body.quaternion)
        .multiply(Coin.#PHYSICS_ROTATION_OFFSET)

      this.object3D.position.copy(this.physics_body.position)
      this.object3D.quaternion.copy(this.#quaternion_offset)
    }
  }

  // INITIALIZE LOCATION
  // - USES RANDOM INITIAL POSITION & ROTATION
  initializeLocation() {
    if (this.#is_valid) {
      this.object3D.position.set(
        THREE.MathUtils.randFloatSpread(Coin.#PARAMS.RANDOM_RANGE_XY),
        THREE.MathUtils.randInt(0, 5) + Coin.#PARAMS.POSITION_Z,
        THREE.MathUtils.randFloatSpread(Coin.#PARAMS.RANDOM_RANGE_XY),
      )

      this.physics_body.position.copy(this.object3D.position)

      this.physics_body.quaternion.setFromEuler(
          Math.PI * THREE.MathUtils.randFloatSpread(1),
          Math.PI * THREE.MathUtils.randFloatSpread(1),
          Math.PI * THREE.MathUtils.randFloatSpread(1),
      )

      // ADD SLIGHT TORQUE
      this.physics_body.angularVelocity.set(
        THREE.MathUtils.randFloatSpread(10.0),
        0,
        THREE.MathUtils.randFloatSpread(10.0),
      )


      this.update()
    }
  }
}