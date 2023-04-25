export enum STATUSES {
  AWAY = 'away',
  BUSY = 'busy',
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export class SocialMedia {
  facebook: string = '';
  twitter: string = '';
  instagram: string = '';
}

export class Message {
  constructor(public type: 'sent' | 'replies', public message: string) {}
}

export class User {
  ws: any;
  social: SocialMedia = new SocialMedia();
  id = Math.random();
  constructor(
    public name: string = '',
    public status: STATUSES = STATUSES.OFFLINE,
    public img: string = '',
    public messages: Message[] = []
  ) {}
}
