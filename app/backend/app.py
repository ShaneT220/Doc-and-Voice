import os
import mimetypes
import logging
import openai
from flask import Flask, request, jsonify
from approaches.retrievethenread import RetrieveThenReadApproach
from approaches.readretrieveread import ReadRetrieveReadApproach
from approaches.readdecomposeask import ReadDecomposeAsk
from approaches.chatreadretrieveread import ChatReadRetrieveReadApproach
from azure.storage.blob import BlobServiceClient
import pinecone
from decouple import config
from utils.embedding.transcript import get_embedding, addEmbeddingToPinecone
from utils.openai.gpt3 import getEmbeddingSupport,getAudioSummarize,getEmbeddingOppose
from werkzeug.utils import secure_filename

# Replace these with your own values, either in environment variables or directly here
AZURE_STORAGE_ACCOUNT = os.environ.get("AZURE_STORAGE_ACCOUNT") or config("AZURE_STORAGE_ACCOUNT")
AZURE_STORAGE_CONTAINER = os.environ.get("AZURE_STORAGE_CONTAINER") or config("AZURE_STORAGE_CONTAINER")
AZURE_STORAGE_KEY = os.environ.get("AZURE_STORAGE_KEY") or config("AZURE_STORAGE_KEY")

OPENAI_GPT_DEPLOYMENT = os.environ.get("AZURE_OPENAI_GPT_DEPLOYMENT") or "davinci"
OPENAI_CHATGPT_DEPLOYMENT = os.environ.get("AZURE_OPENAI_CHATGPT_DEPLOYMENT") or "chat"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY") or config("OPENAI_API_KEY")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY") or config("PINECONE_API_KEY")
PINECONE_ENVIORMENT = os.environ.get("PINECONE_ENVIORMENT") or config("PINECONE_ENVIORMENT")
PINECONE_INDEX = os.environ.get("PINECONE_INDEX") or config("PINECONE_INDEX")


KB_FIELDS_CONTENT = os.environ.get("KB_FIELDS_CONTENT") or "doctype"
KB_FIELDS_CATEGORY = os.environ.get("KB_FIELDS_CATEGORY") or "category"
KB_FIELDS_SOURCEPAGE = os.environ.get("KB_FIELDS_SOURCEPAGE") or "page"

# Used by the OpenAI SDK
openai.api_version = "2020-11-07"
openai.api_key = OPENAI_API_KEY

# initiate pinecone
pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_ENVIORMENT)

search_client = pinecone.Index(index_name=PINECONE_INDEX)
blob_client = BlobServiceClient(
    account_url=f"https://{AZURE_STORAGE_ACCOUNT}.blob.core.windows.net", 
    credential=AZURE_STORAGE_KEY)
blob_container = blob_client.get_container_client(AZURE_STORAGE_CONTAINER)

# Various approaches to integrate GPT and external knowledge, most applications will use a single one of these patterns
# or some derivative, here we include several for exploration purposes
ask_approaches = {
    "rtr": RetrieveThenReadApproach(search_client, "davinci", KB_FIELDS_SOURCEPAGE, KB_FIELDS_CONTENT),
    "rrr": ReadRetrieveReadApproach(search_client, "davinci", KB_FIELDS_SOURCEPAGE, KB_FIELDS_CONTENT),
    "rda": ReadDecomposeAsk(search_client, "davinci", KB_FIELDS_SOURCEPAGE, KB_FIELDS_CONTENT)
}

chat_approaches = {
    "rrr": ChatReadRetrieveReadApproach(search_client, OPENAI_CHATGPT_DEPLOYMENT, OPENAI_GPT_DEPLOYMENT, KB_FIELDS_SOURCEPAGE, KB_FIELDS_CONTENT)
}

app = Flask(__name__)

@app.route("/", defaults={"path": "index.html"})
@app.route("/<path:path>")
def static_file(path):
    return app.send_static_file(path)

