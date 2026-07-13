import os

def resolve_video_path(video_name):
    project_root = os.path.dirname(os.path.abspath(__file__))
    if os.path.isabs(video_name):
        return video_name if os.path.exists(video_name) else None
    candidates = [
        os.path.join(project_root, '..', 'frontend', 'public', 'assets', video_name),
        os.path.join(project_root, '..', 'public', 'assets', video_name),
        os.path.join(project_root, video_name),
    ]
    for candidate in candidates:
        if os.path.exists(candidate): return candidate
    return None

print(resolve_video_path('night_market.mp4'))
