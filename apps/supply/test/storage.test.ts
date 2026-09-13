import { env } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/d1"
import { expect, test } from "vitest"
import { assets } from "../src/server/schema"

test("migrations and Drizzle work against the real D1 binding", async () => {
  const db = drizzle(env.DB)
  await db
    .insert(assets)
    .values({ hash: "test", key: "images/test", contentType: "image/png", size: 3, createdAt: 1 })
  expect((await db.select().from(assets))[0].key).toBe("images/test")
})

test("R2 stores and retrieves image bytes", async () => {
  await env.IMAGES.put("images/test", new Uint8Array([1, 2, 3]))
  const object = await env.IMAGES.get("images/test")
  expect(new Uint8Array(await object!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
})
