export async function rewriteText(text) {
    const profile = JSON.parse(localStorage.getItem("profile_Selected"));
    let prompt = `Rewrite this text:\n\n"${text}"\n\n`;

    prompt += `Style: ${profile.style}\n`;
    if (profile.uxWriting) prompt += `- Optimize for UX Writing\n`;
    if (profile.cognitiveBias) prompt += `- Apply cognitive biases\n`;
    if (profile.addEmojis) prompt += `- Add emojis where appropriate\n`;

    try {
        // Show loading indicator
        document.getElementById("loadingIndicator").style.display = "block";

        const response = await fetch("https://api.openai.com/v1/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer YOUR_OPENAI_KEY`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4",
                prompt: prompt,
                max_tokens: 200
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].text.trim();
    } catch (error) {
        console.error("Error rewriting text:", error);
        return "An error occurred while rewriting the text.";
    } finally {
        // Hide loading indicator
        document.getElementById("loadingIndicator").style.display = "none";
    }
}