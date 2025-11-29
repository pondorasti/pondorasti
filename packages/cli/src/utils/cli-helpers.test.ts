import { describe, expect, test, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { failHandler } from "./cli-helpers"
import type { Argv } from "yargs"

describe("failHandler", () => {
  let mockExit: ReturnType<typeof spyOn>
  let mockConsoleError: ReturnType<typeof spyOn>
  let mockConsoleLog: ReturnType<typeof spyOn>
  let mockShowHelp: ReturnType<typeof mock>
  let mockYargs: Argv

  beforeEach(() => {
    // Mock process.exit to throw instead of exiting
    mockExit = spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`)
    })

    mockConsoleError = spyOn(console, "error").mockImplementation(() => {})
    mockConsoleLog = spyOn(console, "log").mockImplementation(() => {})

    mockShowHelp = mock(() => {})
    mockYargs = { showHelp: mockShowHelp } as unknown as Argv
  })

  afterEach(() => {
    mockExit.mockRestore()
    mockConsoleError.mockRestore()
    mockConsoleLog.mockRestore()
  })

  test("shows help and exits 0 when no command provided", () => {
    expect(() => {
      failHandler("Not enough non-option arguments: got 0, need at least 1", undefined, mockYargs)
    }).toThrow("process.exit(0)")

    expect(mockShowHelp).toHaveBeenCalledWith("log")
    expect(mockConsoleError).not.toHaveBeenCalled()
  })

  test("shows help and exits 0 when message is undefined", () => {
    expect(() => {
      failHandler(undefined, undefined, mockYargs)
    }).toThrow("process.exit(0)")

    expect(mockShowHelp).toHaveBeenCalledWith("log")
  })

  test("shows help and exits 0 when message is null", () => {
    expect(() => {
      failHandler(null, undefined, mockYargs)
    }).toThrow("process.exit(0)")

    expect(mockShowHelp).toHaveBeenCalledWith("log")
  })

  test("shows error and help, exits 1 for unknown argument", () => {
    const msg = "Unknown argument: foo"

    expect(() => {
      failHandler(msg, undefined, mockYargs)
    }).toThrow("process.exit(1)")

    expect(mockConsoleError).toHaveBeenCalledWith(msg)
    expect(mockConsoleLog).toHaveBeenCalled() // blank line
    expect(mockShowHelp).toHaveBeenCalledWith("log")
  })

  test("shows error message and exits 1 when error provided", () => {
    const error = new Error("Something went wrong")

    expect(() => {
      failHandler(undefined, error, mockYargs)
    }).toThrow("process.exit(1)")

    expect(mockConsoleError).toHaveBeenCalledWith("Error:", "Something went wrong")
  })

  test("shows message with help and exits 1 for generic message", () => {
    const msg = "Some validation error"

    expect(() => {
      failHandler(msg, undefined, mockYargs)
    }).toThrow("process.exit(1)")

    expect(mockConsoleError).toHaveBeenCalledWith(msg)
    expect(mockShowHelp).toHaveBeenCalledWith("error")
  })

  test("error takes precedence over message", () => {
    const error = new Error("Error message")
    const msg = "Generic message"

    expect(() => {
      failHandler(msg, error, mockYargs)
    }).toThrow("process.exit(1)")

    // Should show error, not the generic message path
    expect(mockConsoleError).toHaveBeenCalledWith("Error:", "Error message")
  })
})
