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

        const TRANSCRIBE_ENDPOINT = "https://api.somnipro.io/transcribe/";

        console.log(`Sending request to: ${TRANSCRIBE_ENDPOINT}`);
        // console.log("Request payload:", formData);

        const response = await fetch(TRANSCRIBE_ENDPOINT, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Server Error in transcribe.ts: ${response.status} - ${errorText}`
            );
        }

        const result = await response.json();
        console.log("Response received in transcribe.ts!");
        return result; // Make sure to return the result
    } catch (error) {
        console.error("Error testing transcribe endpoint:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
};
