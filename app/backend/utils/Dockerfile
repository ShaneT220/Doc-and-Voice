FROM python:3.8-slim-buster

WORKDIR /code
RUN apt-get update \
  && apt-get install -y wget \
  && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y git
RUN pip install torch==1.11.0+cu113 torchvision==0.12.0+cu113 -f https://download.pytorch.org/whl/torch_stable.html


RUN pip install ffmpeg-python
RUN apt install ffmpeg -y
RUN pip install git+https://github.com/openai/whisper.git
RUN pip install openai
RUN pip install numpy
# Download small model
# RUN wget https://openaipublic.azureedge.net/main/whisper/models/9ecf779972d90ba49c06d968637d720dd632c55bbf19d441fb42bf17a411e794/base.en.pt
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY utils .
# COPY utils/embedding/youtubeDownload.py .
# COPY utils/embedding/transcript.py .
# COPY utils/embedding/base.en.pt .

# CMD python transcript.py

COPY . /code/app
# COPY tiny.en.pt .
# COPY medium.en.pt .

# CMD python app/embedding_utils/transcript.py

# For when you use nginx in k8s or just good general knowledge
# https://fastapi.tiangolo.com/deployment/docker/#behind-a-tls-termination-proxy
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]