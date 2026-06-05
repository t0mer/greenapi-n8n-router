export interface Route {
  chatId: string;
  name: string;
  targetUrls: string[];
}

export interface RouteCreate {
  chat_id: string;
  name: string;
  target_urls: string[];
}

export interface RouteUpdate {
  chat_id: string;
  name?: string;
  target_urls: string[];
}
