# import whisper
# from youtubeDownload import youtube_to_mp4
# import tiktoken
import pinecone
import random
import uuid
import openai
import datetime
def random_uuid():
    return str(uuid.UUID(bytes=bytes(random.getrandbits(8) for _ in range(16)), version=4))

pinecone.init(api_key="75589d87-a9f6-444f-9723-793ef8f6fcd8", environment="us-east1-gcp")
index = pinecone.Index("biggus-diccus")

# model = whisper.load_model('base.en',download_root="./base.en.pt")

# def num_tokens_from_string(string: str, encoding_name: str) -> int:
#     """Returns the number of tokens in a text string."""
#     encoding = tiktoken.get_encoding(encoding_name)
#     num_tokens = len(encoding.encode(string))
#     return num_tokens

def get_embedding(text):
    model = "text-embedding-ada-002"
    question_vector = openai.Embedding.create(input= str(text), engine= model)['data'][0]['embedding']       

    return question_vector


def addAudioEmbeddingToPinecone(embedding,text):
    random.seed(text)
    current_datetime = datetime.datetime.now()
    print(type)
    # [{'id': 'id1', 'values': [1.0, 2.0, 3.0], 'metadata': {'key': 'value'}}
    index.upsert([{
                'id': random_uuid(),
                'values': embedding,
                'metadata': {"embedding_type": "transcript",
                            "token_size": 0,
                            "timestamp": current_datetime,
                            "text": text}
                }], namespace='audio')
    return


# def mp4_to_embedding(audioData):
#     output = model.transcribe(audioData, fp16=False, language='English')
#     # output = model.transcribe(path, fp16=False, language='English')

#     embeddings = []
#     output_segments = output["segments"]
#     currT = ""
#     currPara = ""
#     currTime = 0
#     for i in output_segments:
#         if any([x in i["text"] for x in ["?",".","!"]]):
#             currPara = currPara+currT
#             if len(currPara) >= 1000:
#                 embedding = {
#                                 'doctype': "audio",
#                                 'name': "vid1",
#                                 'time': (currTime,i["end"]), # no start on page 0
#                                 'tokens': num_tokens_from_string(currPara, "cl100k_base"),
#                                 'text': currPara,
#                                 'embedding': get_embedding(currPara, engine='text-embedding-ada-002')
#                             }
#                 embeddings.append(embedding)
#                 currT=i["text"]
#                 currPara = ""
#                 currTime = 0
#             else:
#                 currT=i["text"]
#         else:
#             currT+=i["text"]
#             if currTime==0:
#                 currTime = i["start"]
#     #Adding this to prevent skipping the last part of output
#     currPara = currPara+currT
#     embedding = {
#                     'doctype': "audio",
#                     'name': "vid1",
#                     'time': (currTime,i["end"]), # no start on page 0
#                     'tokens': num_tokens_from_string(currPara, "cl100k_base"),
#                     'text': currPara,
#                     'embedding': get_embedding(currPara, engine='text-embedding-ada-002')
#                 }
#     embeddings.append(embedding)

#     return embeddings


