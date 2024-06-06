import {StandardResponse, SubtitleData} from "@/schemas/SubtitleMessageSchema";

export async function sendSubtitles(subtitleData: SubtitleData): Promise<StandardResponse> {
    const res: Response = await fetch('/api/v1/subtitles', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(subtitleData)
    })

    if (!res.ok) throw new Error(`API ERROR: Fallo al enviar los subtitlos`)
    return await res.json();
}