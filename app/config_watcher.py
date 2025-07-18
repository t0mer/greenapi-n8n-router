from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from threading import Thread
import time
from config_loader import load_config

class ConfigHandler(FileSystemEventHandler):
    def __init__(self, path: str, callback: callable):
        self.path = path
        self.callback = callback

    def on_modified(self, event):
        if event.src_path.endswith(self.path):
            config = load_config(self.path)
            self.callback(config)

def start_config_watcher(config_path: str, on_reload: callable) -> None:
    def run():
        handler = ConfigHandler(config_path, on_reload)
        observer = Observer()
        observer.schedule(handler, path="config", recursive=False)
        observer.start()
        try:
            while observer.is_alive():
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
        observer.join()

    Thread(target=run, daemon=True).start()
