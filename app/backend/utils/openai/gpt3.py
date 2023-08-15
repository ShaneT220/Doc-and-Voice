import openai
context = ""
question = ""

import pinecone

pinecone.init(api_key="75589d87-a9f6-444f-9723-793ef8f6fcd8", environment="us-east1-gcp")
index = pinecone.Index("biggus-diccus")

    
def detectEmbeddingDiscrepency(embedding, text):
    context = index.query(
        queries = embedding,
        top_k = 3,
        include_metadata = True
    )
    
    #whats this do???
    # context = pinecone.get(embedding)

    return findDiscrepencyGPT(text,context)


def findDiscrepencyGPT(statement,context):
    prompt = f"""
Given the following statement: "{statement}"

The following context has been found during a semantic search: "{context}"

Can you analyze and summarize the main differences between the statement and the context? Also, can you provide insights that, while not constituting legal advice, could be potentially useful in a court case?
"""
    ans = openai.ChatCompletion.create(
        model="gpt-4" ,
        messages=[
                {"role": "system", "content": "You are LegalEyes, a AI designed to assist lawyers."},
                {"role": "user", "content": prompt}
            ]
    )
    
    return ans