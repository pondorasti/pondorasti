// Source: https://youtu.be/D6EiRSRhsbQ
import { GlowParticle } from "./glowParticle.js"

const colors = [
  { r: 45, g: 74, b: 227 }, // blue
  { r: 255, g: 104, b: 248 }, // pupple
  { r: 44, g: 209, b: 252 }, // skyblue
  { r: 54, g: 233, b: 84 }, // green
]

class GradientRenderer {
  constructor() {
    this.canvas = document.getElementById("background")
    this.ctx = this.canvas.getContext("2d")

    this.totalParticles = 20
    this.particles = []
    this.maxRadius = 900
    this.minRadius = 400

    window.addEventListener("resize", this.resize.bind(this), false)
    this.resize()

    window.requestAnimationFrame(this.animate.bind(this))
  }

  resize() {
    // Note: adjusting for pixelRatio is unnecessary and too resource heave for retina displays

    // get viewport size
    this.stageWidth = document.body.clientWidth
    this.stageHeight = document.body.clientHeight

    // set dimensions
    this.canvas.width = this.stageWidth
    this.canvas.height = this.stageHeight

    // animation effect
    this.ctx.globalCompositeOperation = "saturation"

    this.createParticles()
  }

  createParticles() {
    let curColor = 0
    this.particles = []

    for (let i = 0; i < this.totalParticles; i += 1) {
      const item = new GlowParticle(
        Math.random() * this.stageWidth,
        Math.random() * this.stageHeight,
        Math.random() * (this.maxRadius - this.minRadius) + this.minRadius,
        colors[curColor]
      )

      if (++curColor >= colors.length) {
        curColor = 0
      }

      this.particles[i] = item
    }
  }

  animate() {
    window.requestAnimationFrame(this.animate.bind(this))

    this.ctx.clearRect(0, 0, this.stageWidth, this.stageHeight)

    for (let i = 0; i < this.totalParticles; i += 1) {
      const item = this.particles[i]
      item.animate(this.ctx, this.stageWidth, this.stageHeight)
    }
  }
}

new GradientRenderer()
