import { useCallback, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

/** Deve coincidere con DEFAULT_PAGE_SIZE del server. */
const PAGE_SIZE = 50;

interface HistoryMessage {
    id: string;
}

/**
 * Cronologia di un canale o di una conversazione, a pagine di 50 messaggi.
 * La prima pagina contiene i più recenti; "Carica messaggi precedenti" aggiunge
 * quelli più vecchi senza spostare la vista.
 *
 * `queryKey` resta quello usato altrove per invalidare la cronologia
 * (es. `["/api/channels", id, "messages"]`), `url` è l'endpoint da chiamare.
 */
export function useMessageHistory<T extends HistoryMessage>(
    queryKey: readonly unknown[],
    url: string,
    scrollContainerRef: RefObject<HTMLDivElement>,
) {
    const query = useInfiniteQuery({
        queryKey,
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) => {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
            if (pageParam) params.set("before", pageParam);
            return apiRequest<T[]>("GET", `${url}?${params}`);
        },
        // Una pagina piena vuol dire che potrebbero esserci messaggi più vecchi.
        getNextPageParam: (lastPage) =>
            lastPage.length === PAGE_SIZE ? lastPage[0]?.id : undefined,
    });

    // Pagine dalla più vecchia alla più recente, senza doppioni dopo un aggiornamento.
    const messages = useMemo(() => {
        if (!query.data) return undefined;
        const seen = new Set<string>();
        const result: T[] = [];
        for (const page of [...query.data.pages].reverse()) {
            for (const message of page) {
                if (!seen.has(message.id)) {
                    seen.add(message.id);
                    result.push(message);
                }
            }
        }
        return result;
    }, [query.data]);

    // Quando arrivano messaggi più vecchi in cima, mantengo fermo ciò che l'utente stava leggendo.
    const heightBeforeLoad = useRef<number | null>(null);

    const loadOlder = useCallback(() => {
        const container = scrollContainerRef.current;
        heightBeforeLoad.current = container ? container.scrollHeight : null;
        void query.fetchNextPage().then((result) => {
            // Se il caricamento fallisce non c'è niente da compensare.
            if (result.isFetchNextPageError) heightBeforeLoad.current = null;
        });
    }, [query, scrollContainerRef]);

    const newestId = messages?.[messages.length - 1]?.id;
    const lastNewestId = useRef<string | undefined>(undefined);

    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !messages) return;

        if (heightBeforeLoad.current !== null) {
            container.scrollTop += container.scrollHeight - heightBeforeLoad.current;
            heightBeforeLoad.current = null;
        } else if (newestId !== lastNewestId.current) {
            // Nuovo messaggio o primo caricamento: vado in fondo.
            container.scrollTop = container.scrollHeight;
        }
        lastNewestId.current = newestId;
    }, [messages, newestId, scrollContainerRef]);

    /**
     * Aggiunge un messaggio arrivato in tempo reale (o appena inviato) alla pagina più recente,
     * senza ricaricare le pagine già aperte. Se c'è già, non fa nulla.
     */
    const appendMessage = useCallback(
        (message: T) => {
            queryClient.setQueryData<InfiniteData<T[], string | undefined>>(queryKey, (data) => {
                if (!data || data.pages.some((page) => page.some((m) => m.id === message.id))) {
                    return data;
                }
                const [newest = [], ...older] = data.pages;
                return { ...data, pages: [[...newest, message], ...older] };
            });
        },
        // queryKey è un array nuovo a ogni render: conta il suo contenuto.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [JSON.stringify(queryKey)],
    );

    return {
        appendMessage,
        messages,
        isLoading: query.isLoading,
        isError: query.isError,
        hasOlder: query.hasNextPage,
        isLoadingOlder: query.isFetchingNextPage,
        loadOlderFailed: query.isFetchNextPageError,
        loadOlder,
    };
}
