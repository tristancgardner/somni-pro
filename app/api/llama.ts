const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function promptLlama(systemPrompt: string, userPrompt: string) {
    try {
        const ws = new WebSocket(`${API_URL}/ws/llama`);

        return new Promise((resolve, reject) => {
            ws.onopen = () => {
                ws.send(
                    JSON.stringify({
                        system_prompt: systemPrompt,
                        user_prompt: userPrompt,
                    })
                );
            };

            ws.onmessage = (event) => {
                const response = JSON.parse(event.data);
                if (response.type === "error") {
                    reject(new Error(response.text));
                } else {
                    resolve(response.text);
                }
                ws.close();
            };

            ws.onerror = (error) => {
                reject(error);
            };
        });
    } catch (error) {
        console.error("WebSocket connection error:", error);
        throw error;
    }
}
