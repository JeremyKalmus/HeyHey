// Lobby UI Components
export { HomePage, type HomePageProps } from './HomePage';
export { CreateRoomModal, type CreateRoomModalProps } from './CreateRoomModal';
export { JoinRoomModal, type JoinRoomModalProps } from './JoinRoomModal';
export { RoomLobby, type RoomLobbyProps } from './RoomLobby';
export { GameSettings, type GameSettingsProps } from './GameSettings';
export { PlayerList, type PlayerListProps, type LobbyPlayer } from './PlayerList';
export { Button, type ButtonProps } from './Button';
export { Modal, type ModalProps } from './Modal';
export { Input, type InputProps } from './Input';

// Player Customization
export { ColorSelector, type ColorSelectorProps } from './ColorSelector';
export { PlayerCustomization, type PlayerCustomizationProps, type PlayerCustomizationData } from './PlayerCustomization';

// Re-export Avatar components from ui
export {
  Avatar,
  AvatarSelector,
  type AvatarProps,
  type AvatarSelectorProps,
  type AvatarString,
  type AvatarIcon,
  type AvatarShape,
  DEFAULT_AVATAR,
} from '../ui/Avatar';