# Serve content files from blob storage from within the app to keep the example self-contained. 
# *** NOTE *** this assumes that the content files are public, or at least that all users of the app
# can access all the files. This is also slow and memory hungry.
@app.route("/content/<path>")
def content_file(path):
    blob = blob_container.get_blob_client(path).download_blob()
    mime_type = blob.properties["content_settings"]["content_type"]
    if mime_type == "application/octet-stream":
        mime_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    return blob.readall(), 200, {"Content-Type": mime_type, "Content-Disposition": f"inline; filename={path}"}
    
@app.route("/ask", methods=["POST"])
def ask():
    approach = request.json["approach"]
    try:
        impl = ask_approaches.get(approach)
        if not impl:
            return jsonify({"error": "unknown approach"}), 400
        r = impl.run(request.json["question"], request.json.get("overrides") or {})
        return jsonify(r)
    except Exception as e:
        logging.exception("Exception in /ask")
        return jsonify({"error": str(e)}), 500
    
@app.route("/chat", methods=["POST"])
def chat():
    approach = request.json["approach"]
    try:
        impl = chat_approaches.get(approach)
        if not impl:
            return jsonify({"error": "unknown approach"}), 400
        r = impl.run(request.json["history"], request.json.get("overrides") or {})
        return jsonify(r)
    except Exception as e:
        logging.exception("Exception in /chat")
        return jsonify({"error": str(e)}), 500


@app.route("/processOppose", methods=["POST"])
def processOppose():
    try:
        transcript = request.json["recorded_text"]
        embedding = get_embedding(transcript)

        #We get the Oppose before adding it to pinecone to not get the source embedding
        output = getEmbeddingOppose(embedding,transcript) #see if the claims in the embedding conflicts with anything

        #We now add it to pinecone
        addEmbeddingToPinecone(embedding,transcript)
        r =  {"data_points": "", "answer": output, "thoughts": f"Question:<br><br><br>Prompt:<br>"}
        return  jsonify(r)
    except Exception as e:
        logging.exception("Exception in /processOppose")
        return jsonify({"error": str(e)}), 500
    
@app.route("/processSupport", methods=["POST"])
def processSupport():
    try:
        transcript = request.json["recorded_text"]
        embedding = get_embedding(transcript)

        #We get the Oppose before adding it to pinecone to not get the source embedding
        output = getEmbeddingSupport(embedding,transcript) #see if the claims in the embedding conflicts with anything

        #We now add it to pinecone
        addEmbeddingToPinecone(embedding,transcript)
        r =  {"data_points": "", "answer": output, "thoughts": f"Question:<br><br><br>Prompt:<br>"}
        return  jsonify(r)
    except Exception as e:
        logging.exception("Exception in /processSummarize")
        return jsonify({"error": str(e)}), 500

@app.route("/processSummarize", methods=["POST"])
def processSummarize():
    try:
        transcript = request.json["recorded_text"]
        embedding = get_embedding(transcript)

        #We get the Oppose before adding it to pinecone to not get the source embedding
        output = getAudioSummarize(transcript) #see if the claims in the embedding conflicts with anything

        #We now add it to pinecone
        addEmbeddingToPinecone(embedding,transcript)
        r =  {"data_points": "", "answer": output, "thoughts": f"Question:<br><br><br>Prompt:<br>"}
        return  jsonify(r)
    except Exception as e:
        logging.exception("Exception in /processSummarize")
        return jsonify({"error": str(e)}), 500
   
@app.route("/processEverything", methods=["POST"])
def processEverything():
    try:
        transcript = request.json["recorded_text"]
        embedding = get_embedding(transcript)

        oppose_output = getEmbeddingOppose(embedding,transcript) #see if the claims in the embedding conflicts with anything
        support_output = getEmbeddingSupport(embedding,transcript) #see if the claims in the embedding conflicts with anything
        summarize_output = getAudioSummarize(transcript) #see if the claims in the embedding conflicts with anything

        #We now add it to pinecone
        addEmbeddingToPinecone(embedding,transcript)
        
        r =  {"oppose": oppose_output, "support":support_output, "summarize":summarize_output}
        return  jsonify(r)
    except Exception as e:
        logging.exception("Exception in /processEverything")
        return jsonify({"error": str(e)}), 500 
if __name__ == "__main__":
    app.run(debug=1)
