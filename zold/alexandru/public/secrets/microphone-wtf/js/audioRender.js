// DOM Elements
const button = document.getElementById("play-button")
const canvas = document.getElementById("audio")
const ctx = canvas.getContext("2d")

button.onclick = () => {
  requestStartAudio()
}

// Constants
const canvasSize = 500
const fftSize = 512
const centerX = canvas.width / 2
const centerY = canvas.height / 2
const radius = canvas.width * 0.4
const barWidth = 2.5
const barHeight = 2.5
const secondsInterval = 30000
const needleStep = (2 * Math.PI) / secondsInterval
const maxDecibelLevel = 80
const needleTopMargin = canvas.width * 0.1

const transparentStyle = "rgba(255, 255, 255, 0)"
const translucentStyle = "rgba(255, 255, 255, 0.75)"
const backgroundStyle = "rgba(255, 255, 255, 0.10)"

// Variables
let requestedStream = false
let isListening = false

let stream
let analyser
let frequencyData

let startTime
let timestamps = []

async function requestStartAudio() {
  if (!requestedStream) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      requestedStream = true
      isListening = !isListening
      if (isListening) startAudio()
    } catch (err) {
      alert("Microphone permissions denied!")
    }
  } else {
    isListening = !isListening
    if (isListening) startAudio()
    // isListening = false
    // TODO: stop
  }
}

function startAudio() {
  // create nodes
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  const audioSource = audioCtx.createMediaStreamSource(stream)
  const volume = audioCtx.createGain()
  volume.gain.value = 0

  // create analyser
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = fftSize

  // connect nodes
  audioSource.connect(analyser)
  analyser.connect(volume)
  volume.connect(audioCtx.destination)

  // get array of frequency data
  frequencyData = new Uint8Array(analyser.frequencyBinCount)

  button.classList.add("magictime", "vanishOut")
  setTimeout(() => {
    canvas.style.opacity = "1"
    canvas.classList.add("magictime", "vanishIn")
  }, 1000)

  setTimeout(() => requestAnimationFrame(render), 400)
}

function render(timestamp) {
  if (startTime == null) startTime = timestamp
  const deltaTime = timestamp - startTime

  analyser.getByteFrequencyData(frequencyData)

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  configurePixelDensity()

  canvasRenderer(frequencyData, ctx, centerX, centerY, radius, deltaTime)
  requestAnimationFrame(render)
}

