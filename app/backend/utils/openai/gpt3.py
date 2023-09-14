import openai
context = ""
question = ""

import pinecone

pinecone.init(api_key="75589d87-a9f6-444f-9723-793ef8f6fcd8", environment="us-east1-gcp")
index = pinecone.Index("biggus-diccus")
MODEL = "gpt-3.5-turbo-16k"

def getEmbeddingOppose(embedding, text):
    context = index.query(
        vector = embedding,
        top_k = 10,
        include_metadata = True
    )
    
    prompt = f"""Given the following statement: "{text}"

The following context has been found during a semantic search: "{context}"

Can you analyze and summarize the main differences between the statement and the context using bullet points? Also, can you provide insights that, while not constituting legal advice, could be potentially useful in a court case?
"""
    ans = openai.ChatCompletion.create(
        model=MODEL,
        messages=[
                {"role": "system", "content": "You a AI designed to assist lawyers in a short and easy to read fashion."},
                {"role": "user", "content": prompt}
            ]
    )
    
    return ans['choices'][0]['message']['content']

def getEmbeddingSupport(embedding, text):
    context = index.query(
        vector = embedding,
        top_k = 10,
        include_metadata = True
    )
    
    prompt = f"""Given the following statement: "{text}"

The following context has been found during a semantic search: "{context}"

Analyze and summarize the ways the context supports the statement. Return the answer as concisely as possible in bullet points. If no piece of context supports the statement, say “There is no supporting documentation found.” Don't make anything up.
"""
    ans = openai.ChatCompletion.create(
        model=MODEL,
        messages=[
                {"role": "system", "content": "You a AI designed to assist lawyers in a short and easy to read fashion."},
                {"role": "user", "content": prompt}
            ]
    )
    
    return ans['choices'][0]['message']['content']

def getAudioSummarize(text):
    prompt =  f"""Summarize the following minute worth of audio in bullet points. Gear the Summarize towards informing attorneys and keep it as concise and clear as possible.

Transcript:
{text}"""
    
    ans = openai.ChatCompletion.create(
        model=MODEL,
        messages=[
                {"role": "system", "content": "You a AI designed to assist lawyers in a short and easy to read fashion."},
                {"role": "user", "content": prompt}
            ]
    )
    
    return ans['choices'][0]['message']['content']