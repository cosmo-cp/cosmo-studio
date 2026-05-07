import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest"
import {eq} from "drizzle-orm"
import type {DatabaseManager} from "../database/DatabaseManager"
import {model, modelProvider, ModelProviderTypeEnum} from "../database/schema/modelProviderSchema"
import type {ModelProviderCreateInput, NewModel} from "../dto"
import type {SecretStore} from "../platform/SecretStore"
import {createTestDb, type TestDb} from "../test-utils/testDb"
import {ModelProviderRepository} from "./ModelProviderRepository"

const secretStore = vi.hoisted(() => ({
  isEncryptionAvailable: vi.fn(() => true),
  encrypt: vi.fn((value: string) => Buffer.from(`enc:${value}`).toString("base64")),
  decrypt: vi.fn((value: string) => Buffer.from(value, "base64").toString("utf-8")),
}))

describe("ModelProviderRepository", () => {
  let testDb: TestDb
  let repository: ModelProviderRepository

  beforeAll(async () => {
    testDb = await createTestDb()
    const databaseManager = {
      getInstance: () => testDb.db,
    } as unknown as DatabaseManager
    repository = new ModelProviderRepository(databaseManager, secretStore as SecretStore)
  })

  afterAll(async () => {
    await testDb.close()
  })

  beforeEach(async () => {
    vi.useRealTimers()
    secretStore.isEncryptionAvailable.mockReturnValue(true)
    secretStore.encrypt.mockImplementation((value: string) => Buffer.from(`enc:${value}`).toString("base64"))
    secretStore.encrypt.mockClear()
    await testDb.db.delete(model)
    await testDb.db.delete(modelProvider)
  })

  it("adds providers with encrypted api keys and lists them with/without apiKey", async () => {
    const provider: ModelProviderCreateInput = {
      name: "OpenAI",
      apiKey: "secret",
      type: ModelProviderTypeEnum.OPENAI,
      apiUrl: "",
    }

    const models: NewModel[] = [
      {
        name: "GPT-4",
        modelId: "gpt-4",
        inputModalities: [],
        outputModalities: [],
      } as unknown as NewModel,
    ]

    const created = await repository.addProvider(provider, models)
    expect(created.name).toBe("OpenAI")
    expect(created.models).toHaveLength(1)
    expect(secretStore.encrypt).toHaveBeenCalledWith("secret")

    const expectedEncrypted = Buffer.from("enc:secret").toString("base64")
    const storedProviders = await testDb.db.select().from(modelProvider)
    expect(storedProviders[0].apiKey).toBe(expectedEncrypted)

    const withoutKey = await repository.findAll({withApiKey: false})
    expect(Object.prototype.hasOwnProperty.call(withoutKey[0], "apiKey")).toBe(false)

    const withKey = await repository.findAll({withApiKey: true})
    expect(withKey[0].apiKey).toBe(expectedEncrypted)

    const withModels = await repository.getAllWithModels()
    expect(withModels[0].models).toHaveLength(1)
    expect(Object.prototype.hasOwnProperty.call(withModels[0], "apiKey")).toBe(false)

    const byId = await repository.findProviderById(created.id)
    expect(byId?.id).toBe(created.id)
    expect(byId?.models).toHaveLength(1)
  })

  it("updates providers, encrypting api keys and replacing models when provided", async () => {
    const provider: ModelProviderCreateInput = {
      name: "OpenAI",
      apiKey: "secret",
      type: ModelProviderTypeEnum.OPENAI,
      apiUrl: "",
    }

    const created = await repository.addProvider(provider, [
      {name: "Old", modelId: "old", inputModalities: [], outputModalities: []} as unknown as NewModel,
    ])

    const updated = await repository.updateProvider(
      created.id,
      {apiKey: "new-secret", name: "Updated"} as Partial<ModelProviderCreateInput>,
      [
        {name: "New", modelId: "new", inputModalities: [], outputModalities: []} as unknown as NewModel,
        {name: "New2", modelId: "new2", inputModalities: [], outputModalities: []} as unknown as NewModel,
      ]
    )

    expect(updated.name).toBe("Updated")
    expect(updated.models.map((m) => m.modelId).sort()).toEqual(["new", "new2"])

    const [stored] = await testDb.db
      .select()
      .from(modelProvider)
      .where(eq(modelProvider.id, created.id))
      .limit(1)
    expect(stored.apiKey).toBe(Buffer.from("enc:new-secret").toString("base64"))

    const storedModels = await testDb.db.select().from(model).where(eq(model.providerId, created.id))
    expect(storedModels.map((m) => m.modelId).sort()).toEqual(["new", "new2"])
  })

  it("encrypts api key updates even when set to an empty string", async () => {
    const created = await repository.addProvider(
      {
        name: "OpenAI",
        apiKey: "secret",
        type: ModelProviderTypeEnum.OPENAI,
        apiUrl: "",
      } as ModelProviderCreateInput,
      []
    )

    await repository.updateProvider(
      created.id,
      {apiKey: ""} as Partial<ModelProviderCreateInput>
    )

    expect(secretStore.encrypt).toHaveBeenCalledWith("")
    const [stored] = await testDb.db
      .select()
      .from(modelProvider)
      .where(eq(modelProvider.id, created.id))
      .limit(1)
    expect(stored.apiKey).toBe(Buffer.from("enc:").toString("base64"))
  })

  it("falls back to base64 when encryption is unavailable", async () => {
    secretStore.isEncryptionAvailable.mockReturnValue(false)
    secretStore.encrypt.mockImplementation((value: string) => Buffer.from(value, "utf-8").toString("base64"))

    await repository.addProvider(
      {
        name: "Custom",
        apiKey: "plain",
        type: ModelProviderTypeEnum.CUSTOM,
        apiUrl: "https://custom.example",
      } as ModelProviderCreateInput,
      []
    )

    expect(secretStore.encrypt).toHaveBeenCalledWith("plain")

    const [stored] = await testDb.db.select().from(modelProvider).limit(1)
    expect(stored.apiKey).toBe(Buffer.from("plain", "utf-8").toString("base64"))
  })

  it("deletes providers by id", async () => {
    const created = await repository.addProvider(
      {
        name: "OpenAI",
        apiKey: "secret",
        type: ModelProviderTypeEnum.OPENAI,
        apiUrl: "",
      } as ModelProviderCreateInput,
      []
    )

    await repository.deleteProviderById(created.id)
    const rows = await testDb.db.select().from(modelProvider).where(eq(modelProvider.id, created.id))
    expect(rows).toEqual([])
  })

  it("returns existing models when updating without replacement", async () => {
    const provider: ModelProviderCreateInput = {
      name: "OpenAI",
      apiKey: "secret",
      type: ModelProviderTypeEnum.OPENAI,
      apiUrl: "",
    }

    const created = await repository.addProvider(provider, [
      {name: "A", modelId: "a", inputModalities: [], outputModalities: []} as unknown as NewModel,
      {name: "B", modelId: "b", inputModalities: [], outputModalities: []} as unknown as NewModel,
    ])

    const updated = await repository.updateProvider(created.id, {name: "Updated"} as Partial<ModelProviderCreateInput>)
    expect(updated.name).toBe("Updated")
    expect(updated.models).toHaveLength(2)

    const [storedProvider] = await testDb.db.select().from(modelProvider).where(eq(modelProvider.id, created.id)).limit(1)
    const models = await repository.getModels(storedProvider as never)
    expect(models.map((m) => m.modelId).sort()).toEqual(["a", "b"])
  })

  it("finds duplicates when all stored fields match exactly", async () => {
    const provider: ModelProviderCreateInput = {
      name: "OpenAI",
      apiKey: "secret",
      type: ModelProviderTypeEnum.OPENAI,
      apiUrl: "",
    }

    await repository.addProvider(provider, [])
    const [stored] = await testDb.db.select().from(modelProvider).limit(1)

    const duplicates = await repository.findDuplicates({
      ...provider,
      apiKey: stored.apiKey,
    })
    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].id).toBe(stored.id)
  })
})
