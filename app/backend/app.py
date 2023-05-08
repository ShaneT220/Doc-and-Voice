import os
import mimetypes
import time
import logging
import openai
from flask import Flask, request, jsonify
from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient
from approaches.retrievethenread import RetrieveThenReadApproach
from approaches.readretrieveread import ReadRetrieveReadApproach
from approaches.readdecomposeask import ReadDecomposeAsk
from approaches.chatreadretrieveread import ChatReadRetrieveReadApproach
from azure.storage.blob import BlobServiceClient
import pinecone
from decouple import config

# Replace these with your own values, either in environment variables or directly here
AZURE_STORAGE_ACCOUNT = os.environ.get("AZURE_STORAGE_ACCOUNT") or config("AZURE_STORAGE_ACCOUNT")
AZURE_STORAGE_CONTAINER = os.environ.get("AZURE_STORAGE_CONTAINER") or config("AZURE_STORAGE_CONTAINER")
AZURE_STORAGE_KEY = os.environ.get("AZURE_STORAGE_KEY") or config("AZURE_STORAGE_KEY")

# AZURE_SEARCH_SERVICE = os.getenv("AZURE_SEARCH_SERVICE")
# AZURE_SEARCH_INDEX = os.getenv("AZURE_SEARCH_INDEX")
OPENAI_GPT_DEPLOYMENT = os.environ.get("AZURE_OPENAI_GPT_DEPLOYMENT") or "davinci"
OPENAI_CHATGPT_DEPLOYMENT = os.environ.get("AZURE_OPENAI_CHATGPT_DEPLOYMENT") or "chat"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY") or config("OPENAI_API_KEY")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY") or config("PINECONE_API_KEY")
PINECONE_ENVIORMENT = os.environ.get("PINECONE_ENVIORMENT") or config("PINECONE_ENVIORMENT")
PINECONE_INDEX = os.environ.get("PINECONE_INDEX") or config("PINECONE_INDEXS")


KB_FIELDS_CONTENT = os.environ.get("KB_FIELDS_CONTENT") or "doctype"
KB_FIELDS_CATEGORY = os.environ.get("KB_FIELDS_CATEGORY") or "category"
KB_FIELDS_SOURCEPAGE = os.environ.get("KB_FIELDS_SOURCEPAGE") or "page"

# Use the current user identity to authenticate with Azure OpenAI, Cognitive Search and Blob Storage (no secrets needed, 
# just use 'az login' locally, and managed identity when deployed on Azure). If you need to use keys, use separate AzureKeyCredential instances with the 
# keys for each service
# If you encounter a blocking error during a DefaultAzureCredntial resolution, you can exclude the problematic credential by using a parameter (ex. exclude_shared_token_cache_credential=True)
# azure_credential = DefaultAzureCredential()

# Used by the OpenAI SDK
openai.api_version = "2022-12-01"
openai.api_key = OPENAI_API_KEY

# initiate pinecone
pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_ENVIORMENT)

# Comment these two lines out if using keys, set your API key in the OPENAI_API_KEY environment variable instead
# openai.api_type = "azure_ad"
# openai_token = azure_credential.get_token("https://cognitiveservices.azure.com/.default")
# openai.api_key = openai_token.token

# Set up clients for Cognitive Search and Storage
# search_client = SearchClient(
#     endpoint=f"https://{AZURE_SEARCH_SERVICE}.search.windows.net",
#     index_name=AZURE_SEARCH_INDEX,
#     credential=azure_credential)
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
    # ensure_openai_token()
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
    # ensure_openai_token()
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

# def ensure_openai_token():
#     global openai_token
#     if openai_token.expires_on < int(time.time()) - 60:
#         openai_token = azure_credential.get_token("https://cognitiveservices.azure.com/.default")
#         openai.api_key = openai_token.token
from .utils.embedding.transcript import mp4_to_embedding, addEmbeddingToPinecone
from .utils.openai.gpt3 import detectEmbeddingDiscrepency
from werkzeug import secure_filename
@app.route("/processMp4", methods=["POST"])
async def processMp4():
    f = request.files['file']
    f.save(secure_filename(f.filename))
    embedding = mp4_to_embedding(f.filename)

    output = detectEmbeddingDiscrepency(embedding) #see if the claims in the embedding conflicts with anything
    addEmbeddingToPinecone(embedding)
    print(output)
    return output

if __name__ == "__main__":
    app.run()