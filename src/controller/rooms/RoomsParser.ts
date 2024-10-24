import Room from "../rooms/Room";

export interface DatasetRecord {
	id: string;
	rooms: Room[];
}

export default class RoomsParser {}
