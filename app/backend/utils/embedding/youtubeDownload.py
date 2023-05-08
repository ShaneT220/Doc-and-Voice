from pytube import YouTube

def youtube_to_mp4(url):
    youtube_video_url = url
    youtube_video = YouTube(youtube_video_url)
    file_name = youtube_video.title+".mp4"

    stream = youtube_video.streams.filter(only_audio=True).first()
    stream.download(filename=file_name)
    return file_name