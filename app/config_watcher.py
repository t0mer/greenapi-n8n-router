from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from threading import Thread
import time
from config_loader import load_config

class ConfigHandler(FileSystemEventHandler):
    """
    Handles file system events for the configuration file.
    Calls the provided callback when the file is modified.
    """
    def __init__(self, path: str, callback: callable):
        self.path = path
        self.callback = callback

    def on_modified(self, event):
        """
        Triggered when the configuration file is modified.
        Reloads the configuration and calls the callback.
        """
        if event.src_path.endswith(self.path):
            config = load_config(self.path)
            self.callback(config)

def start_config_watcher(config_path: str, on_reload: callable) -> None:
    """
    Starts a watcher thread to monitor changes to the configuration file.
    Calls the provided callback when the file is modified.

    Args:
        config_path (str): Path to the configuration file.
        on_reload (callable): Callback function to execute when the file is modified.
    """
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
