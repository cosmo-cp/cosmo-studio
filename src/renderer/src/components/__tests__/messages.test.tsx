import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import type {UIMessage} from "ai";
import {Messages} from "@/components/messages";
import {StoreProvider} from "@/lib/store/store-provider";
import {createMockAppDataSource} from "@/test/mock-app-data-source";

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

describe("Messages", () => {
    it("bounds the conversation and exposes a scrollable viewport", async () => {
        vi.stubGlobal("ResizeObserver", ResizeObserverMock);

        render(
            <StoreProvider appDataSource={createMockAppDataSource()}>
                <div className="h-96">
                    <Messages chatId="chat-1" messages={[] as UIMessage[]} status="ready" />
                </div>
            </StoreProvider>
        );

        const conversation = screen.getByRole("log");
        expect(conversation).toHaveClass("h-full", "min-h-0");
        expect(conversation.querySelector(".overflow-y-auto")).not.toBeNull();
        expect(await screen.findByText("Start a conversation")).toBeInTheDocument();
    });
});
