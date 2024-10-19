//# TESTING ENDPOINTS
export const testSimpleEndpoint = async () => {
    try {
        const response = await fetch("https://api.somnipro.io/", {
            method: "GET",
        });
        const text = await response.text();
        console.log("Test endpoint response:", text);
        // alert(`Test endpoint response: ${text}`); // Add this line to show the response in an alert
    } catch (error) {
        console.error("Error testing simple endpoint:", error);
        alert(`Error testing simple endpoint: ${error}`); // Add this line to show the error in an alert
    }
};

export const transcribe_endpoint = async (transcriptionFile: File) => {
    try {
        if (!transcriptionFile) {
            throw new Error("No file selected for transcription");
        }

        const formData = new FormData();
        formData.append("file", transcriptionFile);

        console.log("Sending request to: https://api.somnipro.io/transcribe/");
        console.log("Request payload:", formData);

        const response = await fetch("https://api.somnipro.io/transcribe/", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log("Response received:", result);
        alert(`Test transcribe endpoint response: ${JSON.stringify(result)}`);
    } catch (error) {
        console.error("Error testing transcribe endpoint:", error);
        alert(`Error testing transcribe endpoint: ${error}`);
    }
};
