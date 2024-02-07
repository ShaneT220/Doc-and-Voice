# Doc-and-Voice

Description:
This project was created to test the abilities of speech-to-text functionality, Pinecone's relationship database, and OpenAI's LLM. If run correctly and environment variables are updated, the user should have a Document Q&A chatbot as well as a discrepancy detector at their disposal.

Pre-requisites:
- Azure Account with access to a blob storage
- Pinecone Account for their vector database
- OpenAI Account for the LLM (GPT-4 preferred)

## How to run

1. Go into Doc-and-Voice/app/frontend and run: `npm install` in your terminal.

2. Once packages are installed, run: `npm run build`.

3. When the build is finished, go to the ../backend folder and run: `pip install -r requirements.txt`.

4. Once finished, run: `python app.py`.
   Note: Running `python app.py` will execute both the frontend code and the backend code.

5. Open Chrome.