import openai
context = ""
question = ""

    
def detectEmbeddingDiscrepency(embedding):
    # context = pinecone.get(embedding)
    context = "asdf"
    prompt = f"""PROOMPT TO FIND DISCREPENCYS BETWEEN AUDIO AND PREVIOUSLY EMBEDDED VECTORS{embedding}"""
    return "-9087123l;kjhafsdf"
    return askWithContext(context,prompt)




def askWithContext(question,context):
    prompt = f"""Answer the following question using only the context below. If you don't know the answer for certain, say I don't know. Explain your answer, and cite which document led to each specific component of the answer. For example, "The sky is blue [bible.pdf]"

Context:
{context}

Question: {question}
Answer:"""
    ans = openai.Completion.create(
        engine="text-davinci-003",
        prompt=prompt,
        temperature=0.3,
        max_tokens=1000,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0,
        stop=None)['choices'][0]['text']
    
    return ans