import { AskRequest, AskResponse, ChatRequest, EverythingResponse } from "./models";

export async function askApi(options: AskRequest): Promise<AskResponse> {
    const response = await fetch("/ask", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            question: options.question,
            approach: options.approach,
            overrides: {
                semantic_ranker: options.overrides?.semanticRanker,
                semantic_captions: options.overrides?.semanticCaptions,
                top: options.overrides?.top,
                temperature: options.overrides?.temperature,
                prompt_template: options.overrides?.promptTemplate,
                prompt_template_prefix: options.overrides?.promptTemplatePrefix,
                prompt_template_suffix: options.overrides?.promptTemplateSuffix,
                exclude_category: options.overrides?.excludeCategory
            }
        })
    });

    const parsedResponse: AskResponse = await response.json();
    if (response.status > 299 || !response.ok) {
        throw Error(parsedResponse.error || "Unknown error");
    }

    return parsedResponse;
}

export async function chatApi(options: ChatRequest): Promise<AskResponse> {
    const response = await fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            history: options.history,
            approach: options.approach,
            overrides: {
                semantic_ranker: options.overrides?.semanticRanker,
                semantic_captions: options.overrides?.semanticCaptions,
                top: options.overrides?.top,
                temperature: options.overrides?.temperature,
                prompt_template: options.overrides?.promptTemplate,
                prompt_template_prefix: options.overrides?.promptTemplatePrefix,
                prompt_template_suffix: options.overrides?.promptTemplateSuffix,
                exclude_category: options.overrides?.excludeCategory,
                suggest_followup_questions: options.overrides?.suggestFollowupQuestions
            }
        })
    });

    const parsedResponse: AskResponse = await response.json();
    if (response.status > 299 || !response.ok) {
        throw Error(parsedResponse.error || "Unknown error");
    }

    return parsedResponse;
}

export function getCitationFilePath(citation: string): string {
    return `/content/${citation}`;
}

export async function sendTranscriptToAPI(recordedText: string, endpoint: string): Promise<AskResponse> {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            recorded_text: recordedText
        })
    });

    let parsedResponse: AskResponse;
    if (endpoint !== "/processEverything") {
        parsedResponse = await response.json();
    } else {
        const everythingResponse: EverythingResponse = await response.json();
        parsedResponse = {
            answer: `Oppose: \n ${everythingResponse.oppose} \n\n Summarize: \n ${everythingResponse.summarize} \n\n Support: \n ${everythingResponse.support}`,
            thoughts: "Question:<br><br><br>Prompt:<br>",
            data_points: []
            // error: ""
        };
    }

    return parsedResponse;
}
