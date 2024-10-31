import RoomsParser from "./RoomsParser";
import fs from "fs-extra";
import Room from "./Room";
import { DatasetRecord } from "../rooms/RoomsParser";

export default class RoomDiskReader extends RoomsParser {
	constructor() {
		super();
	}

	// REQUIRES: id - name of dataset to be retrieved from disk (id IS NOT IN datasets ALREADY!!!!)
	//           datasets - sets you'll be mapping new DatasetRecord to
	// EFFECTS: Retrieves the sections associated with the dataset id on disk and turned into Sections objects and maps
	//          them to sectionsDatabase with their associated id.
	// OUTPUT: VOID
	// public async logNewDatasetFromDiskToMap(id: string, roomsDatabase: Map<string, Room[]>): Promise<void> {
	// 	const newDataset = await this.turnDatasetToRoom(id);
	// 	const numRows = newDataset.rooms.length;
	//
	// 	if (numRows === 0) {
	// 		throw new InsightError("No valid Section");
	// 	}
	// 	// update member variables
	// 	roomsDatabase.set(newDataset.id, newDataset.rooms);
	// }

	public async turnDatasetToRoom(id: string): Promise<DatasetRecord> {
		// tracks number of sections in a given dataset and is initialized to 0

		// where each promise is appended to for each course object
		const allPromises: any[] = [];
		const rooms: Room[] = [];

		// list of all courses under the dataset file
		const path = await fs.readdir(`./data/${id}/rooms/`);
		for (const room of path) {
			const promise = fs
				.readJson(`./data/${id}/rooms/${room}`)
				.then(async (file) => {
					// turn room JSON file to Room objects
					const newRoom: Room = Room.fromJSON(file);
					rooms.push(newRoom);
					//console.log(newRoom.getID());

					return { id, file };
				})
				.catch((err) => {
					throw err;
				});

			allPromises.push(promise);
		}

		await Promise.all(allPromises);
		const datasetRecord: DatasetRecord = { id: id, rooms: rooms };
		return datasetRecord;
	}

	public async mapMissingRooms(roomIDs: string[], roomsDatabase: Map<string, Room[]>): Promise<Map<string, Room[]>> {
		const allPromises: Promise<DatasetRecord>[] = [];
		// the id of all datasets not currently added

		roomIDs.forEach((setId) => {
			// all ids for missing datasets are returned as a Record
			// with all the sections associated with the id
			const promise = this.turnDatasetToRoom(setId);
			allPromises.push(promise);
		});

		const records = await Promise.all(allPromises);
		// add all records collected to Map
		records.forEach((record) => {
			roomsDatabase.set(record.id, record.rooms);
		});

		return roomsDatabase;
	}
}
