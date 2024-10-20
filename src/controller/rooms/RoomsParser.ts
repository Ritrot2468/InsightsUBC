import Section from "../rooms/Room";
import Room from "../rooms/Room";

export interface DatasetRecord {
	id: string;
	rooms: Room[];
}

export default class RoomsParser {

	public async findBuildingTable(doc: Document): Promise<void> {

	}

}
