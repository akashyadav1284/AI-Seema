import urllib.request
import os

video_dir = "../data/videos"
os.makedirs(video_dir, exist_ok=True)
video_path = os.path.join(video_dir, "demo.mp4")

if not os.path.exists(video_path):
    print("Downloading sample video...")
    # A short, free test video from W3C
    url = "https://www.w3schools.com/html/mov_bbb.mp4"
    urllib.request.urlretrieve(url, video_path)
    print("Download complete.")
else:
    print("Sample video already exists.")
