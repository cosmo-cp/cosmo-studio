import { describe, expect, it, vi } from "vitest"

const exposeInMainWorld = vi.fn()
const invoke = vi.fn()
const send = vi.fn()
const on = vi.fn()
const removeAllListeners = vi.fn()

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld,
  },
  ipcRenderer: {
    invoke,
    send,
    on,
    removeAllListeners,
  },
}))

vi.mock("electron-log/renderer", () => ({
  default: {
    scope: vi.fn(() => ({
      info: vi.fn(),
    })),
  },
}))

describe("preload index", () => {
  it("exposes the API surface to the renderer", async () => {
    const { api } = await import("./api")
    await import("./index")

    expect(exposeInMainWorld).toHaveBeenCalledWith("api", api)
    expect(Object.keys(api)).toEqual([
      "chat",
      "modelProvider",
      "message",
      "persona",
      "command",
      "mcpServer",
      "webSearch",
      "streaming",
    ])
    expect(api).not.toHaveProperty("ipcRenderer")
  })

  it("wires streaming listeners and removes them", async () => {
    const { api } = await import("./api")

    const onDataListener = vi.fn()
    api.streaming.onData("chan", onDataListener)
    expect(on).toHaveBeenCalledWith("chan-data", expect.any(Function))
    const onDataSubscription = on.mock.calls.find(([channel]) => channel === "chan-data")?.[1]
    expect(onDataSubscription).toEqual(expect.any(Function))
    ;(onDataSubscription as unknown as (event: unknown, data: unknown) => void)({}, {chunk: 1})
    expect(onDataListener).toHaveBeenCalledWith({chunk: 1})

    const onEndListener = vi.fn()
    api.streaming.onEnd("chan", onEndListener)
    expect(on).toHaveBeenCalledWith("chan-end", onEndListener)

    const onErrorListener = vi.fn()
    api.streaming.onError("chan", onErrorListener)
    expect(on).toHaveBeenCalledWith("chan-error", expect.any(Function))

    const subscription = on.mock.calls.find(([channel]) => channel === "chan-error")?.[1]
    expect(subscription).toEqual(expect.any(Function))
    ;(subscription as unknown as (event: unknown, error: unknown) => void)({}, "boom")
    expect(onErrorListener).toHaveBeenCalledWith("boom")

    api.streaming.removeListeners("chan")
    expect(removeAllListeners).toHaveBeenCalledWith("chan-error")
    expect(removeAllListeners).toHaveBeenCalledWith("chan-end")
    expect(removeAllListeners).toHaveBeenCalledWith("chan-data")
  })
})
