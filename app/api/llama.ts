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

export async function summarize(transcript: string) {
    try {
        const ws = new WebSocket(`${API_URL}/ws/summarize`);

        return new Promise((resolve, reject) => {
            ws.onopen = () => {
                ws.send(
                    JSON.stringify({
                        transcript: transcript,
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

export async function describeImage(
    image: string,
    systemPrompt: string = "You're an expert at describing images in detail.",
    userPrompt: string = "Please provide a detailed description of this image."
) {
    try {
        const ws = new WebSocket(`${API_URL}/ws/llama-image`);

        return new Promise((resolve, reject) => {
            ws.onopen = () => {
                ws.send(
                    JSON.stringify({
                        system_prompt: systemPrompt,
                        user_prompt: userPrompt,
                        image_base64: image,
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