import whisper
from .youtubeDownload import youtube_to_mp4
import tiktoken

model = whisper.load_model('base.en',download_root="./base.en.pt")

def num_tokens_from_string(string: str, encoding_name: str) -> int:
    """Returns the number of tokens in a text string."""
    encoding = tiktoken.get_encoding(encoding_name)
    num_tokens = len(encoding.encode(string))
    return num_tokens

def get_embedding():#TODO
    return "WIP"

def mp4_to_embedding(path):
    output = model.transcribe(path, fp16=False, language='English')

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

def addEmbeddingToPinecone(embedding):
    return "stuff happened"
    return pinecone.add(embedding)
