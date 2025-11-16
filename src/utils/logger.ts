import * as fs from "fs"
import * as path from "path"
import { homedir } from "os"

const LOG_DIR = path.join(homedir(), ".pondorasti")
const LOG_PATH = path.join(LOG_DIR, "install.log")

let logFileHandle: fs.WriteStream | null = null

function initializeLogging() {
  // Create log directory if it doesn't exist
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }

  // Create or append to log file
  logFileHandle = fs.createWriteStream(LOG_PATH, { flags: "a" })

  // Write session header
  const timestamp = new Date().toISOString()
  writeToLog(`\n\n=== Pondorasti Session Started: ${timestamp} ===\n`)
}

function closeLogging() {
  if (logFileHandle) {
    const timestamp = new Date().toISOString()
    writeToLog(`\n=== Pondorasti Session Ended: ${timestamp} ===\n`)
    logFileHandle.end()
    logFileHandle = null
  }
}

function writeToLog(message: string) {
  if (logFileHandle) {
    logFileHandle.write(message + "\n")
  }
}

function logCommand(command: string) {
  writeToLog(`[EXEC] ${command}`)
}

function logResult(exitCode: number, stdout: string, stderr: string) {
  writeToLog(`[EXIT] ${exitCode}`)
  if (stdout.trim()) {
    writeToLog(`[OUT] ${stdout}`)
  }
  if (stderr.trim()) {
    writeToLog(`[ERR] ${stderr}`)
  }
}

function logInfo(message: string) {
  writeToLog(`[INFO] ${message}`)
}

function logError(message: string) {
  writeToLog(`[ERROR] ${message}`)
}

function logWarning(message: string) {
  writeToLog(`[WARN] ${message}`)
}

function getLogPath(): string {
  return LOG_PATH
}

export { initializeLogging, closeLogging, logCommand, logResult, logInfo, logError, logWarning, getLogPath }
