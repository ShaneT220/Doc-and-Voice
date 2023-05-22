import whisper
# from youtubeDownload import youtube_to_mp4
import tiktoken

model = whisper.load_model('base.en',download_root="./base.en.pt")

def num_tokens_from_string(string: str, encoding_name: str) -> int:
    """Returns the number of tokens in a text string."""
    encoding = tiktoken.get_encoding(encoding_name)
    num_tokens = len(encoding.encode(string))
    return num_tokens

import openai
def get_embedding(text):#TODO
    model = "text-embedding-ada-002"
    question_vector = openai.Embedding.create(input= str(text), engine= model)['data'][0]['embedding']       

    return question_vector

def mp4_to_embedding(audioData):
    output = model.transcribe(audioData, fp16=False, language='English')
    # output = model.transcribe(path, fp16=False, language='English')

    embeddings = []
    output_segments = output["segments"]
    currT = ""
    currPara = ""
    currTime = 0
    for i in output_segments:
        if any([x in i["text"] for x in ["?",".","!"]]):
            currPara = currPara+currT
            if len(currPara) >= 1000:
                embedding = {
                                'doctype': "audio",
                                'name': "vid1",
                                'time': (currTime,i["end"]), # no start on page 0
                                'tokens': num_tokens_from_string(currPara, "cl100k_base"),
                                'text': currPara,
                                'embedding': get_embedding(currPara, engine='text-embedding-ada-002')
                            }
                embeddings.append(embedding)
                currT=i["text"]
                currPara = ""
                currTime = 0
            else:
                currT=i["text"]
        else:
            currT+=i["text"]
            if currTime==0:
                currTime = i["start"]
    #Adding this to prevent skipping the last part of output
    currPara = currPara+currT
    embedding = {
                    'doctype': "audio",
                    'name': "vid1",
                    'time': (currTime,i["end"]), # no start on page 0
                    'tokens': num_tokens_from_string(currPara, "cl100k_base"),
                    'text': currPara,
                    'embedding': get_embedding(currPara, engine='text-embedding-ada-002')
                }
    embeddings.append(embedding)

    return embeddings

import pinecone
import pinecone.info
index_name = "fox-v-dominion"
index = pinecone.Index(index_name=index_name)

def upsert_vectors_in_chunks(index, df, chunk_size=200):
    num_chunks = (len(df) // chunk_size) + int(len(df) % chunk_size > 0)

    for i in range(num_chunks):
        chunk_start = i * chunk_size
        chunk_end = min(chunk_start + chunk_size, len(df))
        chunk = df.iloc[chunk_start:chunk_end]
        index.upsert(vectors=zip(chunk.id, chunk.vector, chunk.metadata))
        print(f"Upserted vectors from {chunk_start} to {chunk_end - 1}")

# def addEmbeddingToPinecone(embedding):
#     index.describe_index_stats()
#     upsert_vectors_in_chunks(index, df_upsert)

#     index.describe_index_stats()
#     return pinecone.add(embedding)
