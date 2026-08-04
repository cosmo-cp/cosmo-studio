function buildRpcUrl(group: string, handler: string): string {
    const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    return `${base}/rpc/${group}/${handler}`;
}

export async function callRpc<T>(group: string, handler: string, args: unknown[]): Promise<T> {
    const response = await fetch(buildRpcUrl(group, handler), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: superjson.stringify({ args }),
    });
    const envelope = superjson.parse<RpcEnvelope<T>>(await response.text());
    if (!envelope.ok) {
        throw new Error(envelope.error.message || 'HTTP RPC request failed.');
    }
    if (!response.ok) {
        throw new Error(response.statusText || 'HTTP RPC request failed.');
    }
    return envelope.result;
}
