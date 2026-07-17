export interface Sender {
  id: string;
  fullname: string;
  email: string;
}

export interface ChatWindowProps {
  room: ISelectedRoom;
  sender: Sender;
  onBack?: () => void;
}

export interface ISelectedRoom {
  id: string;
  name: string;
}