function canvasRenderer(frequencyData, ctx, centerX, centerY, radius, deltaTime) {
  // Outer Rings
  const numberOfBars = frequencyData.length / 2
  const barStep = (2 * Math.PI) / numberOfBars

  ctx.beginPath()
  ctx.lineWidth = barWidth
  ctx.strokeStyle = translucentStyle
  ctx.lineCap = "round"

  for (let index = 0; index < numberOfBars; index += 1) {
    const value = frequencyData[index]
    const adjustedValue = value / 3
    const amplitude = (adjustedValue + barHeight) / 2

    const x1 = centerX + (radius - amplitude) * Math.cos(barStep * index)
    const y1 = centerY + (radius - amplitude) * Math.sin(barStep * index)
    const x2 = centerX + (radius + amplitude) * Math.cos(barStep * index)
    const y2 = centerY + (radius + amplitude) * Math.sin(barStep * index)

    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
  }
  ctx.stroke()

  // Radar - Background
  const maxNeedleHeight = radius - needleTopMargin
  const beckgroundNeedleStep = (2 * Math.PI) / 8

  ctx.beginPath()
  ctx.strokeStyle = backgroundStyle

  ctx.arc(centerX, centerY, maxNeedleHeight, 0, 2 * Math.PI)
  ctx.arc(centerX, centerY, maxNeedleHeight * 0.66, 0, 2 * Math.PI)
  ctx.arc(centerX, centerY, maxNeedleHeight * 0.33, 0, 2 * Math.PI)

  for (let index = 0; index < 8; index += 1) {
    const endX = centerX + maxNeedleHeight * Math.cos(beckgroundNeedleStep * index)
    const endY = centerY + maxNeedleHeight * Math.sin(beckgroundNeedleStep * index)

    ctx.moveTo(centerX, centerY)
    ctx.lineTo(endX, endY)
  }

  ctx.stroke()

  // Radar - Graph
  const decibelLevel = getDecibelLevel(frequencyData)
  timestamps.push({ deltaTime, decibelLevel })
  let lastIndex = timestamps.length - 1
  while (timestamps[lastIndex].deltaTime - timestamps[0].deltaTime > secondsInterval) {
    timestamps.shift()
    lastIndex = timestamps.length - 1
  }

  ctx.beginPath()
  ctx.lineWidth = barWidth
  timestamps.forEach((timestamp, index) => {
    const normalizedTime = timestamp.deltaTime % secondsInterval
    const normalizedDecibelLevel = Math.min(timestamp.decibelLevel / maxDecibelLevel, 1)
    const height = radius * normalizedDecibelLevel - needleTopMargin

    const endX = centerX + height * Math.cos(needleStep * normalizedTime)
    const endY = centerY + height * Math.sin(needleStep * normalizedTime)

    if (timestamp.decibelLevel !== 0) {
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(endX, endY)
    }
  })

  // Radar - Radial Gradient
  const normalizedTime = deltaTime % secondsInterval
  const needleOffset = 0.016
  const startAngle = (normalizedTime / secondsInterval) * 2 * Math.PI - needleOffset
  const endAngle = 2 * Math.PI + startAngle

  // Needle Drift Fix Experimentation
  // const offset = startAngle * 0.1
  // const adjustedStartAngle = startAngle - offset
  // const adjustedEndAngle = 2 * Math.PI + adjustedStartAngle + offset

  const gradient = ctx.createConicalGradient(centerX, centerY, startAngle, endAngle)

  gradient.addColorStop(1, translucentStyle)
  gradient.addColorStop(0, transparentStyle)

  ctx.strokeStyle = gradient.pattern
  // ctx.strokeStyle = translucentStrokeStyle
  ctx.stroke()

  // Rader - Needle (deprecated)
  const normalizedDecibelLevel = Math.min(decibelLevel / maxDecibelLevel, 1)
  const needleHeight = radius * normalizedDecibelLevel - needleTopMargin

  const x = centerX + needleHeight * Math.cos(needleStep * normalizedTime)
  const y = centerY + needleHeight * Math.sin(needleStep * normalizedTime)

  ctx.beginPath()
  ctx.strokeStyle = translucentStyle
  ctx.lineWidth = barWidth
  ctx.lineCap = "round"

  ctx.moveTo(centerX, centerY)
  ctx.lineTo(x, y)
  // ctx.stroke()
}

// Source: https://github.com/apm1467/html5-mic-visualizer/blob/bb146b117f1bf8c5b0850cb3db942b6d3ae8d209/js/index.js#L54-L62
// Explanation: https://stackoverflow.com/a/38983553/7897036
function getDecibelLevel(frequencyData) {
  let total = 0
  frequencyData.forEach((value) => {
    total += value * value
  })

  const rms = Math.sqrt(total / frequencyData.length)
  const offset = 20
  const decibel = 20 * Math.log10(rms) + offset

  return Math.max(decibel, 0) // sanity check
}

function configurePixelDensity() {
  // set css dimensions
  canvas.style.width = canvasSize + "px"
  canvas.style.height = canvasSize + "px"

  const pixelRatio = window.devicePixelRatio

  // normalize dimensions based on pixelRatio
  canvas.width = Math.floor(canvasSize * pixelRatio)
  canvas.height = Math.floor(canvasSize * pixelRatio)
  ctx.scale(pixelRatio, pixelRatio)
}
