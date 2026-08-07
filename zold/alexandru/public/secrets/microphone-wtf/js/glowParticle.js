export class GlowParticle {
  constructor(x, y, radius, rgb) {
    this.x = x
    this.y = y
    this.radius = radius
    this.rgb = rgb
    this.vx = Math.random() * 4
    this.vy = Math.random() * 4
    this.sinValue = Math.random()
  }

  animate(ctx, stageWidth, stageHeight) {
    this.sinValue += 0.01

    this.radius += Math.sin(this.sinValue)

    this.x += this.vx
    this.v += this.vy

    if (this.x < 0) {
      this.vx *= -1
      this.x += 10
    } else if (this.x > stageWidth * 1.2) {
      this.vx *= -1
      this.x -= 10
      if (this.y < 0) this.vy *= -1
      this.y += 10
    } else if (this.y > stageHeight * 1.2) {
      this.vy *= -1
      this.y -= 10
    }

    ctx.beginPath()

    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      this.radius * 0.01,
      this.x,
      this.y,
      this.radius
    )
    gradient.addColorStop(0, `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, 1)`)
    gradient.addColorStop(1, `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, 0)`)

    ctx.fillStyle = gradient
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    ctx.fill()
  }
}
