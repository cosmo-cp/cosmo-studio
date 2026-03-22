import {describe, expect, it, vi} from "vitest";
import type {
    WebSearchConfigSaveInput,
    WebSearchConfigView,
} from "core/dto";
import {WebSearchProviderTypeEnum} from "core/database/schema/webSearchConfigSchema";
import type {WebSearchConfigService} from "core/services/WebSearchConfigService";
import {WebSearchController} from "./WebSearchController";

describe("WebSearchController", () => {
    it("delegates config reads to the service", async () => {
        const service = {
            getConfig: vi.fn().mockResolvedValue(null),
        } as unknown as WebSearchConfigService;
        const controller = new WebSearchController(service);

        await controller.getConfig(WebSearchProviderTypeEnum.EXA);

        expect(service.getConfig).toHaveBeenCalledWith(WebSearchProviderTypeEnum.EXA);
    });

    it("delegates config writes after validation", async () => {
        const service = {
            saveConfig: vi.fn().mockResolvedValue({id: "config-id"} as WebSearchConfigView),
        } as unknown as WebSearchConfigService;
        const controller = new WebSearchController(service);
        const input: WebSearchConfigSaveInput = {
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
            apiKey: "secret",
        };

        const result = await controller.saveConfig(input);

        expect(service.saveConfig).toHaveBeenCalledWith(input);
        expect(result.id).toBe("config-id");
    });

    it("normalizes blank api keys so edits can keep the stored secret", async () => {
        const service = {
            saveConfig: vi.fn().mockResolvedValue({id: "config-id"} as WebSearchConfigView),
        } as unknown as WebSearchConfigService;
        const controller = new WebSearchController(service);

        await controller.saveConfig({
            type: WebSearchProviderTypeEnum.EXA,
            enabled: false,
            apiKey: "   ",
        });

        expect(service.saveConfig).toHaveBeenCalledWith({
            type: WebSearchProviderTypeEnum.EXA,
            enabled: false,
            apiKey: undefined,
        });
    });

    it("delegates config deletion to the service", async () => {
        const service = {
            deleteConfig: vi.fn().mockResolvedValue(undefined),
        } as unknown as WebSearchConfigService;
        const controller = new WebSearchController(service);

        await controller.deleteConfig(WebSearchProviderTypeEnum.EXA);

        expect(service.deleteConfig).toHaveBeenCalledWith(WebSearchProviderTypeEnum.EXA);
    });
});
