FROM python:3.9-slim-buster

WORKDIR /app
RUN apt-get update \
  && apt-get install -y wget \
  && rm -rf /var/lib/apt/lists/* 

RUN apt-get update && \ 
    apt-get install -y curl && \
    curl -sL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs


RUN apt-get update && apt-get install -y git
RUN pip install torch==1.11.0+cu113 torchvision==0.12.0+cu113 -f https://download.pytorch.org/whl/torch_stable.html
RUN pip install ffmpeg-python
RUN apt install ffmpeg -y
RUN pip install git+https://github.com/openai/whisper.git
RUN pip install openai
RUN pip install numpy

COPY ./app/backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY ./app/frontend /app/frontend

WORKDIR /app/frontend
RUN npm install && \
npm run build
WORKDIR /app

COPY ./app/backend /app/backend

EXPOSE 5000

CMD ["sh", "-c", "cd backend && python app.py"]