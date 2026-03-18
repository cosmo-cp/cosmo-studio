import {render, screen, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {type JSX, useEffect} from "react";
import {useAppDispatch, useAppSelector} from "@/lib/store/hooks";
import {
    clearConversationSearch,
    setConversationSearchQuery,
} from "@/lib/store/main-chat-page-slice";
import {StoreProvider} from "@/lib/store/store-provider";

function StateProbe(): JSX.Element {
    const dispatch = useAppDispatch();
    const state = useAppSelector((store) => store.mainChatPage);

    useEffect(() => {
        dispatch(setConversationSearchQuery("alpha"));
        dispatch(clearConversationSearch());
    }, [dispatch]);

    return (
        <div>
            <span data-testid="history-size">{state.chatHistory.length}</span>
            <span data-testid="selected-title">{state.selectedChat?.title ?? "none"}</span>
            <span data-testid="search-query">{state.searchQuery || "empty"}</span>
        </div>
    );
}

describe("StoreProvider", () => {
    it("provides the main chat page Redux store to the page subtree", async () => {
        render(
            <StoreProvider>
                <StateProbe />
            </StoreProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId("history-size")).toHaveTextContent("0");
        });

        expect(screen.getByTestId("selected-title")).toHaveTextContent("none");
        expect(screen.getByTestId("search-query")).toHaveTextContent("empty");
    });
});
